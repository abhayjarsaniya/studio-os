import { auth, db } from '../lib/firebase';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  deleteDoc,
  Unsubscribe
} from 'firebase/firestore';
import { CENTRAL_FEATURE_REGISTRY, PlatformFeatureDefinition } from './featureRegistry';

export interface GlobalFeatureRecord {
  featureId: string;
  key: string;
  name: string;
  category: string;
  isGlobalEnabled: boolean;
  minPlan: string;
  dependencies: string[];
  updatedAt: string;
  updatedBy?: string;
}

export interface StudioFeatureOverrideRecord {
  featureId: string;
  enabled: boolean;
  updatedAt: string;
  updatedBy?: string;
}

export interface FeatureAuditLogEntry {
  id: string;
  actingAdmin: string;
  studioId: string;
  featureId: string;
  featureName: string;
  previousStatus: string;
  newStatus: string;
  reason?: string;
  timestamp: string;
}

/**
 * Pure effective feature resolution:
 * 1. If Global Switch is OFF -> ALWAYS false (overrides studio settings).
 * 2. If a required dependency is effectively OFF -> false.
 * 3. If Studio Override exists -> use studio override boolean.
 * 4. Otherwise -> feature.defaultEnabled (true).
 */
export function resolveEffectiveFeatureMap(params: {
  globalSettings: Record<string, boolean>;
  studioOverrides: Record<string, boolean | undefined>;
}): Record<string, { enabled: boolean; reason: 'global_off' | 'dependency_off' | 'studio_off' | 'studio_on' | 'default_on' }> {
  const { globalSettings, studioOverrides } = params;
  const rawEnabled: Record<string, boolean> = {};
  const reasonMap: Record<string, 'global_off' | 'dependency_off' | 'studio_off' | 'studio_on' | 'default_on'> = {};

  for (const feat of CENTRAL_FEATURE_REGISTRY) {
    const isGloballyOn = globalSettings[feat.id] !== undefined ? globalSettings[feat.id] : feat.defaultEnabled;
    if (!isGloballyOn) {
      rawEnabled[feat.id] = false;
      reasonMap[feat.id] = 'global_off';
      continue;
    }

    const studioOvr = studioOverrides[feat.id];
    if (studioOvr !== undefined) {
      rawEnabled[feat.id] = studioOvr;
      reasonMap[feat.id] = studioOvr ? 'studio_on' : 'studio_off';
    } else {
      rawEnabled[feat.id] = feat.defaultEnabled;
      reasonMap[feat.id] = 'default_on';
    }
  }

  // Enforce dependency chain (if any required dependency is OFF, dependent feature is OFF)
  const resolved: Record<string, { enabled: boolean; reason: 'global_off' | 'dependency_off' | 'studio_off' | 'studio_on' | 'default_on' }> = {};
  const checkWithDeps = (feat: PlatformFeatureDefinition, visited = new Set<string>()): boolean => {
    if (resolved[feat.id]) return resolved[feat.id].enabled;
    if (visited.has(feat.id)) return rawEnabled[feat.id] ?? false;
    visited.add(feat.id);

    if (!rawEnabled[feat.id]) {
      resolved[feat.id] = { enabled: false, reason: reasonMap[feat.id] };
      return false;
    }

    for (const depId of feat.dependencies) {
      const depFeat = CENTRAL_FEATURE_REGISTRY.find((f) => f.id === depId);
      if (depFeat && !checkWithDeps(depFeat, visited)) {
        resolved[feat.id] = { enabled: false, reason: 'dependency_off' };
        return false;
      }
    }

    resolved[feat.id] = { enabled: true, reason: reasonMap[feat.id] };
    return true;
  };

  CENTRAL_FEATURE_REGISTRY.forEach((f) => checkWithDeps(f));
  return resolved;
}

export function getDependentFeatures(featureId: string): PlatformFeatureDefinition[] {
  return CENTRAL_FEATURE_REGISTRY.filter((f) => f.dependencies.includes(featureId));
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const user = auth?.currentUser;
  if (user) {
    const token = await user.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

class LiveFeatureService {
  private activeStudioId: string | null = null;
  private globalSettingsCache: Record<string, boolean> = {};
  private studioOverridesCache: Record<string, boolean> = {};
  private effectiveCache: Record<string, boolean> = {};
  private hasLiveSync = false;
  private listeners = new Set<() => void>();

  subscribeUpdates(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error(e);
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('studio_data_updated'));
    }
  }

  setCachedState(
    studioId: string | null,
    globalSettings: Record<string, boolean>,
    studioOverrides: Record<string, boolean>
  ) {
    this.activeStudioId = studioId;
    this.globalSettingsCache = { ...globalSettings };
    this.studioOverridesCache = { ...studioOverrides };
    const resolved = resolveEffectiveFeatureMap({ globalSettings, studioOverrides });
    const nextEff: Record<string, boolean> = {};
    Object.entries(resolved).forEach(([k, v]) => {
      nextEff[k] = v.enabled;
    });
    this.effectiveCache = nextEff;
    this.hasLiveSync = true;
    this.notify();
  }

  clearCachedState() {
    this.activeStudioId = null;
    this.globalSettingsCache = {};
    this.studioOverridesCache = {};
    this.effectiveCache = {};
    this.hasLiveSync = false;
  }

  /**
   * Returns live feature status if synced from Firebase, or null if not synced yet.
   * Accepts either feature.id (e.g. 'whatsapp_chat', 'finance_billing') or feature.key (e.g. 'finance').
   */
  isFeatureEnabledLive(studioId: string, featureIdOrKey: string): boolean | null {
    if (!this.hasLiveSync || this.activeStudioId !== studioId) return null;
    const def = CENTRAL_FEATURE_REGISTRY.find((f) => f.id === featureIdOrKey || f.key === featureIdOrKey);
    const id = def ? def.id : featureIdOrKey;
    if (this.effectiveCache[id] !== undefined) {
      return this.effectiveCache[id];
    }
    return null;
  }

  /**
   * Real-time Firestore listener for a logged-in Studio Owner / Employee.
   */
  subscribeStudioFeatures(studioId: string, onChange?: () => void): Unsubscribe {
    if (!db || !studioId) {
      return () => {};
    }

    let globalMap: Record<string, boolean> = {};
    let studioMap: Record<string, boolean> = {};

    const emit = () => {
      this.setCachedState(studioId, globalMap, studioMap);
      onChange?.();
    };

    const unsubGlobal = onSnapshot(
      collection(db, 'platformFeatureSettings'),
      (snap) => {
        const next: Record<string, boolean> = {};
        snap.docs.forEach((d) => {
          const data = d.data() || {};
          if (typeof data.isGlobalEnabled === 'boolean') {
            next[d.id] = data.isGlobalEnabled;
          }
        });
        globalMap = next;
        emit();
      },
      (err) => console.warn('[LiveFeatureService] global snapshot notice:', err.message)
    );

    const unsubStudio = onSnapshot(
      collection(db, 'studios', studioId, 'featureSettings'),
      (snap) => {
        const next: Record<string, boolean> = {};
        snap.docs.forEach((d) => {
          const data = d.data() || {};
          if (typeof data.enabled === 'boolean') {
            next[d.id] = data.enabled;
          }
        });
        studioMap = next;
        emit();
      },
      (err) => console.warn('[LiveFeatureService] studio snapshot notice:', err.message)
    );

    return () => {
      unsubGlobal();
      unsubStudio();
    };
  }

  // ==========================================================
  // MASTER ADMIN LOAD & SAVE METHODS
  // ==========================================================

  async fetchFeatureState(studioId?: string): Promise<{
    globalSettings: Record<string, boolean>;
    studioOverrides: Record<string, boolean>;
    auditLogs: FeatureAuditLogEntry[];
  }> {
    const globalSettings: Record<string, boolean> = {};
    const studioOverrides: Record<string, boolean> = {};
    let auditLogs: FeatureAuditLogEntry[] = [];

    CENTRAL_FEATURE_REGISTRY.forEach((f) => {
      globalSettings[f.id] = f.defaultEnabled;
    });

    if (db) {
      const [gSnap, sSnap, logsSnap] = await Promise.all([
        getDocs(collection(db, 'platformFeatureSettings')).catch(() => null),
        studioId ? getDocs(collection(db, 'studios', studioId, 'featureSettings')).catch(() => null) : Promise.resolve(null),
        getDocs(collection(db, 'platformAuditLogs')).catch(() => null)
      ]);

      gSnap?.docs.forEach((d) => {
        const data = d.data() || {};
        if (typeof data.isGlobalEnabled === 'boolean') {
          globalSettings[d.id] = data.isGlobalEnabled;
        }
      });

      sSnap?.docs.forEach((d) => {
        const data = d.data() || {};
        if (typeof data.enabled === 'boolean') {
          studioOverrides[d.id] = data.enabled;
        }
      });

      if (logsSnap) {
        auditLogs = logsSnap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<FeatureAuditLogEntry, 'id'>) }))
          .filter((l) => Boolean(l.featureId) && (!studioId || l.studioId === studioId || l.studioId === 'global'))
          .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
          .slice(0, 50);
      }
    }

    return { globalSettings, studioOverrides, auditLogs };
  }

  async saveGlobalFeatures(params: {
    updates: Array<{ featureId: string; isGlobalEnabled: boolean }>;
    actingAdmin: string;
    reason?: string;
    previousMap: Record<string, boolean>;
  }): Promise<void> {
    const { updates, actingAdmin, reason, previousMap } = params;
    const now = new Date().toISOString();

    // Try server API first
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch('/api/features/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'save_global', updates, reason, previousMap })
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.success) return;
      }
    } catch {
      // Fallback to direct authenticated Master Admin Firestore write
    }

    if (!db) throw new Error('Firestore is not initialized.');

    for (const u of updates) {
      const def = CENTRAL_FEATURE_REGISTRY.find((f) => f.id === u.featureId);
      await setDoc(
        doc(db, 'platformFeatureSettings', u.featureId),
        {
          featureId: u.featureId,
          key: def?.key || u.featureId,
          name: def?.name || u.featureId,
          category: def?.category || 'Operations',
          isGlobalEnabled: u.isGlobalEnabled,
          updatedAt: now,
          updatedBy: actingAdmin
        },
        { merge: true }
      );

      const logId = `feat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await setDoc(doc(db, 'platformAuditLogs', logId), {
        actingAdmin,
        studioId: 'global',
        featureId: u.featureId,
        featureName: def?.name || u.featureId,
        previousStatus: previousMap[u.featureId] ? 'ON' : 'OFF',
        newStatus: u.isGlobalEnabled ? 'ON' : 'OFF',
        reason: reason || 'Global feature catalog update',
        timestamp: now
      }).catch(() => {});
    }
  }

  async saveStudioFeatures(params: {
    studioId: string;
    updates: Array<{ featureId: string; enabled: boolean }>;
    actingAdmin: string;
    reason?: string;
    previousMap: Record<string, boolean | undefined>;
  }): Promise<void> {
    const { studioId, updates, actingAdmin, reason, previousMap } = params;
    const now = new Date().toISOString();

    try {
      const headers = await getAuthHeaders();
      const resp = await fetch('/api/features/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'save_studio', studioId, updates, reason, previousMap })
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.success) return;
      }
    } catch {
      // Fallback to Firestore
    }

    if (!db) throw new Error('Firestore is not initialized.');

    for (const u of updates) {
      const def = CENTRAL_FEATURE_REGISTRY.find((f) => f.id === u.featureId);
      await setDoc(
        doc(db, 'studios', studioId, 'featureSettings', u.featureId),
        {
          featureId: u.featureId,
          enabled: u.enabled,
          updatedAt: now,
          updatedBy: actingAdmin
        },
        { merge: true }
      );

      const logId = `feat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await setDoc(doc(db, 'platformAuditLogs', logId), {
        actingAdmin,
        studioId,
        featureId: u.featureId,
        featureName: def?.name || u.featureId,
        previousStatus: previousMap[u.featureId] === false ? 'OFF' : 'ON',
        newStatus: u.enabled ? 'ON' : 'OFF',
        reason: reason || 'Studio feature configuration update',
        timestamp: now
      }).catch(() => {});
    }
  }

  async resetStudioToGlobalDefaults(studioId: string, actingAdmin: string): Promise<void> {
    const now = new Date().toISOString();
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch('/api/features/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'reset_studio', studioId })
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.success) return;
      }
    } catch {
      // Fallback
    }

    if (!db) throw new Error('Firestore is not initialized.');
    const snap = await getDocs(collection(db, 'studios', studioId, 'featureSettings'));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));

    const logId = `feat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await setDoc(doc(db, 'platformAuditLogs', logId), {
      actingAdmin,
      studioId,
      featureId: 'all',
      featureName: 'All Features',
      previousStatus: 'custom_overrides',
      newStatus: 'global_defaults',
      reason: 'Reset studio overrides to global defaults',
      timestamp: now
    }).catch(() => {});
  }
}

export const liveFeatureService = new LiveFeatureService();
