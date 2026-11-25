import React, { useState, useEffect, useCallback } from 'react';
import {
  razorpayBillingService,
  GatewayPublicConfig,
  RazorpayEnvironment
} from '../../services/razorpayBillingService';
import {
  CreditCard,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Zap,
  Power,
  Activity,
  Lock,
  ExternalLink
} from 'lucide-react';

export const RazorpayGatewaySettings: React.FC = () => {
  const [config, setConfig] = useState<GatewayPublicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [envTab, setEnvTab] = useState<RazorpayEnvironment>('test');
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const [form, setForm] = useState({
    keyId: '',
    keySecret: '',
    webhookSecret: '',
    enabled: true,
    defaultPaymentMode: 'upi_autopay' as 'upi_autopay' | 'one_time',
    upiAutopayEnabled: true,
    oneTimeEnabled: true,
    autoRetryEnabled: true,
    maxAutopayRetries: 3,
    gracePeriodDays: 7
  });

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/razorpay/webhook`
      : 'https://studio-os-lemon-nine.vercel.app/api/razorpay/webhook';

  const loadConfig = useCallback(async (preferredEnv?: RazorpayEnvironment) => {
    setLoading(true);
    try {
      const res = await razorpayBillingService.fetchGatewayConfig();
      setConfig(res);
      const targetEnv = preferredEnv || res.environment || 'test';
      setEnvTab(targetEnv);
      const envMeta = targetEnv === 'live' ? res.admin?.live : res.admin?.test;
      setForm({
        keyId: envMeta?.keyId || '',
        keySecret: envMeta?.hasKeySecret ? envMeta.keySecretMasked || '••••••••••••' : '',
        webhookSecret: envMeta?.hasWebhookSecret ? envMeta.webhookSecretMasked || '••••••••••••' : '',
        enabled: res.enabled,
        defaultPaymentMode: res.defaultPaymentMode || 'upi_autopay',
        upiAutopayEnabled: res.upiAutopayEnabled !== false,
        oneTimeEnabled: res.oneTimeEnabled !== false,
        autoRetryEnabled: res.autoRetryEnabled !== false,
        maxAutopayRetries: Number(res.maxAutopayRetries ?? 3),
        gracePeriodDays: Number(res.gracePeriodDays ?? 7)
      });
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Unable to load Razorpay gateway settings.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleEnvSwitch = (nextEnv: RazorpayEnvironment) => {
    setEnvTab(nextEnv);
    const envMeta = nextEnv === 'live' ? config?.admin?.live : config?.admin?.test;
    setForm((prev) => ({
      ...prev,
      keyId: envMeta?.keyId || '',
      keySecret: envMeta?.hasKeySecret ? envMeta.keySecretMasked || '••••••••••••' : '',
      webhookSecret: envMeta?.hasWebhookSecret ? envMeta.webhookSecretMasked || '••••••••••••' : ''
    }));
  };

  const handleSave = async () => {
    setBanner(null);
    setSaving(true);
    try {
      const res = await razorpayBillingService.saveGatewayCredentials({
        environment: envTab,
        activateEnvironment: config?.environment || envTab,
        keyId: form.keyId.trim(),
        keySecret: form.keySecret.trim(),
        webhookSecret: form.webhookSecret.trim(),
        enabled: form.enabled,
        defaultPaymentMode: form.defaultPaymentMode,
        upiAutopayEnabled: form.upiAutopayEnabled,
        oneTimeEnabled: form.oneTimeEnabled,
        autoRetryEnabled: form.autoRetryEnabled,
        maxAutopayRetries: form.maxAutopayRetries,
        gracePeriodDays: form.gracePeriodDays
      });
      setBanner({ type: 'success', text: res.message || 'Razorpay settings saved securely.' });
      await loadConfig(envTab);
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Failed to save Razorpay configuration.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setBanner(null);
    setTesting(true);
    try {
      const res = await razorpayBillingService.testGatewayConnection({
        environment: envTab,
        keyId: form.keyId.trim(),
        keySecret: form.keySecret.trim()
      });
      setBanner({ type: 'success', text: res.message || 'Razorpay API connection verified.' });
      await loadConfig(envTab);
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Razorpay connection test failed.' });
    } finally {
      setTesting(false);
    }
  };

  const handleActivateLive = async () => {
    setBanner(null);
    setTesting(true);
    try {
      const res = await razorpayBillingService.activateLiveGateway();
      setBanner({ type: 'success', text: res.message || 'Live Mode activated!' });
      await loadConfig('live');
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Unable to activate Live Mode.' });
    } finally {
      setTesting(false);
    }
  };

  const handleDisableGateway = async () => {
    setBanner(null);
    setSaving(true);
    try {
      const res = await razorpayBillingService.disableGateway();
      setBanner({ type: 'success', text: res.message || 'Payment Gateway disabled.' });
      await loadConfig(envTab);
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Unable to disable Payment Gateway.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyWebhook = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
  };

  return (
    <div className="space-y-5">
      {banner && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
            banner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {banner.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{banner.text}</span>
        </div>
      )}

      {/* Telemetry & Health Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-zinc-200 rounded-2xl p-4">
          <div className="text-xs font-bold uppercase text-zinc-400">Gateway Status</div>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                config?.enabled
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
              }`}
            >
              <Power className="w-3 h-3" />
              {config?.enabled ? 'Enabled' : 'Disabled'}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                config?.environment === 'live'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              {config?.environment === 'live' ? 'LIVE MODE' : 'TEST MODE'}
            </span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-4">
          <div className="text-xs font-bold uppercase text-zinc-400">Last Connection Test</div>
          <div className="mt-1 text-xs font-bold text-zinc-900 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-orange-500" />
            <span>
              {config?.admin?.lastConnectionStatus === 'connected'
                ? 'Verified Connected'
                : config?.admin?.lastConnectionStatus === 'failed'
                  ? 'Failed'
                  : 'Not Tested Yet'}
            </span>
          </div>
          {config?.admin?.lastConnectionTestAt && (
            <div className="text-xs text-zinc-400 mt-0.5 font-mono">
              {new Date(config.admin.lastConnectionTestAt).toLocaleString('en-IN')}
            </div>
          )}
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-4">
          <div className="text-xs font-bold uppercase text-zinc-400">Last Webhook Received</div>
          <div className="mt-1 text-xs font-bold text-zinc-900 truncate">
            {config?.admin?.lastWebhookEvent || 'None received yet'}
          </div>
          {config?.admin?.lastWebhookReceivedAt && (
            <div className="text-xs text-zinc-400 mt-0.5 font-mono">
              {new Date(config.admin.lastWebhookReceivedAt).toLocaleString('en-IN')}
            </div>
          )}
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-4">
          <div className="text-xs font-bold uppercase text-zinc-400">Server Security Vault</div>
          <div className="mt-1 text-xs font-bold text-zinc-900 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {config?.admin?.firebaseAdminReady
                ? 'Encrypted Firestore + Env'
                : 'Vercel Env Mode Ready'}
            </span>
          </div>
          <div className="text-xs text-zinc-400 mt-0.5">Secrets never sent to client</div>
        </div>
      </div>

      {/* Main Razorpay Configuration Card */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-zinc-900 font-display">
                Razorpay Subscriptions & UPI AutoPay Gateway
              </h2>
              <p className="text-xs text-zinc-500">
                Server-verified Razorpay integration. Secrets are masked on read and encrypted at rest.
              </p>
            </div>
          </div>

          {/* Environment Tabs */}
          <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => handleEnvSwitch('test')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                envTab === 'test'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Test Credentials (rzp_test_)
            </button>
            <button
              type="button"
              onClick={() => handleEnvSwitch('live')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                envTab === 'live'
                  ? 'bg-amber-500 text-zinc-950 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Live Credentials (rzp_live_)
            </button>
          </div>
        </div>

        {/* Webhook URL Helper */}
        <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-bold text-zinc-900">Razorpay Webhook Endpoint URL</div>
            <div className="text-xs font-mono text-zinc-600 truncate mt-0.5">{webhookUrl}</div>
            <div className="text-xs text-zinc-400 mt-0.5">
              Subscribe to: subscription.authenticated, subscription.activated, subscription.charged, subscription.pending, subscription.halted, subscription.cancelled, payment.captured, payment.failed, refund.created
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyWebhook}
            className="shrink-0 px-3 py-2 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-300 text-xs font-bold text-zinc-800 flex items-center gap-1.5 cursor-pointer"
          >
            {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedWebhook ? 'Copied' : 'Copy Webhook URL'}</span>
          </button>
        </div>

        {/* Credential Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-bold text-zinc-700 mb-1">
              Razorpay {envTab === 'live' ? 'Live' : 'Test'} Key ID *
            </label>
            <input
              type="text"
              value={form.keyId}
              onChange={(e) => setForm((f) => ({ ...f, keyId: e.target.value }))}
              placeholder={envTab === 'live' ? 'rzp_live_xxxxxxxxxxxxxx' : 'rzp_test_xxxxxxxxxxxxxx'}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 font-mono text-zinc-800 focus:bg-white focus:outline-none focus:border-zinc-900"
            />
          </div>

          <div>
            <label className="block font-bold text-zinc-700 mb-1">
              Razorpay {envTab === 'live' ? 'Live' : 'Test'} Key Secret
            </label>
            <input
              type="password"
              value={form.keySecret}
              onChange={(e) => setForm((f) => ({ ...f, keySecret: e.target.value }))}
              placeholder="Enter key secret to set or rotate"
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 font-mono text-zinc-800 focus:bg-white focus:outline-none focus:border-zinc-900"
            />
          </div>

          <div>
            <label className="block font-bold text-zinc-700 mb-1">
              Razorpay {envTab === 'live' ? 'Live' : 'Test'} Webhook Secret
            </label>
            <input
              type="password"
              value={form.webhookSecret}
              onChange={(e) => setForm((f) => ({ ...f, webhookSecret: e.target.value }))}
              placeholder="Enter webhook secret to verify signatures"
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 font-mono text-zinc-800 focus:bg-white focus:outline-none focus:border-zinc-900"
            />
          </div>
        </div>

        {/* Subscription & AutoPay Policies */}
        <div className="pt-4 border-t border-zinc-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-bold text-zinc-700 mb-1">Platform Currency</label>
            <input
              type="text"
              disabled
              value="INR (₹ Indian Rupee)"
              className="w-full bg-zinc-100 border border-zinc-200 rounded-xl px-3 py-2.5 font-bold text-zinc-500"
            />
          </div>

          <div>
            <label className="block font-bold text-zinc-700 mb-1">Default Payment Mode</label>
            <select
              value={form.defaultPaymentMode}
              onChange={(e) => setForm((f) => ({ ...f, defaultPaymentMode: e.target.value as any }))}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 font-bold text-zinc-800 focus:bg-white focus:outline-none"
            >
              <option value="upi_autopay">UPI AutoPay (Recommended)</option>
              <option value="one_time">One-Time Online Payment</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-zinc-700 mb-1">Max AutoPay Retries</label>
            <input
              type="number"
              min={0}
              max={10}
              value={form.maxAutopayRetries}
              onChange={(e) => setForm((f) => ({ ...f, maxAutopayRetries: Number(e.target.value) }))}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 font-bold text-zinc-800 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-zinc-700 mb-1">Grace Period (Days)</label>
            <input
              type="number"
              min={0}
              max={30}
              value={form.gracePeriodDays}
              onChange={(e) => setForm((f) => ({ ...f, gracePeriodDays: Number(e.target.value) }))}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 font-bold text-zinc-800 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 cursor-pointer">
            <span className="font-bold text-zinc-800">Enable UPI AutoPay Mandates</span>
            <input
              type="checkbox"
              checked={form.upiAutopayEnabled}
              onChange={(e) => setForm((f) => ({ ...f, upiAutopayEnabled: e.target.checked }))}
              className="w-4 h-4 rounded text-orange-600"
            />
          </label>
          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 cursor-pointer">
            <span className="font-bold text-zinc-800">Enable One-Time Renewals</span>
            <input
              type="checkbox"
              checked={form.oneTimeEnabled}
              onChange={(e) => setForm((f) => ({ ...f, oneTimeEnabled: e.target.checked }))}
              className="w-4 h-4 rounded text-orange-600"
            />
          </label>
          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 cursor-pointer">
            <span className="font-bold text-zinc-800">Gateway Active</span>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              className="w-4 h-4 rounded text-orange-600"
            />
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-100">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={saving || testing || loading}
              onClick={handleSave}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4 text-orange-400" />
              <span>{saving ? 'Saving...' : `Save ${envTab.toUpperCase()} Credentials`}</span>
            </button>

            <button
              type="button"
              disabled={testing || saving || loading}
              onClick={handleTestConnection}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-800 text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-orange-600 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Testing Razorpay API...' : 'Test Connection'}</span>
            </button>

            <button
              type="button"
              disabled={testing || saving || loading}
              onClick={handleActivateLive}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              <span>Activate Live Mode</span>
            </button>
          </div>

          <button
            type="button"
            disabled={saving || loading}
            onClick={handleDisableGateway}
            className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Power className="w-4 h-4" />
            <span>Disable Gateway</span>
          </button>
        </div>

        <div className="text-xs text-zinc-400 flex items-center justify-between pt-2">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Env fallback supported: RAZORPAY_TEST_KEY_ID / RAZORPAY_TEST_KEY_SECRET / RAZORPAY_LIVE_KEY_ID / RAZORPAY_LIVE_KEY_SECRET
          </span>
          <a
            href="https://dashboard.razorpay.com/app/webhooks"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-orange-600 hover:underline font-semibold"
          >
            <span>Razorpay Dashboard</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
