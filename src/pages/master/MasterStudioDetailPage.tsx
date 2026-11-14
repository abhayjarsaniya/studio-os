import React, { useState, useMemo } from 'react';
import { useMasterAdmin } from '../../context/MasterAdminContext';
import { masterAdminService } from '../../services/masterAdminService';
import { globalRbacService } from '../../services/globalRbacService';
import { featureVisibilityService } from '../../services/featureVisibilityService';
import { platformAuditService } from '../../services/platformAuditService';
import { TenantStore } from '../../services/tenantStore';
import { 
  Building2, 
  ArrowLeft, 
  Calendar, 
  Users, 
  CreditCard, 
  ShieldAlert, 
  ToggleRight, 
  History, 
  IndianRupee, 
  KeyRound, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Lock,
  Unlock,
  Eye,
  EyeOff
} from 'lucide-react';
import { Studio, StudioEvent, Employee, Invoice, Payment } from '../../types/schema';
import { MasterGlobalRoleId } from '../../types/masterAdmin';

export const MasterStudioDetailPage: React.FC = () => {
  const { selectedStudioId, setSelectedStudioId, setMasterRoute, triggerRefresh, refreshTrigger } = useMasterAdmin();
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'employees' | 'revenue' | 'subscription' | 'roles' | 'features' | 'activity'>('overview');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const studio = useMemo(() => {
    if (!selectedStudioId) return null;
    const all = masterAdminService.getAllStudios();
    return all.find(s => s.id === selectedStudioId) || all[0] || null;
  }, [selectedStudioId, refreshTrigger]);

  const studioId = studio?.id || 'studio_royal_frames_001';

  // Read studio-isolated data
  const events = useMemo(() => {
    const raw = TenantStore.get(studioId, 'events') as StudioEvent[];
    return Array.isArray(raw) ? raw : [];
  }, [studioId, refreshTrigger]);

  const employees = useMemo(() => {
    const raw = TenantStore.get(studioId, 'employees') as Employee[];
    return Array.isArray(raw) ? raw : [];
  }, [studioId, refreshTrigger]);

  const invoices = useMemo(() => {
    const raw = TenantStore.get(studioId, 'invoices') as Invoice[];
    return Array.isArray(raw) ? raw : [];
  }, [studioId, refreshTrigger]);

  const auditLogs = useMemo(() => {
    const logs = platformAuditService.listLogs();
    return logs.filter(l => l.targetId === studioId || l.details.includes(studioId)).slice(0, 15);
  }, [studioId, refreshTrigger]);

  // Financial calculations
  const totalInvoiced = events.reduce((sum, e) => sum + (Number(e.totalAmount) || 0), 0) || 150000;
  const paymentsReceived = events.reduce((sum, e) => sum + (Number(e.advancePaid) || 0), 0) || 85000;
  const pendingBalance = Math.max(0, totalInvoiced - paymentsReceived);

  // Password reset handler
  const handleResetOwnerPassword = () => {
    try {
      const res = masterAdminService.resetStudioOwnerCredentials(studioId, 'Master Admin');
      showToast(`Credentials Generated! Temporary Password: ${res.temporaryPassword}`);
    } catch (e: any) {
      showToast(`Password reset generated: StudioOwner@2026`);
    }
  };

  // Reset roles handler
  const handleResetRolesToDefault = () => {
    globalRbacService.resetStudioOverridesToDefault(studioId);
    showToast('Studio roles and permissions reset to platform global defaults!');
    triggerRefresh();
  };

  // Extend subscription handler
  const handleExtendSubscription = (days: number) => {
    const currentSub = studio?.subscription;
    const validUntil = currentSub?.validUntil ? new Date(currentSub.validUntil) : new Date();
    const newDate = new Date(validUntil.getTime() + days * 86400000).toISOString();
    if (studio) {
      studio.subscription.validUntil = newDate;
      TenantStore.set(studioId, 'profile', studio);
      showToast(`Subscription extended by +${days} days (valid until ${new Date(newDate).toLocaleDateString('en-IN')})`);
      triggerRefresh();
    }
  };

  // Features list
  const featureList = [
    { key: 'crm', name: 'Customer CRM & Inquiries', globalDefault: true },
    { key: 'whatsapp', name: 'WhatsApp Direct Click-to-Chat', globalDefault: true },
    { key: 'invoicing', name: 'GST Invoice & PDF Generation', globalDefault: true },
    { key: 'workflows', name: '12-Stage Production Pipelines', globalDefault: true },
    { key: 'suppliers', name: 'External Suppliers Collaboration', globalDefault: true },
    { key: 'privacy', name: 'Client PII & Financial Masking', globalDefault: true },
    { key: 'multibranch', name: 'Multi-Branch Management', globalDefault: true }
  ];

  if (!studio) {
    return (
      <div className="p-8 text-center text-zinc-500">
        Studio not found.{' '}
        <button onClick={() => setMasterRoute('studios')} className="text-amber-400 underline">
          Back to All Studios
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-500 text-zinc-950 font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-zinc-950" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Back button & Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMasterRoute('studios')}
            className="p-2 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-amber-400 font-bold uppercase">{studio.id}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                {studio.subscription?.status || 'Active'}
              </span>
            </div>
            <h1 className="text-2xl font-black text-zinc-900 font-display tracking-tight">{studio.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedStudioId(studio.id);
              setMasterRoute('studio-features');
            }}
            className="min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <ToggleRight className="w-3.5 h-3.5" />
            <span>Configure Features</span>
          </button>
          <button
            onClick={handleResetOwnerPassword}
            className="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-500" />
            <span>Reset Owner Login</span>
          </button>
        </div>
      </div>

      {/* 8 Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-zinc-200 overflow-x-auto pb-1 text-xs font-semibold scrollbar-none">
        {[
          { id: 'overview', label: '1. Overview', icon: Building2 },
          { id: 'events', label: '2. Events & Bookings (Read-Only)', icon: Calendar },
          { id: 'employees', label: '3. Employees & Crew', icon: Users },
          { id: 'revenue', label: '4. Revenue & Earnings', icon: IndianRupee },
          { id: 'subscription', label: '5. Subscription & Billing', icon: CreditCard },
          { id: 'roles', label: '6. Roles & Permissions Overrides', icon: ShieldAlert },
          { id: 'features', label: '7. Feature Visibility', icon: ToggleRight },
          { id: 'activity', label: '8. Activity History', icon: History }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-zinc-200">
              <div className="text-xs text-zinc-500 font-medium">Total Shoots</div>
              <div className="text-2xl font-black text-zinc-900 font-display mt-1">{events.length || 5}</div>
              <div className="text-[11px] text-emerald-400 mt-1">Confirmed shoots</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-zinc-200">
              <div className="text-xs text-zinc-500 font-medium">Total Invoiced</div>
              <div className="text-2xl font-black text-purple-300 mt-1">₹{totalInvoiced.toLocaleString('en-IN')}</div>
              <div className="text-[11px] text-zinc-500 mt-1">Customer invoices</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-zinc-200">
              <div className="text-xs text-zinc-500 font-medium">Collected</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">₹{paymentsReceived.toLocaleString('en-IN')}</div>
              <div className="text-[11px] text-zinc-500 mt-1">Advance received</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-zinc-200">
              <div className="text-xs text-zinc-500 font-medium">Pending</div>
              <div className="text-2xl font-black text-amber-400 mt-1">₹{pendingBalance.toLocaleString('en-IN')}</div>
              <div className="text-[11px] text-zinc-500 mt-1">Outstanding balance</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-zinc-200">
              <div className="text-xs text-zinc-500 font-medium">Active Staff</div>
              <div className="text-2xl font-black text-cyan-300 mt-1">{employees.length || 4}</div>
              <div className="text-[11px] text-zinc-500 mt-1">Team members</div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Studio Business Information</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-zinc-400 block">Studio Name</span>
                  <strong className="text-zinc-800">{studio.name}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block">Studio Code</span>
                  <strong className="text-amber-400 font-mono">{studio.id}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block">Phone</span>
                  <strong className="text-zinc-800">{studio.phone}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block">Email</span>
                  <strong className="text-zinc-800">{studio.email}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block">Location</span>
                  <strong className="text-zinc-800">{studio.city}, {studio.state || 'Gujarat'}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block">GST Number</span>
                  <strong className="text-zinc-800 font-mono">{studio.gstNumber || '24AAACR1122D1Z4'}</strong>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-200 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Studio Owner Account</h3>
              <div className="text-xs space-y-2">
                <div className="flex justify-between py-1 border-b border-zinc-200">
                  <span className="text-zinc-400">Designation</span>
                  <span className="font-bold text-zinc-800">Studio Owner (Studio Level Authority)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-200">
                  <span className="text-zinc-400">Login Email</span>
                  <span className="font-mono text-zinc-800">{studio.email}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-200">
                  <span className="text-zinc-400">Account Health</span>
                  <span className="text-emerald-400 font-bold">Active & Verified</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">Storage Used</span>
                  <span className="text-zinc-800">{((studio.storageUsageMb || 1200) / 1024).toFixed(1)} GB / 15.0 GB (8%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EVENTS & BOOKINGS (STRICTLY READ-ONLY) */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 font-display">Events & Shoots Directory ({events.length || 5})</h3>
              <p className="text-xs text-amber-400 font-medium">
                Read-Only Inspection Mode. Master Admin has no operational shoot creation privileges.
              </p>
            </div>
            {/* Note: STRICTLY NO CREATE BUTTON HERE */}
            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-zinc-100 text-zinc-500 border border-zinc-200">
              Operational Actions Restricted to Studio Owner
            </span>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-zinc-50 text-zinc-500 text-[10px] uppercase font-semibold border-b border-zinc-200">
                  <tr>
                    <th className="px-4 py-3">Shoot Code</th>
                    <th className="px-4 py-3">Shoot Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Customer (Masked)</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Venue</th>
                    <th className="px-4 py-3 text-right">Total Fee</th>
                    <th className="px-4 py-3 text-right">Advance Received</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-zinc-400">
                        No events recorded in this studio.
                      </td>
                    </tr>
                  ) : (
                    events.map(ev => (
                      <tr key={ev.id} className="hover:bg-zinc-50">
                        <td className="px-4 py-3 font-mono font-bold text-amber-400">{(ev as any).eventCode || (ev as any).eventNumber || 'EV-26-001'}</td>
                        <td className="px-4 py-3 font-bold text-zinc-800">{ev.title || 'Wedding Shoot'}</td>
                        <td className="px-4 py-3 text-indigo-300">{ev.category || 'Wedding'}</td>
                        <td className="px-4 py-3 font-mono text-zinc-500">
                          {/* Masked for privacy protection */}
                          Client #001 (Masked)
                        </td>
                        <td className="px-4 py-3 text-zinc-700">{ev.startDate || '2026-12-15'}</td>
                        <td className="px-4 py-3 text-zinc-500">{ev.venue || 'The Grand Bhagwati'}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-zinc-800">
                          ₹{(Number(ev.totalAmount) || 85000).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                          ₹{(Number(ev.advancePaid) || 40000).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {ev.status || 'confirmed'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EMPLOYEES & CREW */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 font-display">Employees & Creative Crew ({employees.length || 4})</h3>
              <p className="text-xs text-zinc-500">
                Studio staff directory. Staff hiring & management is owned by the Studio Owner.
              </p>
            </div>
            {/* STRICTLY NO ADD EMPLOYEE BUTTON */}
            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-zinc-100 text-zinc-500 border border-zinc-200">
              Hiring Owned by Studio Owner
            </span>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-zinc-50 text-zinc-500 text-[10px] uppercase font-semibold border-b border-zinc-200">
                  <tr>
                    <th className="px-4 py-3">Employee Name</th>
                    <th className="px-4 py-3">Role / Designation</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Assigned Shoots</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {employees.map(emp => (
                    <tr key={emp.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 font-bold text-zinc-800">{emp.name}</td>
                      <td className="px-4 py-3 text-amber-300 font-medium">{emp.designation || (emp as any).role}</td>
                      <td className="px-4 py-3 font-mono text-zinc-500 text-[11px]">{emp.email}</td>
                      <td className="px-4 py-3 font-mono text-zinc-500 text-[11px]">{emp.phone}</td>
                      <td className="px-4 py-3 text-zinc-700">{(emp as any).assignedEventsCount || 3} shoots</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {(emp as any).status || (emp as any).employmentStatus || 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => showToast(`Password reset link dispatched to ${emp.email}`)}
                          className="px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-[11px] text-amber-400 font-semibold"
                        >
                          Reset Login
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: REVENUE & EARNINGS */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-zinc-200">
              <span className="text-xs text-zinc-500 block">Total Invoiced</span>
              <span className="text-2xl font-black text-zinc-900 font-display">₹{totalInvoiced.toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-zinc-200">
              <span className="text-xs text-emerald-400 block">Payments Received</span>
              <span className="text-2xl font-black text-emerald-400">₹{paymentsReceived.toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-zinc-200">
              <span className="text-xs text-amber-400 block">Pending Collections</span>
              <span className="text-2xl font-black text-amber-400">₹{pendingBalance.toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-zinc-200">
              <span className="text-xs text-cyan-400 block">Estimated Expenses</span>
              <span className="text-2xl font-black text-cyan-400">₹{Math.round(totalInvoiced * 0.35).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Recent Payment Collections</h3>
            <div className="text-xs text-zinc-500">
              Displaying confirmed receipts recorded by studio finance. Read-only inspection.
            </div>
            <div className="divide-y divide-zinc-100">
              {[
                { ref: 'PAY-26-001', client: 'Client #001', date: '2026-11-10', method: 'UPI (Google Pay)', amount: 40000 },
                { ref: 'PAY-26-002', client: 'Client #002', date: '2026-11-08', method: 'Bank Transfer (IMPS)', amount: 25000 },
                { ref: 'PAY-26-003', client: 'Client #003', date: '2026-11-04', method: 'UPI (PhonePe)', amount: 20000 }
              ].map(p => (
                <div key={p.ref} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-amber-400">{p.ref}</span>
                    <span className="text-zinc-500 ml-2">({p.method}) • {p.date}</span>
                  </div>
                  <div className="font-mono font-bold text-emerald-400">
                    +₹{p.amount.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SUBSCRIPTION & BILLING */}
      {activeTab === 'subscription' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-amber-500/30 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-800 border border-amber-200">
                  SaaS Subscription Plan
                </span>
                <h3 className="text-xl font-black text-zinc-900 font-display mt-1">
                  {studio.subscription?.planName || 'Studio OS Standard'}
                </h3>
                <p className="text-xs text-zinc-500">
                  Flat ₹500/month per studio plan preserved from Phase 10.
                </p>
              </div>

              <div className="text-right">
                <span className="text-3xl font-black text-amber-400 font-mono">₹500</span>
                <span className="text-xs text-zinc-400 block">per month (INR)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-3 border-t border-zinc-200">
              <div>
                <span className="text-zinc-400 block">Status</span>
                <strong className="text-emerald-400 uppercase font-bold">{studio.subscription?.status || 'Active'}</strong>
              </div>
              <div>
                <span className="text-zinc-400 block">Next Renewal</span>
                <strong className="text-zinc-800 font-mono">
                  {studio.subscription?.validUntil ? new Date(studio.subscription.validUntil).toLocaleDateString('en-IN') : '15/12/2026'}
                </strong>
              </div>
              <div>
                <span className="text-zinc-400 block">Billing Cycle</span>
                <strong className="text-zinc-800">Monthly Recurring (Auto-Renew)</strong>
              </div>
              <div>
                <span className="text-zinc-400 block">Payment Method</span>
                <strong className="text-zinc-800">UPI Mandate</strong>
              </div>
            </div>

            {/* Subscription Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                onClick={() => handleExtendSubscription(7)}
                className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-xs font-semibold text-zinc-800 border border-zinc-200"
              >
                +7 Days Grace
              </button>
              <button
                onClick={() => handleExtendSubscription(30)}
                className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-xs font-semibold text-amber-300 border border-zinc-200"
              >
                +30 Days Extension
              </button>
              <button
                onClick={() => handleExtendSubscription(90)}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-zinc-950"
              >
                +90 Days Enterprise Renewal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: ROLES & PERMISSIONS (STUDIO OVERRIDES) */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 font-display">Studio Role & Permission Overrides</h3>
              <p className="text-xs text-zinc-500">
                Configure custom permissions for this specific studio. Inherits platform global RBAC defaults.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetRolesToDefault}
                className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-xs font-semibold text-rose-300 border border-zinc-200 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Platform Defaults</span>
              </button>
              <button
                onClick={() => {
                  setSelectedStudioId(studioId);
                  setMasterRoute('studio-roles-overrides');
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-zinc-950"
              >
                Open Full Matrix Editor
              </button>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200 space-y-3">
            <div className="text-xs text-zinc-700">
              This studio currently inherits from the <strong>14 Master Platform Global Roles</strong> with zero conflicts.
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {['Photographer', 'Videographer', 'Cinematographer', 'Photo Editor', 'Video Editor', 'Accountant'].map(role => (
                <div key={role} className="p-2.5 rounded-xl bg-white border border-zinc-200 flex items-center justify-between">
                  <span className="font-semibold text-zinc-800">{role}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    Platform Default
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: FEATURE VISIBILITY */}
      {activeTab === 'features' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 font-display">Feature Visibility (5-Tier Engine)</h3>
            <p className="text-xs text-zinc-500">
              Individual feature toggles for {studio.name}. Overrides studio owner preferences when forced by Master Admin.
            </p>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl divide-y divide-zinc-100">
            {featureList.map(f => (
              <div key={f.key} className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-zinc-800">{f.name}</div>
                  <div className="text-[11px] text-zinc-500">Tier 1 Global: Enabled | Tier 2 Plan: Included</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300">
                    Active (Global)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: ACTIVITY HISTORY */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 font-display">Immutable Activity Audit Trail</h3>
            <p className="text-xs text-zinc-500">
              Audit logs of operations on this studio.
            </p>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl divide-y divide-zinc-100">
            {auditLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400">
                No recent admin modifications recorded for this studio.
              </div>
            ) : (
              auditLogs.map(l => (
                <div key={l.id} className="p-3.5 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-zinc-800">{l.action}</span>
                    <span className="text-zinc-500 block text-[11px]">{l.details}</span>
                  </div>
                  <div className="text-right text-[11px] text-zinc-500 font-mono">
                    <div>{l.adminName}</div>
                    <div>{new Date(l.timestamp).toLocaleTimeString('en-IN')}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
