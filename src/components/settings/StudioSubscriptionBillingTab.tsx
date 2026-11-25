import React, { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import { platformPlanService } from '../../services/platformPlanService';
import {
  razorpayBillingService,
  StudioBillingRecord,
  PlatformTransactionRecord,
  BillingCycle,
  GatewayPublicConfig,
  computeDaysRemaining,
  formatRemainingLabel
} from '../../services/razorpayBillingService';
import { PlatformPlan } from '../../types/schema';
import {
  CreditCard,
  Repeat,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Receipt,
  Sparkles,
  ShieldCheck,
  ArrowUpRight,
  Lock,
  Loader2
} from 'lucide-react';

interface Props {
  studioId: string;
  studioName: string;
  studioEmail?: string;
  studioPhone?: string;
  ownerName?: string;
}

export const StudioSubscriptionBillingTab: React.FC<Props> = ({
  studioId,
  studioName,
  studioEmail,
  studioPhone,
  ownerName
}) => {
  const [billing, setBilling] = useState<StudioBillingRecord | null>(null);
  const [transactions, setTransactions] = useState<PlatformTransactionRecord[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [plans, setPlans] = useState<PlatformPlan[]>(() =>
    platformPlanService.listPlans().filter((p) => p.isActive !== false && p.priceMonthly > 0)
  );
  const [gatewayCfg, setGatewayCfg] = useState<GatewayPublicConfig | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('monthly');
  const [paymentMode, setPaymentMode] = useState<'upi_autopay' | 'one_time'>('upi_autopay');
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const unsubBill = razorpayBillingService.subscribeStudioBilling(studioId, (rec) => {
      setBilling(rec);
      if (rec?.planId && !selectedPlanId) {
        setSelectedPlanId(rec.planId);
      }
      if (rec?.billingCycle) {
        setSelectedCycle(rec.billingCycle);
      }
    });
    const unsubTx = razorpayBillingService.subscribeStudioTransactions(studioId, setTransactions);
    const unsubHist = razorpayBillingService.subscribeStudioHistory(studioId, setHistory);

    razorpayBillingService
      .listFirestorePlans()
      .then((fsPlans) => {
        if (fsPlans.length > 0) {
          const activePlans = fsPlans
            .filter((p) => p.isActive !== false && p.priceMonthly > 0)
            .map((p) => ({
              ...p,
              priceAnnual: p.priceYearly,
              currency: 'INR' as const,
              billingCycle: 'monthly' as const,
              version: 1,
              createdAt: p.updatedAt || new Date().toISOString()
            }));
          if (activePlans.length > 0) {
            setPlans(activePlans as PlatformPlan[]);
          }
        }
      })
      .catch(() => {});

    razorpayBillingService
      .fetchGatewayConfig()
      .then((cfg) => {
        setGatewayCfg(cfg);
        if (cfg.defaultPaymentMode) {
          setPaymentMode(cfg.defaultPaymentMode);
        }
      })
      .catch(() => {});

    return () => {
      unsubBill();
      unsubTx();
      unsubHist();
    };
  }, [studioId]);

  useEffect(() => {
    if (!selectedPlanId && plans.length > 0) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId]);

  const activePlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) || plans[0],
    [plans, selectedPlanId]
  );

  const selectedAmountInr = useMemo(() => {
    if (!activePlan) return 0;
    if (selectedCycle === 'yearly') return activePlan.priceAnnual;
    if (selectedCycle === 'quarterly') {
      return activePlan.priceQuarterly ?? Math.round(activePlan.priceMonthly * 3 * 0.9);
    }
    return activePlan.priceMonthly;
  }, [activePlan, selectedCycle]);

  const setupFeeInr = Number(activePlan?.setupFee || 0);
  const daysRemaining = computeDaysRemaining(billing?.expiryDate);
  const remainingLabel = formatRemainingLabel(billing?.expiryDate);

  const handleCheckout = async (mode: 'upi_autopay' | 'one_time') => {
    if (!activePlan) return;
    setBanner(null);
    setProcessingCheckout(true);
    try {
      const result = await razorpayBillingService.launchCheckout({
        studioId,
        studioName,
        planId: activePlan.id,
        planName: activePlan.name,
        cycle: selectedCycle,
        paymentType: mode,
        amountInr: selectedAmountInr,
        setupFeeInr,
        ownerName,
        ownerEmail: studioEmail,
        ownerPhone: studioPhone
      });
      setBanner({
        type: 'success',
        text:
          mode === 'upi_autopay'
            ? `UPI AutoPay mandate & payment verified (${result.paymentId}). Subscription is now Active!`
            : `Payment verified (${result.paymentId}). Subscription validity extended!`
      });
    } catch (err: any) {
      setBanner({
        type: 'error',
        text: err?.message || 'Razorpay checkout was cancelled or could not be verified.'
      });
    } finally {
      setProcessingCheckout(false);
    }
  };

  const handleDownloadInvoice = (tx: PlatformTransactionRecord) => {
    const pdf = new jsPDF();
    pdf.setFontSize(17);
    pdf.text('STUDIO OS — SUBSCRIPTION TAX RECEIPT', 20, 24);
    pdf.setFontSize(10);
    pdf.text(`Studio: ${studioName}`, 20, 38);
    pdf.text(`Invoice #: ${tx.invoiceNumber || tx.id}`, 20, 45);
    pdf.text(`Plan: ${tx.planName || activePlan?.name || 'Studio OS Plan'} (${tx.billingCycle || 'monthly'})`, 20, 52);
    pdf.text(`Payment Method: ${(tx.method || tx.paymentType || 'Razorpay').toUpperCase()} ${tx.upiVpa ? `(${tx.upiVpa})` : ''}`, 20, 59);
    pdf.text(`Status: ${tx.status.toUpperCase()}`, 20, 66);
    pdf.text(`Paid Date: ${new Date(tx.paidAt || tx.createdAt || Date.now()).toLocaleString('en-IN')}`, 20, 73);
    pdf.setFontSize(13);
    pdf.text(`Amount Paid: INR ${Number(tx.amountInr || 0).toLocaleString('en-IN')}`, 20, 86);
    pdf.setFontSize(9);
    pdf.text(`Razorpay Payment ID: ${tx.razorpayPaymentId || 'N/A'}`, 20, 100);
    pdf.text(`Razorpay Subscription ID: ${tx.razorpaySubscriptionId || 'N/A'}`, 20, 107);
    pdf.save(`${tx.invoiceNumber || tx.id}.pdf`);
  };

  const gatewayReady = Boolean(gatewayCfg?.enabled && gatewayCfg?.isConfigured && gatewayCfg?.activeKeyId);

  return (
    <div className="space-y-6">
      {banner && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-start gap-2.5 ${
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
          <span className="font-semibold">{banner.text}</span>
        </div>
      )}

      {/* Subscription Overview Card */}
      <div className="p-6 rounded-3xl bg-white border border-zinc-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-orange-50 text-orange-700 border border-orange-200">
                Studio OS SaaS Subscription
              </span>
              {billing?.status && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                    billing.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : billing.status === 'trial'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {billing.status.replace('_', ' ')}
                </span>
              )}
            </div>
            <h3 className="text-lg font-black text-zinc-900 mt-1.5 font-display">
              {billing?.planName || activePlan?.name || 'Studio OS Standard'}
            </h3>
          </div>

          <div className="px-4 py-2.5 rounded-2xl bg-zinc-900 text-white text-center sm:text-right">
            <div className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
              Validity Countdown
            </div>
            <div className="text-base font-black text-orange-400 flex items-center justify-center sm:justify-end gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{billing?.expiryDate ? remainingLabel : 'Pending Activation'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/80">
            <div className="text-xs text-zinc-500 font-semibold">Plan Rate</div>
            <div className="text-sm font-black text-zinc-900 font-mono mt-0.5">
              ₹{Number(billing?.amountInr ?? activePlan?.priceMonthly ?? 500).toLocaleString('en-IN')}
              <span className="text-xs font-normal text-zinc-500"> / {billing?.billingCycle || 'monthly'}</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/80">
            <div className="text-xs text-zinc-500 font-semibold">Expiry Date</div>
            <div className="text-sm font-bold text-zinc-900 mt-0.5">
              {billing?.expiryDate ? new Date(billing.expiryDate).toLocaleDateString('en-IN') : '—'}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/80">
            <div className="text-xs text-zinc-500 font-semibold">Next Renewal</div>
            <div className="text-sm font-bold text-zinc-900 mt-0.5">
              {billing?.nextRenewalDate ? new Date(billing.nextRenewalDate).toLocaleDateString('en-IN') : '—'}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/80">
            <div className="text-xs text-zinc-500 font-semibold">UPI AutoPay Mandate</div>
            <div className="text-sm font-bold text-zinc-900 mt-0.5 capitalize flex items-center gap-1">
              <Repeat className="w-3.5 h-3.5 text-orange-600" />
              <span>{(billing?.mandateStatus || 'not_set_up').replace('_', ' ')}</span>
            </div>
            {billing?.upiVpa && (
              <div className="text-xs font-mono text-zinc-500 truncate">{billing.upiVpa}</div>
            )}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/80 text-xs text-zinc-600 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-zinc-500" />
            All subscription modifications, cancellations, or extensions are governed exclusively by Platform Master Admin.
          </span>
          {daysRemaining > 0 && billing?.razorpaySubscriptionId && (
            <span className="font-mono text-zinc-500">ID: {billing.razorpaySubscriptionId}</span>
          )}
        </div>
      </div>

      {/* Choose Plan & Pay / Setup UPI AutoPay */}
      <div className="p-6 rounded-3xl bg-white border border-zinc-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-zinc-900 font-display">
              Subscribe, Upgrade Plan & Setup UPI AutoPay
            </h3>
            <p className="text-xs text-zinc-500">
              Select a plan and billing cycle below, then choose automatic UPI AutoPay or a one-time payment via Razorpay.
            </p>
          </div>

          <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 text-xs font-bold self-start">
            {(['monthly', 'quarterly', 'yearly'] as BillingCycle[]).map((cycle) => (
              <button
                key={cycle}
                type="button"
                onClick={() => setSelectedCycle(cycle)}
                className={`px-3 py-1.5 rounded-lg capitalize cursor-pointer transition-all ${
                  selectedCycle === cycle
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {cycle}
              </button>
            ))}
          </div>
        </div>

        {/* Plan Selector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {plans.map((plan) => {
            const isSelected = activePlan?.id === plan.id;
            const cyclePrice =
              selectedCycle === 'yearly'
                ? plan.priceAnnual
                : selectedCycle === 'quarterly'
                  ? plan.priceQuarterly ?? Math.round(plan.priceMonthly * 3 * 0.9)
                  : plan.priceMonthly;

            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlanId(plan.id)}
                className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50/40 ring-2 ring-orange-500/20'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-zinc-900">{plan.name}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-orange-600" />}
                </div>
                <div className="mt-2 text-xl font-black text-zinc-900 font-mono">
                  ₹{cyclePrice.toLocaleString('en-IN')}
                  <span className="text-xs font-normal text-zinc-500"> / {selectedCycle}</span>
                </div>
                <div className="mt-2 text-xs text-zinc-500">
                  Up to {plan.employeeLimit} staff • {plan.branchLimit} branches • {plan.storageGb}GB storage
                </div>
              </button>
            );
          })}
        </div>

        {/* Transparent Payment Disclosure & Action Buttons */}
        {!gatewayReady ? (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Razorpay Payment Gateway Pending Activation:</strong> Master Admin has not enabled Razorpay checkout yet. Please contact Platform Master Admin to activate live/test payments.
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <div className="font-bold text-zinc-900">
                  Selected: {activePlan?.name} ({selectedCycle})
                </div>
                <div className="text-zinc-500 mt-0.5">
                  Recurring / Renewal Amount: <strong className="font-mono text-zinc-900">₹{selectedAmountInr.toLocaleString('en-IN')}</strong> per {selectedCycle} cycle
                  {setupFeeInr > 0 && (
                    <span> + ₹{setupFeeInr.toLocaleString('en-IN')} one-time setup fee today</span>
                  )}
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-white border border-zinc-200 text-xs font-bold text-zinc-600 self-start">
                Secured by Razorpay ({gatewayCfg?.environment.toUpperCase()})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {gatewayCfg?.upiAutopayEnabled !== false && (
                <button
                  type="button"
                  disabled={processingCheckout || selectedAmountInr <= 0}
                  onClick={() => handleCheckout('upi_autopay')}
                  className="p-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white text-left transition-all cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center justify-between text-xs font-black">
                    <span className="flex items-center gap-1.5">
                      {processingCheckout ? (
                        <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                      ) : (
                        <Repeat className="w-4 h-4 text-orange-400" />
                      )}
                      <span>Setup UPI AutoPay Mandate</span>
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-orange-400" />
                  </div>
                  <div className="text-xs text-zinc-300 mt-1">
                    Automatic ₹{selectedAmountInr.toLocaleString('en-IN')} / {selectedCycle} via GPay, PhonePe, Paytm or BHIM UPI
                  </div>
                </button>
              )}

              {gatewayCfg?.oneTimeEnabled !== false && (
                <button
                  type="button"
                  disabled={processingCheckout || selectedAmountInr <= 0}
                  onClick={() => handleCheckout('one_time')}
                  className="p-3.5 rounded-2xl bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-900 text-left transition-all cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center justify-between text-xs font-black">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-orange-600" />
                      <span>Pay One-Time Online</span>
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-zinc-500" />
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Single payment of ₹{(selectedAmountInr + setupFeeInr).toLocaleString('en-IN')} via UPI, Card, or Netbanking (No auto-debit)
                  </div>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Payment & AutoPay Transaction History (Strictly Own Studio) */}
      <div className="p-6 rounded-3xl bg-white border border-zinc-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-zinc-900 font-display">
              AutoPay & Payment Transaction History
            </h3>
            <p className="text-xs text-zinc-500">
              Verified Razorpay receipts and subscription status logs for {studioName}.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-zinc-200 rounded-2xl">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase font-bold">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Plan / Type</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment / Sub ID</th>
                <th className="px-4 py-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                    No subscription payments recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-zinc-600">
                      {new Date(tx.paidAt || tx.updatedAt || tx.createdAt || Date.now()).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-zinc-900">{tx.planName || tx.planId}</div>
                      <div className="text-xs text-zinc-500 uppercase">
                        {tx.paymentType === 'upi_autopay' ? 'UPI AutoPay' : 'One-Time Payment'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-zinc-900">
                      ₹{Number(tx.amountInr || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                          tx.status === 'captured' || tx.status === 'authorized'
                            ? 'bg-emerald-50 text-emerald-700'
                            : tx.status === 'failed'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                      {tx.razorpayPaymentId || tx.razorpaySubscriptionId || tx.razorpayOrderId || tx.id}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(tx.status === 'captured' || tx.status === 'authorized') && (
                        <button
                          type="button"
                          onClick={() => handleDownloadInvoice(tx)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5 text-orange-600" />
                          <span>PDF</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {history.length > 0 && (
          <div className="pt-2">
            <div className="text-xs font-bold uppercase text-zinc-400 mb-2">
              Subscription Activity Log
            </div>
            <div className="space-y-1.5 text-xs">
              {history.slice(0, 6).map((h, idx) => (
                <div
                  key={h.id || idx}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200/60"
                >
                  <span className="font-medium text-zinc-700">
                    {h.details || h.eventType?.replace(/_/g, ' ') || 'Subscription event'}
                  </span>
                  <span className="text-xs font-mono text-zinc-400">
                    {h.timestamp ? new Date(h.timestamp).toLocaleDateString('en-IN') : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
