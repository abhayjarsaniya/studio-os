import React, { useState } from 'react';
import { Settings, Save, ShieldCheck, Database, KeyRound, Sparkles } from 'lucide-react';

export const MasterSettingsPage: React.FC = () => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [settings, setSettings] = useState({
    platformName: 'Studio OS Platform Control Center',
    supportEmail: 'masteradmin@studioos.internal',
    defaultCurrency: 'INR (₹)',
    enforceMaskingGlobally: true,
    enableAutomatedSaaSInvoices: true,
    trialPeriodDays: 14,
    backupIntervalHours: 24
  });

  const handleSave = () => {
    showToast('Master platform configurations saved successfully!');
  };

  return (
    <div className="space-y-6 max-w-4xl pb-20">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-500 text-zinc-950 font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-zinc-950" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200">
              Platform Configuration
            </span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 font-display tracking-tight mt-1">
            Master Platform Settings
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Global system parameters, security policies, and default SaaS provisioning rules.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xl space-y-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Platform Identity & Defaults</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-zinc-500 mb-1 font-medium">Platform Title</label>
            <input
              type="text"
              value={settings.platformName}
              onChange={e => setSettings(s => ({ ...s, platformName: e.target.value }))}
              className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-800 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-zinc-500 mb-1 font-medium">Master Support Email</label>
            <input
              type="email"
              value={settings.supportEmail}
              onChange={e => setSettings(s => ({ ...s, supportEmail: e.target.value }))}
              className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-800 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-zinc-500 mb-1 font-medium">Platform Currency</label>
            <input
              type="text"
              disabled
              value={settings.defaultCurrency}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-400"
            />
          </div>

          <div>
            <label className="block text-zinc-500 mb-1 font-medium">Default Free Trial Duration (Days)</label>
            <input
              type="number"
              value={settings.trialPeriodDays}
              onChange={e => setSettings(s => ({ ...s, trialPeriodDays: Number(e.target.value) }))}
              className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-800 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-200 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Security & Privacy Governance</h3>
          <div className="flex items-center justify-between py-2 border-b border-zinc-200">
            <div>
              <div className="text-xs font-bold text-zinc-800">Enforce Client Privacy Masking by Default</div>
              <div className="text-[11px] text-zinc-500">Masks client names (Client #001) and contact details for all non-owner roles</div>
            </div>
            <input
              type="checkbox"
              checked={settings.enforceMaskingGlobally}
              onChange={e => setSettings(s => ({ ...s, enforceMaskingGlobally: e.target.checked }))}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-white border-zinc-200"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-xs font-bold text-zinc-800">Automated SaaS Invoice Issuance</div>
              <div className="text-[11px] text-zinc-500">Automatically creates platform subscription invoices for ₹500/mo on renewal</div>
            </div>
            <input
              type="checkbox"
              checked={settings.enableAutomatedSaaSInvoices}
              onChange={e => setSettings(s => ({ ...s, enableAutomatedSaaSInvoices: e.target.checked }))}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-white border-zinc-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
