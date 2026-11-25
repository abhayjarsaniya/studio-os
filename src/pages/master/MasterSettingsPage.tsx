import React, { useState, useEffect } from 'react';
import { TenantStore } from '../../services/tenantStore';
import { platformAuditService } from '../../services/platformAuditService';
import { useMasterAdmin } from '../../context/MasterAdminContext';
import { RazorpayGatewaySettings } from '../../components/master/RazorpayGatewaySettings';
import { 
  Settings, 
  Save, 
  ShieldCheck, 
  Database, 
  KeyRound, 
  Sparkles,
  History,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Lock,
  Server,
  ExternalLink,
  CreditCard
} from 'lucide-react';

interface PlatformSettingsState {
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  defaultCurrency: string;
  enforceMaskingGlobally: boolean;
  enableAutomatedSaaSInvoices: boolean;
  trialPeriodDays: number;
  backupIntervalHours: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  sessionTimeoutMinutes: number;
  maxUploadSizeMb: number;
  enforceMFAForAdmins: boolean;
}

const DEFAULT_SETTINGS: PlatformSettingsState = {
  platformName: 'Studio OS Enterprise Platform',
  supportEmail: 'jarsaniya.abhay@gmail.com',
  supportPhone: '+91 99000 11000',
  defaultCurrency: 'INR (₹)',
  enforceMaskingGlobally: true,
  enableAutomatedSaaSInvoices: true,
  trialPeriodDays: 14,
  backupIntervalHours: 24,
  maintenanceMode: false,
  maintenanceMessage: 'System undergoing routine optimization. Service will resume shortly.',
  sessionTimeoutMinutes: 120,
  maxUploadSizeMb: 50,
  enforceMFAForAdmins: false
};

const SETTINGS_KEY = 'platform_settings';

export const MasterSettingsPage: React.FC = () => {
  const { setMasterRoute } = useMasterAdmin();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [settings, setSettings] = useState<PlatformSettingsState>(() => {
    const saved = TenantStore.getSingle<PlatformSettingsState>('platform_system', SETTINGS_KEY);
    return saved ? { ...DEFAULT_SETTINGS, ...saved } : DEFAULT_SETTINGS;
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSave = () => {
    TenantStore.set('platform_system', SETTINGS_KEY, settings);
    platformAuditService.logAction(
      'Abhay Jarsaniya (Master Admin)',
      'UPDATE_PLATFORM_SETTINGS',
      'system_config',
      'global_settings',
      `Updated platform configuration: maintenance=${settings.maintenanceMode}, timeout=${settings.sessionTimeoutMinutes}m, trial=${settings.trialPeriodDays}d`
    );
    showToast('Platform settings saved and applied globally.');
  };

  const handleReset = () => {
    if (confirm('Reset platform configurations to default settings?')) {
      setSettings(DEFAULT_SETTINGS);
      TenantStore.set('platform_system', SETTINGS_KEY, DEFAULT_SETTINGS);
      platformAuditService.logAction(
        'Abhay Jarsaniya (Master Admin)',
        'RESET_PLATFORM_SETTINGS',
        'system_config',
        'global_settings',
        'Reset platform settings to default baseline'
      );
      showToast('Settings reset to default baseline.');
    }
  };

  const [settingsTab, setSettingsTab] = useState<'platform' | 'payment_gateway'>(() =>
    typeof window !== 'undefined' && window.location.hash.includes('payment-gateway')
      ? 'payment_gateway'
      : 'platform'
  );

  return (
    <div className="w-full space-y-6 pb-20 font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-orange-500/30 text-xs">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-50 text-orange-800 border border-orange-200">
              System Governance
            </span>
            <span className="text-xs text-zinc-500 font-medium">Global Master Configuration</span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 font-display tracking-tight mt-1">
            Settings & Audit Logs
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Configure system parameters, security policies, billing defaults, and inspect immutable audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setMasterRoute('audit-logs')}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 text-xs font-bold flex items-center gap-2 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <History className="w-4 h-4 text-orange-600" />
            <span>View Immutable Audit Logs</span>
          </button>
          <button
            onClick={handleReset}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 text-zinc-600 border border-zinc-200 text-xs font-bold flex items-center gap-2 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleSave}
            className="min-h-[42px] px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </div>

      {/* Subtabs: Platform Configuration vs Payment Gateway */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-3">
        <button
          type="button"
          onClick={() => setSettingsTab('platform')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
            settingsTab === 'platform'
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Platform Configuration</span>
        </button>
        <button
          type="button"
          onClick={() => setSettingsTab('payment_gateway')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
            settingsTab === 'payment_gateway'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Payment Gateway (Razorpay)</span>
        </button>
      </div>

      {settingsTab === 'payment_gateway' ? (
        <RazorpayGatewaySettings />
      ) : (
      <>
      {/* Maintenance Mode Alert Banner if active */}
      {settings.maintenanceMode && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold block">Platform Maintenance Mode Active:</span>
            <span>Studio Owners and Employees currently see: &ldquo;{settings.maintenanceMessage}&rdquo;</span>
          </div>
        </div>
      )}

      {/* Main Settings Card */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-2xs space-y-6">
        {/* Section 1: Identity & Communication */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
            Platform Identity & Communication
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-zinc-700 font-bold mb-1">Platform Brand Title</label>
              <input
                type="text"
                value={settings.platformName}
                onChange={e => setSettings(s => ({ ...s, platformName: e.target.value }))}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-800 focus:outline-none focus:bg-white focus:border-zinc-900 font-medium"
              />
            </div>
            <div>
              <label className="block text-zinc-700 font-bold mb-1">Primary Support Email</label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={e => setSettings(s => ({ ...s, supportEmail: e.target.value }))}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-800 focus:outline-none focus:bg-white focus:border-zinc-900 font-medium"
              />
            </div>
            <div>
              <label className="block text-zinc-700 font-bold mb-1">Support Helpline Phone</label>
              <input
                type="text"
                value={settings.supportPhone}
                onChange={e => setSettings(s => ({ ...s, supportPhone: e.target.value }))}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-800 focus:outline-none focus:bg-white focus:border-zinc-900 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Billing & Subscriptions */}
        <div className="pt-4 border-t border-zinc-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
            Subscription & Financial Defaults
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-zinc-700 font-bold mb-1">Platform Currency</label>
              <input
                type="text"
                disabled
                value={settings.defaultCurrency}
                className="w-full bg-zinc-100 border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-zinc-700 font-bold mb-1">Free Trial Duration (Days)</label>
              <input
                type="number"
                value={settings.trialPeriodDays}
                onChange={e => setSettings(s => ({ ...s, trialPeriodDays: Number(e.target.value) }))}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-800 focus:outline-none focus:bg-white focus:border-zinc-900 font-bold"
              />
            </div>
            <div>
              <label className="block text-zinc-700 font-bold mb-1">Database Backup Frequency (Hours)</label>
              <input
                type="number"
                value={settings.backupIntervalHours}
                onChange={e => setSettings(s => ({ ...s, backupIntervalHours: Number(e.target.value) }))}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-800 focus:outline-none focus:bg-white focus:border-zinc-900 font-bold"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Platform Governance Toggles */}
        <div className="pt-4 border-t border-zinc-100 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
            Security & Operational Controls
          </h3>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
            <div>
              <div className="text-xs font-bold text-zinc-900">Platform Maintenance Mode</div>
              <div className="text-xs text-zinc-500">Temporarily suspends studio writes while displaying custom banner</div>
            </div>
            <input
              type="checkbox"
              checked={settings.maintenanceMode}
              onChange={e => setSettings(s => ({ ...s, maintenanceMode: e.target.checked }))}
              className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 bg-white border-zinc-300 cursor-pointer"
            />
          </div>

          {settings.maintenanceMode && (
            <div className="pl-4">
              <label className="block text-zinc-700 font-bold text-xs mb-1">Maintenance Banner Text</label>
              <input
                type="text"
                value={settings.maintenanceMessage}
                onChange={e => setSettings(s => ({ ...s, maintenanceMessage: e.target.value }))}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:bg-white"
              />
            </div>
          )}

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
            <div>
              <div className="text-xs font-bold text-zinc-900">Enforce Client Privacy Masking by Default</div>
              <div className="text-xs text-zinc-500">Masks customer phone numbers and names for team members without owner privilege</div>
            </div>
            <input
              type="checkbox"
              checked={settings.enforceMaskingGlobally}
              onChange={e => setSettings(s => ({ ...s, enforceMaskingGlobally: e.target.checked }))}
              className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 bg-white border-zinc-300 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
            <div>
              <div className="text-xs font-bold text-zinc-900">Automated SaaS Invoice Issuance</div>
              <div className="text-xs text-zinc-500">Automatically generates ₹500/mo platform subscription invoices upon renewal</div>
            </div>
            <input
              type="checkbox"
              checked={settings.enableAutomatedSaaSInvoices}
              onChange={e => setSettings(s => ({ ...s, enableAutomatedSaaSInvoices: e.target.checked }))}
              className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 bg-white border-zinc-300 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
            <div>
              <div className="text-xs font-bold text-zinc-900">Session Security Timeout</div>
              <div className="text-xs text-zinc-500">Inactivity limit before requiring re-authentication: {settings.sessionTimeoutMinutes} minutes</div>
            </div>
            <input
              type="number"
              value={settings.sessionTimeoutMinutes}
              onChange={e => setSettings(s => ({ ...s, sessionTimeoutMinutes: Number(e.target.value) }))}
              className="w-24 bg-white border border-zinc-300 rounded-xl px-2.5 py-1 text-xs font-bold text-zinc-800 text-center"
            />
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
