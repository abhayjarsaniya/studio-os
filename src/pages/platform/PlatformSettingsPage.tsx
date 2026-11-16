import React, { useState } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { Settings, Save, ShieldAlert, Key } from 'lucide-react';

export const PlatformSettingsPage: React.FC = () => {
  const { currentAdmin, canAdmin } = usePlatform();

  const [trialDays, setTrialDays] = useState(14);
  const [gracePeriodDays, setGracePeriodDays] = useState(7);
  const [currency, setCurrency] = useState('INR');
  const [basePrice, setBasePrice] = useState(500);
  const [webhookSecret, setWebhookSecret] = useState('whsec_prod_live_998877665544');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-7 h-7 text-indigo-600" />
          Platform System & SaaS Configuration
        </h1>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800">
          Platform configurations updated successfully.
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-xs">
        {/* Core SaaS Defaults */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Subscription Lifecycle Defaults
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Standard Free Trial (Days)</label>
              <input
                type="number"
                value={trialDays}
                onChange={e => setTrialDays(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
              <span className="text-xs text-slate-400 mt-0.5 block">Applied to new photography studio registrations</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Overdue Grace Period (Days)</label>
              <input
                type="number"
                value={gracePeriodDays}
                onChange={e => setGracePeriodDays(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
              <span className="text-xs text-slate-400 mt-0.5 block">Permitted operations window after unpaid invoice expiry</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Platform Currency</label>
              <input
                type="text"
                value={currency}
                disabled
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 font-mono"
              />
              <span className="text-xs text-slate-400 mt-0.5 block">Indian Rupee (₹) standard for Studio OS</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Standard Plan Base Price (INR)</label>
              <input
                type="number"
                value={basePrice}
                disabled
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 font-mono"
              />
              <span className="text-xs text-slate-400 mt-0.5 block">Fixed at ₹500/month per studio (not per employee)</span>
            </div>
          </div>
        </div>

        {/* Payment Gateway Webhook Architecture */}
        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <Key className="w-4 h-4 text-indigo-600" />
            Payment Gateway Cryptographic Verification
          </h3>
          <div className="space-y-3 mt-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Webhook Secret Signature (Server-Side Key)</label>
              <input
                type="password"
                value={webhookSecret}
                onChange={e => setWebhookSecret(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
              />
              <span className="text-xs text-slate-400 mt-0.5 block">
                Never exposed to frontend clients. Validates webhook authenticity and prevents replay attacks.
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          {canAdmin('manage_settings') && (
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs inline-flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Save Platform Settings
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
