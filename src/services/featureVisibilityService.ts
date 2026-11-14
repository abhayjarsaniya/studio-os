import { TenantStore } from './tenantStore';
import { 
  StudioFeatureSettings, 
  StudioFeatureSettingsSchema,
  PlatformStudioFeatureOverride
} from '../types/schema';
import { platformFeatureService } from './platformFeatureService';
import { platformSubscriptionManager } from './platformSubscriptionManager';
import { platformPlanService } from './platformPlanService';
import { platformAuditService } from './platformAuditService';
import { CENTRAL_FEATURE_REGISTRY, getFeatureById, PlatformFeatureDefinition } from './featureRegistry';

export interface FeatureAccessResult {
  accessible: boolean;
  visibleInNav: boolean;
  reason?: string;
  sourceOfRule?: 'platform_global_disable' | 'platform_studio_override' | 'plan_entitlement' | 'studio_owner_hidden' | 'role_permission' | 'dependency_missing' | 'allowed';
}

export type StudioFeatureStatus = 'enabled' | 'disabled' | 'hidden' | 'not_in_plan' | 'dependency_missing';

export class FeatureVisibilityService {
  private readonly STUDIO_SETTINGS_STORE = 'studio_feature_settings';
  private readonly PLATFORM_OVERRIDES_STORE = 'platform_studio_overrides';
  private listeners: Set<() => void> = new Set();

  subscribeFeatureUpdates(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(fn => {
      try { fn(); } catch (e) { console.error(e); }
    });
  }

  // ----------------------------------------------------
  // Studio Owner Settings (Hide/Unhide without data loss)
  // ----------------------------------------------------

  getStudioSettings(studioId: string): StudioFeatureSettings {
    const existing = TenantStore.getSingle<StudioFeatureSettings>(studioId, this.STUDIO_SETTINGS_STORE);
    if (existing) return existing;

    const defaultSettings: StudioFeatureSettings = {
      studioId,
      hiddenModules: [],
      hiddenWidgets: [],
      hiddenEventCategories: [],
      hiddenSubEventTypes: [],
      updatedAt: new Date().toISOString()
    };
    TenantStore.set(studioId, this.STUDIO_SETTINGS_STORE, defaultSettings);
    return defaultSettings;
  }

  saveStudioSettings(studioId: string, settings: Partial<StudioFeatureSettings>): StudioFeatureSettings {
    const current = this.getStudioSettings(studioId);
    const updated = StudioFeatureSettingsSchema.parse({
      ...current,
      ...settings,
      updatedAt: new Date().toISOString()
    });
    TenantStore.set(studioId, this.STUDIO_SETTINGS_STORE, updated);
    this.notifyListeners();
    return updated;
  }

  toggleModuleVisibility(studioId: string, moduleKey: string, isHidden: boolean): StudioFeatureSettings {
    const settings = this.getStudioSettings(studioId);
    const set = new Set(settings.hiddenModules);
    if (isHidden) {
      set.add(moduleKey);
    } else {
      set.delete(moduleKey);
    }
    const res = this.saveStudioSettings(studioId, { hiddenModules: Array.from(set) });
    this.notifyListeners();
    return res;
  }

  hideFeatureForStudio(studioId: string, featureId: string): StudioFeatureSettings {
    return this.toggleModuleVisibility(studioId, featureId, true);
  }

  unhideFeatureForStudio(studioId: string, featureId: string): StudioFeatureSettings {
    return this.toggleModuleVisibility(studioId, featureId, false);
  }

  // ----------------------------------------------------
  // Platform Master Admin Studio-Specific Feature Overrides
  // ----------------------------------------------------

  getStudioPlatformOverride(studioId: string): PlatformStudioFeatureOverride {
    const all = TenantStore.get<PlatformStudioFeatureOverride>('platform_system', this.PLATFORM_OVERRIDES_STORE) || [];
    const found = all.find(o => o.studioId === studioId);
    if (found) return found;

    return {
      studioId,
      featureOverrides: {},
      updatedBy: 'system',
      updatedAt: new Date().toISOString()
    };
  }

  setStudioPlatformOverride(
    studioId: string, 
    featureKey: string, 
    enabled: boolean | null, // null = clear override
    actingAdminName = 'Master Admin'
  ): PlatformStudioFeatureOverride {
    let all = TenantStore.get<PlatformStudioFeatureOverride>('platform_system', this.PLATFORM_OVERRIDES_STORE) || [];
    let current = all.find(o => o.studioId === studioId);

    if (!current) {
      current = {
        studioId,
        featureOverrides: {},
        updatedBy: actingAdminName,
        updatedAt: new Date().toISOString()
      };
      all.push(current);
    }

    if (enabled === null) {
      delete current.featureOverrides[featureKey];
    } else {
      current.featureOverrides[featureKey] = enabled;
    }

    current.updatedBy = actingAdminName;
    current.updatedAt = new Date().toISOString();

    TenantStore.set('platform_system', this.PLATFORM_OVERRIDES_STORE, all);

    platformAuditService.log({
      adminId: 'admin_sys',
      adminName: actingAdminName,
      action: 'SET_STUDIO_FEATURE_OVERRIDE',
      targetType: 'studio_feature_override',
      targetId: `${studioId}:${featureKey}`,
      details: `Studio ${studioId} feature "${featureKey}" override set to ${enabled === null ? 'DEFAULT' : enabled ? 'FORCED_ENABLE' : 'FORCED_DISABLE'}`
    });

    this.notifyListeners();
    return current;
  }

  enableFeatureForStudio(studioId: string, featureKey: string, actingAdminName = 'Master Admin'): PlatformStudioFeatureOverride {
    // Unhide in studio owner settings as well to ensure immediate visibility
    this.unhideFeatureForStudio(studioId, featureKey);
    return this.setStudioPlatformOverride(studioId, featureKey, true, actingAdminName);
  }

  disableFeatureForStudio(studioId: string, featureKey: string, actingAdminName = 'Master Admin'): PlatformStudioFeatureOverride {
    return this.setStudioPlatformOverride(studioId, featureKey, false, actingAdminName);
  }

  restorePlatformDefaults(studioId: string, actingAdminName = 'Master Admin'): void {
    let all = TenantStore.get<PlatformStudioFeatureOverride>('platform_system', this.PLATFORM_OVERRIDES_STORE) || [];
    all = all.filter(o => o.studioId !== studioId);
    TenantStore.set('platform_system', this.PLATFORM_OVERRIDES_STORE, all);

    // Reset studio owner hide settings
    TenantStore.set(studioId, this.STUDIO_SETTINGS_STORE, {
      studioId,
      hiddenModules: [],
      hiddenWidgets: [],
      hiddenEventCategories: [],
      hiddenSubEventTypes: [],
      updatedAt: new Date().toISOString()
    });

    platformAuditService.log({
      adminId: 'admin_sys',
      adminName: actingAdminName,
      action: 'RESTORE_STUDIO_FEATURE_DEFAULTS',
      targetType: 'studio_features',
      targetId: studioId,
      details: `Restored default feature configurations for studio ${studioId}`
    });

    this.notifyListeners();
  }

  // ----------------------------------------------------
  // Feature Dependency Validation
  // ----------------------------------------------------

  validateFeatureDependencies(studioId: string, featureKey: string): { valid: boolean; missingDependencies: string[] } {
    const feat = getFeatureById(featureKey);
    if (!feat || !feat.dependencies || feat.dependencies.length === 0) {
      return { valid: true, missingDependencies: [] };
    }

    const missing: string[] = [];
    for (const depId of feat.dependencies) {
      const depEval = this.evaluateFeature(studioId, depId, true);
      if (!depEval.accessible) {
        const depFeat = getFeatureById(depId);
        missing.push(depFeat?.name || depId);
      }
    }

    return {
      valid: missing.length === 0,
      missingDependencies: missing
    };
  }

  // ----------------------------------------------------
  // Comprehensive Feature Status Inspector
  // ----------------------------------------------------

  getStudioFeatureStatus(studioId: string, featureKey: string): {
    status: StudioFeatureStatus;
    reason?: string;
    missingDependencies: string[];
    isOverridden: boolean;
    isHidden: boolean;
  } {
    const depCheck = this.validateFeatureDependencies(studioId, featureKey);
    const platformOverride = this.getStudioPlatformOverride(studioId);
    const hasOverride = platformOverride.featureOverrides[featureKey] !== undefined;
    const studioSettings = this.getStudioSettings(studioId);
    const isHidden = studioSettings.hiddenModules.includes(featureKey);

    const evalResult = this.evaluateFeature(studioId, featureKey, true);

    if (evalResult.sourceOfRule === 'platform_global_disable' || evalResult.sourceOfRule === 'platform_studio_override') {
      return {
        status: 'disabled',
        reason: evalResult.reason,
        missingDependencies: depCheck.missingDependencies,
        isOverridden: hasOverride,
        isHidden
      };
    }

    if (evalResult.sourceOfRule === 'plan_entitlement') {
      return {
        status: 'not_in_plan',
        reason: evalResult.reason,
        missingDependencies: depCheck.missingDependencies,
        isOverridden: hasOverride,
        isHidden
      };
    }

    if (!depCheck.valid) {
      return {
        status: 'dependency_missing',
        reason: `Requires dependencies: ${depCheck.missingDependencies.join(', ')}`,
        missingDependencies: depCheck.missingDependencies,
        isOverridden: hasOverride,
        isHidden
      };
    }

    if (isHidden) {
      return {
        status: 'hidden',
        reason: 'Feature is active but hidden in navigation by Studio preference.',
        missingDependencies: [],
        isOverridden: hasOverride,
        isHidden: true
      };
    }

    return {
      status: 'enabled',
      missingDependencies: [],
      isOverridden: hasOverride,
      isHidden: false
    };
  }

  // ----------------------------------------------------
  // 5-Tier Precedence Evaluation Engine
  // ----------------------------------------------------

  evaluateFeature(studioId: string, featureKey: string, isOwner = false): FeatureAccessResult {
    // 1. Global Platform Killswitch
    const features = platformFeatureService.listFeatures();
    const globalFeature = features.find(f => f.key === featureKey);
    if (globalFeature && !globalFeature.isGlobalEnabled) {
      return {
        accessible: false,
        visibleInNav: false,
        reason: `Feature "${globalFeature.name}" is globally disabled across the platform for maintenance.`,
        sourceOfRule: 'platform_global_disable'
      };
    }

    // 2. Studio-Specific Platform Override
    const platformOverride = this.getStudioPlatformOverride(studioId);
    if (platformOverride.featureOverrides[featureKey] !== undefined) {
      const forced = platformOverride.featureOverrides[featureKey];
      if (!forced) {
        return {
          accessible: false,
          visibleInNav: false,
          reason: `Feature "${featureKey}" has been administratively disabled for this studio by Platform Master Admin.`,
          sourceOfRule: 'platform_studio_override'
        };
      }
      // If forced enabled, skip plan check and jump straight to studio owner settings
    } else {
      // 3. Plan Entitlement
      const isDemoStudio = studioId.startsWith('studio_royal') || studioId.startsWith('studio_moments') || 
                           studioId.startsWith('studio_pixelcraft') || studioId.startsWith('studio_shutter') || 
                           studioId.startsWith('studio_golden') || studioId === 'studio_creative_002' ||
                           studioId === 'std_demo_royal';
      
      if (!isDemoStudio) {
        const sub = platformSubscriptionManager.getSubscription(studioId);
        if (sub) {
          const plan = platformPlanService.getPlan(sub.planId);
          if (plan && !plan.features.includes(featureKey)) {
            return {
              accessible: false,
              visibleInNav: false,
              reason: `Feature "${featureKey}" is not included in current subscription plan (${plan.name}).`,
              sourceOfRule: 'plan_entitlement'
            };
          }
        }
      }
    }

    // 4. Studio Owner Visibility Setting (Hide/Unhide)
    const studioSettings = this.getStudioSettings(studioId);
    if (studioSettings.hiddenModules.includes(featureKey)) {
      return {
        accessible: isOwner,
        visibleInNav: false,
        reason: `Module "${featureKey}" is hidden by the Studio Owner.`,
        sourceOfRule: 'studio_owner_hidden'
      };
    }

    return {
      accessible: true,
      visibleInNav: true,
      sourceOfRule: 'allowed'
    };
  }
}

export const featureVisibilityService = new FeatureVisibilityService();
