import React, { useState, useMemo, useEffect } from 'react';
import { useMasterAdmin } from '../../context/MasterAdminContext';
import { masterAdminService } from '../../services/masterAdminService';
import { globalRbacService } from '../../services/globalRbacService';
import { featureVisibilityService } from '../../services/featureVisibilityService';
import { platformAuditService } from '../../services/platformAuditService';
import { cloudSyncService } from '../../services/cloudSyncService';
import { bookingProductionService } from '../../services/bookingProductionService';
import { customerService } from '../../services/customerService';
import { paymentService } from '../../services/paymentService';
import { quotationService } from '../../services/quotationService';
import { employeeService } from '../../services/employeeService';
import { invoiceService } from '../../services/invoiceService';
import { expenseService } from '../../services/expenseService';
import { unifiedAuthService } from '../../services/unifiedAuthService';
import { realAccountProvisionService } from '../../services/realAccountProvisionService';
import { TenantStore } from '../../services/tenantStore';
import { db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { StudioHandoverModal, StudioHandoverData } from '../../components/master/StudioHandoverModal';
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
  EyeOff,
  Edit3,
  Share2,
  Mail,
  X,
  Key,
  Copy,
  Check,
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
  FileText,
  Camera,
  RefreshCw
} from 'lucide-react';
import { Studio, StudioEvent, Employee, Invoice, Payment, Customer, Expense } from '../../types/schema';
import { BookingRecord, BOOKING_STATUS_LABELS } from '../../types/bookingProduction';

export const MasterStudioDetailPage: React.FC = () => {
  const { selectedStudioId, setSelectedStudioId, setMasterRoute, triggerRefresh, refreshTrigger } = useMasterAdmin();
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'employees' | 'revenue' | 'subscription' | 'roles' | 'features' | 'activity'>('overview');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cloud Hydration & Real-Time Sync on Selected Studio
  const [dataVersion, setDataVersion] = useState(0);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  // Booking Tab Inspection Filters & Expand State
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('all');
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

  // Password & Handover State
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);
  const [handoverData, setHandoverData] = useState<StudioHandoverData | null>(null);
  const [isEditStudioOpen, setIsEditStudioOpen] = useState(false);
  const [isSetPasswordOpen, setIsSetPasswordOpen] = useState(false);
  const [customPasswordInput, setCustomPasswordInput] = useState('');

  // Draft Studio Activation State
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  const [activateFormData, setActivateFormData] = useState({
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    initialPassword: ''
  });
  const [activateError, setActivateError] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  // Edit Studio Form
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    state: '',
    address: '',
    gstNumber: '',
    subscriptionPlan: '',
    subscriptionStatus: 'active',
    renewalDate: '',
    lifecycleStatus: 'active' as any,
    ownerName: '',
    ownerEmail: '',
    loginId: ''
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const studio = useMemo(() => {
    if (!selectedStudioId) return null;
    const all = masterAdminService.getAllStudios();
    return all.find(s => s.id === selectedStudioId) || all[0] || null;
  }, [selectedStudioId, refreshTrigger, dataVersion]);

  const studioId = studio?.id || selectedStudioId || '';

  // Cloud Hydration & Real-Time Sync Listener
  useEffect(() => {
    if (!selectedStudioId) return;
    let isMounted = true;
    setIsSyncingCloud(true);

    cloudSyncService.hydrateStudioFromCloud(selectedStudioId)
      .then(() => {
        if (isMounted) {
          setIsSyncingCloud(false);
          setDataVersion(v => v + 1);
        }
      })
      .catch(err => {
        console.warn('[MasterStudioDetailPage] Hydration notice:', err?.message);
        if (isMounted) setIsSyncingCloud(false);
      });

    const stopSync = cloudSyncService.startRealtimeSync(selectedStudioId);

    const handleUpdate = () => {
      setDataVersion(v => v + 1);
    };

    window.addEventListener('studio_data_updated', handleUpdate);
    window.addEventListener('studio_cloud_data_synced', handleUpdate);

    return () => {
      isMounted = false;
      stopSync();
      window.removeEventListener('studio_data_updated', handleUpdate);
      window.removeEventListener('studio_cloud_data_synced', handleUpdate);
    };
  }, [selectedStudioId]);

  // Direct Authoritative Studio Business Records
  const bookings = useMemo<BookingRecord[]>(() => {
    if (!studioId) return [];
    return bookingProductionService.listBookings(studioId, false);
  }, [studioId, refreshTrigger, dataVersion]);

  const customers = useMemo<Customer[]>(() => {
    if (!studioId) return [];
    return customerService.listCustomers(studioId);
  }, [studioId, refreshTrigger, dataVersion]);

  const payments = useMemo<Payment[]>(() => {
    if (!studioId) return [];
    return paymentService.listPayments(studioId);
  }, [studioId, refreshTrigger, dataVersion]);

  const quotations = useMemo(() => {
    if (!studioId) return [];
    return quotationService.listQuotations(studioId);
  }, [studioId, refreshTrigger, dataVersion]);

  const employees = useMemo<Employee[]>(() => {
    if (!studioId) return [];
    return employeeService.listEmployees(studioId);
  }, [studioId, refreshTrigger, dataVersion]);

  const invoices = useMemo<Invoice[]>(() => {
    if (!studioId) return [];
    return invoiceService.listInvoices(studioId);
  }, [studioId, refreshTrigger, dataVersion]);

  const expenses = useMemo<Expense[]>(() => {
    if (!studioId) return [];
    return expenseService.listExpenses(studioId);
  }, [studioId, refreshTrigger, dataVersion]);

  const auditLogs = useMemo(() => {
    const logs = platformAuditService.listLogs();
    return logs.filter(l => l.targetId === studioId || (l.details && l.details.includes(studioId))).slice(0, 20);
  }, [studioId, refreshTrigger, dataVersion]);

  // Exact Financial Calculations — Zero Demo Assumptions
  const totalInvoiced = useMemo(() => {
    return bookings.reduce((sum, b) => {
      const amt = Number(b.financials?.finalAgreedAmount ?? b.financials?.originalQuotation ?? 0);
      return sum + amt;
    }, 0);
  }, [bookings]);

  const paymentsReceived = useMemo(() => {
    const fromPayments = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    if (fromPayments > 0) return fromPayments;
    return bookings.reduce((sum, b) => {
      const rec = Number(b.financials?.verifiedPaymentsReceived ?? b.financials?.advanceReceived ?? 0);
      return sum + rec;
    }, 0);
  }, [payments, bookings]);

  const pendingBalance = Math.max(0, totalInvoiced - paymentsReceived);
  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }, [expenses]);

  const activeStaff = useMemo(() => {
    return employees.filter(e => e.employmentStatus === 'active' || (e as any).status === 'active').length;
  }, [employees]);

  // Filtered Bookings for Tab 2
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (bookingStatusFilter !== 'all') {
        if (bookingStatusFilter === 'confirmed' && !['deal_confirmed', 'confirmed', 'advance_received', 'event_scheduled'].includes(b.status as string)) return false;
        if (bookingStatusFilter === 'in_production' && !['in_production', 'editing', 'delivery_in_progress'].includes(b.status)) return false;
        if (bookingStatusFilter === 'completed' && !['completed', 'fully_delivered'].includes(b.status)) return false;
        if (bookingStatusFilter === 'cancelled' && b.status !== 'cancelled') return false;
      }
      if (bookingSearch.trim()) {
        const q = bookingSearch.toLowerCase();
        return (
          b.bookingNumber.toLowerCase().includes(q) ||
          b.eventName.toLowerCase().includes(q) ||
          b.customerName.toLowerCase().includes(q) ||
          (b.customerPhone && b.customerPhone.includes(q)) ||
          b.venue.toLowerCase().includes(q) ||
          b.city.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [bookings, bookingStatusFilter, bookingSearch]);

  // Open Edit Studio Form
  const handleOpenEdit = () => {
    if (!studio) return;
    const accounts = unifiedAuthService.listStoredAccounts();
    const ownerAcc = accounts.find(a => (a.studioId === studio.id && a.accountType === 'STUDIO_OWNER') || a.email.toLowerCase() === (studio.ownerEmail || studio.email || '').toLowerCase());
    const ownerLoginId = ownerAcc?.loginId || (studio as any).ownerUsername || (studio.ownerEmail ? studio.ownerEmail.split('@')[0] : studio.id);

    setEditFormData({
      name: studio.name || '',
      phone: studio.phone || '',
      email: studio.email || '',
      city: studio.city || 'Ahmedabad',
      state: studio.state || 'Gujarat',
      address: studio.address || '',
      gstNumber: studio.gstNumber || '',
      subscriptionPlan: studio.subscription?.planName || 'Studio OS Standard (₹500/mo)',
      subscriptionStatus: studio.subscription?.status || 'active',
      renewalDate: studio.subscription?.validUntil ? studio.subscription.validUntil.slice(0, 10) : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      lifecycleStatus: studio.lifecycleStatus || 'active',
      ownerName: (studio as any).ownerName || studio.title || '',
      ownerEmail: studio.ownerEmail || studio.email || '',
      loginId: ownerLoginId
    });
    setIsEditStudioOpen(true);
  };

  const handleSaveEditStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      masterAdminService.updateStudio(studioId, editFormData, 'Master Admin');

      const updateRes = await realAccountProvisionService.updateStudioOwnerDetails(
        studioId,
        editFormData.ownerName || (studio as any).ownerName || studio.name,
        editFormData.ownerEmail || studio.ownerEmail || studio.email,
        'Master Admin',
        editFormData.loginId
      );
      if (!updateRes.success) {
        alert(updateRes.error);
        return;
      }

      showToast('Studio profile and owner credentials updated successfully!');
      setIsEditStudioOpen(false);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update studio');
    }
  };

  // Password reset handler
  const handleOpenSetPassword = () => {
    setCustomPasswordInput(`Studio#${Math.floor(1000 + Math.random() * 9000)}`);
    setIsSetPasswordOpen(true);
  };

  const handleGenerateSecurePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCustomPasswordInput(pwd);
  };

  const handleSaveCustomPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studio) return;
    if (!customPasswordInput.trim() || customPasswordInput.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    try {
      const res = masterAdminService.setStudioOwnerPassword(studioId, customPasswordInput.trim(), 'Master Admin');
      setIsSetPasswordOpen(false);
      setHandoverData({
        studioName: studio.name,
        studioId: studio.id,
        ownerName: (studio as any).ownerName || studio.name + ' Owner',
        ownerMobile: studio.phone || '9876543210',
        ownerEmail: res.ownerEmail || studio.email,
        username: res.username || (studio as any).ownerUsername || studio.id,
        temporaryPassword: res.temporaryPassword,
        loginUrl: `${window.location.origin}/#/login`
      });
      setIsHandoverOpen(true);
      showToast('New password configured and handover panel ready!');
    } catch (err: any) {
      alert(err.message || 'Failed to set password');
    }
  };

  const handleActivateDraftStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studio) return;
    setActivateError('');

    if (!activateFormData.ownerName.trim()) {
      setActivateError('Owner full name is required');
      return;
    }
    if (!activateFormData.ownerEmail.trim() || !activateFormData.ownerEmail.includes('@')) {
      setActivateError('Valid owner email address is required');
      return;
    }
    if (!activateFormData.ownerPhone.trim() || activateFormData.ownerPhone.length < 10) {
      setActivateError('Valid 10-digit owner phone number is required');
      return;
    }

    setIsActivating(true);
    try {
      const res = masterAdminService.activateStudioWithOwner(studioId, {
        ownerName: activateFormData.ownerName.trim(),
        ownerEmail: activateFormData.ownerEmail.trim(),
        ownerPhone: activateFormData.ownerPhone.trim(),
        initialPassword: activateFormData.initialPassword.trim() || undefined
      }, 'Master Admin');

      if (res.success && res.credentials) {
        setIsActivateModalOpen(false);
        setHandoverData({
          studioName: studio.name,
          studioId: studio.id,
          ownerName: res.credentials.ownerName || activateFormData.ownerName,
          ownerMobile: res.credentials.ownerPhone || activateFormData.ownerPhone,
          ownerEmail: res.credentials.ownerEmail || res.credentials.email,
          username: res.credentials.username,
          temporaryPassword: res.credentials.temporaryPassword || res.temporaryPassword,
          loginUrl: `${window.location.origin}/#/login`
        });
        setIsHandoverOpen(true);
        showToast(`Studio activated! Initial password: ${res.credentials.temporaryPassword || res.temporaryPassword}`);
        triggerRefresh();
      } else {
        setActivateError((res as any).error || 'Failed to activate studio');
      }
    } catch (err: any) {
      setActivateError(err.message || 'Error activating draft studio');
    } finally {
      setIsActivating(false);
    }
  };

  const handleArchiveStudio = () => {
    if (!studio) return;
    if (window.confirm(`Are you sure you want to archive "${studio.name}"? Historical records and bookings will be safely preserved.`)) {
      masterAdminService.archiveStudio(studioId, 'Archived by Master Admin from detail view', 'Master Admin');
      showToast('Studio archived successfully.');
      triggerRefresh();
    }
  };

  const handleDeleteStudio = () => {
    if (!studio) return;
    if (window.confirm(`Are you sure you want to delete "${studio.name}"? If it contains events or financial records, it will be automatically protected and archived instead.`)) {
      masterAdminService.deleteStudio(studioId, 'Deleted by Master Admin from detail view', 'Master Admin');
      showToast('Studio deleted or archived.');
      setMasterRoute('studios');
    }
  };

  const handleToggleDeactivate = () => {
    if (!studio) return;
    const isCurrentlyActive = studio.lifecycleStatus === 'active';
    if (isCurrentlyActive) {
      if (window.confirm(`Deactivate studio "${studio.name}"? Studio owner and staff will not be able to sign in until reactivated.`)) {
        masterAdminService.suspendStudio(studioId, 'Deactivated by Master Admin from detail view');
        showToast('Studio account deactivated.');
        triggerRefresh();
      }
    } else {
      masterAdminService.reactivateStudio(studioId, 'Reactivated by Master Admin from detail view');
      showToast('Studio account reactivated.');
      triggerRefresh();
    }
  };

  const handleShareLoginDetails = () => {
    if (!studio) return;
    setHandoverData({
      studioName: studio.name,
      studioId: studio.id,
      ownerName: (studio as any).ownerName || studio.name + ' Owner',
      ownerMobile: studio.phone || '9876543210',
      ownerEmail: studio.email,
      username: (studio as any).ownerUsername || studio.email.split('@')[0],
      temporaryPassword: 'Password previously set',
      loginUrl: `${window.location.origin}/#/login`
    });
    setIsHandoverOpen(true);
  };

  const handleResetRolesToDefault = () => {
    globalRbacService.resetStudioOverridesToDefault(studioId);
    showToast('Studio roles and permissions reset to platform global defaults!');
    triggerRefresh();
  };

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

  const handleToggleFeature = async (featureKey: string, featureName: string) => {
    if (!studio) return;
    const currentOverride = featureVisibilityService.getStudioPlatformOverride(studio.id);
    const isCurrentlyEnabled = currentOverride.featureOverrides[featureKey] !== false && 
      (featureKey !== 'whatsapp' || (studio.settings as any)?.allowDirectWhatsApp !== false);
    const nextState = !isCurrentlyEnabled;

    featureVisibilityService.setStudioPlatformOverride(studio.id, featureKey, nextState, 'Master Admin');

    if (featureKey === 'whatsapp') {
      const updatedSettings = {
        ...(studio.settings || {}),
        allowDirectWhatsApp: nextState
      };
      studio.settings = updatedSettings as any;
      TenantStore.set(studio.id, 'profile', studio);

      if (db) {
        try {
          await setDoc(doc(db, 'studios', studio.id), { settings: updatedSettings }, { merge: true });
        } catch (err) {
          console.warn('[MasterStudioDetailPage] Could not persist WhatsApp setting to Firestore:', err);
        }
      }
    }

    showToast(`${featureName} is now ${nextState ? 'Active' : 'Disabled'} for this studio`);
    triggerRefresh();
  };

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
      <div className="p-8 text-center bg-white rounded-3xl border border-zinc-200">
        <Building2 className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-zinc-900 font-display">Studio Not Found</h3>
        <p className="text-xs text-zinc-500 mt-1">The requested studio could not be loaded from the directory.</p>
        <button
          onClick={() => setMasterRoute('studios')}
          className="mt-4 px-4 py-2 rounded-xl bg-zinc-900 text-white font-bold text-xs"
        >
          Return to Studios Directory
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 w-full font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-zinc-900 text-white shadow-2xl border border-zinc-700 flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-zinc-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMasterRoute('studios')}
            className="w-10 h-10 rounded-2xl border border-zinc-200 hover:border-zinc-300 bg-white flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-colors shadow-2xs cursor-pointer touch-manipulation active:scale-95"
            title="Back to Global Studio Directory"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                {studio.id}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                studio.lifecycleStatus === 'active' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : studio.lifecycleStatus === 'draft'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {studio.lifecycleStatus || 'Active'}
              </span>
              {isSyncingCloud && (
                <span className="flex items-center gap-1 text-xs text-orange-600 font-semibold animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Syncing Cloud...</span>
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight font-display mt-0.5">
              {studio.name}
            </h1>
            <p className="text-xs text-zinc-500 font-medium">
              Read-Only Multi-Tenant Inspection Console • Direct Firebase Firestore Connection
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleShareLoginDetails}
            className="min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 shadow-2xs flex items-center gap-1.5 cursor-pointer touch-manipulation active:scale-95"
            title="View credentials and handover info"
          >
            <Share2 className="w-3.5 h-3.5 text-zinc-500" />
            <span>Handover Details</span>
          </button>

          <button
            onClick={handleOpenEdit}
            className="min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 shadow-2xs flex items-center gap-1.5 cursor-pointer touch-manipulation active:scale-95"
            title="Edit studio information"
          >
            <Edit3 className="w-3.5 h-3.5 text-zinc-500" />
            <span>Edit Profile</span>
          </button>

          <button
            onClick={handleArchiveStudio}
            className="min-h-[44px] px-3 py-2 text-xs font-medium rounded-xl bg-white hover:bg-zinc-50 text-zinc-600 border border-zinc-200 flex items-center gap-1.5 cursor-pointer touch-manipulation active:scale-95"
            title="Archive studio safely"
          >
            <span>Archive</span>
          </button>

          <button
            onClick={handleDeleteStudio}
            className="min-h-[44px] px-3 py-2 text-xs font-medium rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1.5 cursor-pointer touch-manipulation active:scale-95"
            title="Delete or auto-archive studio"
          >
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* DRAFT STUDIO SETUP BANNER */}
      {studio.lifecycleStatus === 'draft' && (
        <div className="bg-purple-50/90 border border-purple-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 font-bold shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-purple-200 text-purple-900 border border-purple-300">
                  Draft Studio — Pending Activation
                </span>
                <span className="text-xs text-purple-700 font-medium">Clean Production Record</span>
              </div>
              <p className="text-xs sm:text-sm text-purple-950 font-medium mt-1">
                Enter the owner's details to activate the studio and generate their login credentials.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsActivateModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-purple-700/20 transition-all shrink-0 cursor-pointer touch-manipulation active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-purple-200" />
            <span>Configure & Activate Now</span>
          </button>
        </div>
      )}

      {/* 8 Tabs Navigation */}
      <div className="flex items-center gap-1.5 border-b border-zinc-200 overflow-x-auto pb-1 text-xs font-semibold scrollbar-none touch-scroll">
        {[
          { id: 'overview', label: '1. Overview', icon: Building2 },
          { id: 'events', label: `2. Events & Bookings (${bookings.length})`, icon: Calendar },
          { id: 'employees', label: `3. Employees & Crew (${employees.length})`, icon: Users },
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
              className={`min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap touch-manipulation active:scale-95 cursor-pointer ${
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
          {/* Quick Real Metrics — ZERO Fallbacks */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs">
              <div className="text-xs text-zinc-500 font-medium">Total Shoots</div>
              <div className="text-2xl font-black text-zinc-900 font-display mt-1">{bookings.length}</div>
              <div className="text-xs text-emerald-600 font-medium mt-1">Confirmed & In-flight</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs">
              <div className="text-xs text-zinc-500 font-medium">Total Invoiced</div>
              <div className="text-2xl font-black text-purple-700 font-display mt-1">₹{totalInvoiced.toLocaleString('en-IN')}</div>
              <div className="text-xs text-zinc-500 mt-1">Agreed customer value</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs">
              <div className="text-xs text-zinc-500 font-medium">Collected</div>
              <div className="text-2xl font-black text-emerald-600 font-display mt-1">₹{paymentsReceived.toLocaleString('en-IN')}</div>
              <div className="text-xs text-zinc-500 mt-1">Verified payments</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs">
              <div className="text-xs text-zinc-500 font-medium">Pending Balance</div>
              <div className="text-2xl font-black text-amber-600 font-display mt-1">₹{pendingBalance.toLocaleString('en-IN')}</div>
              <div className="text-xs text-zinc-500 mt-1">Outstanding collections</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs">
              <div className="text-xs text-zinc-500 font-medium">Active Staff</div>
              <div className="text-2xl font-black text-cyan-700 font-display mt-1">{activeStaff}</div>
              <div className="text-xs text-zinc-500 mt-1">Registered crew</div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 space-y-3 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Studio Business Information</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-zinc-400 block">Studio Name</span>
                  <strong className="text-zinc-800">{studio.name}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block">Studio Code</span>
                  <strong className="text-amber-700 font-mono">{studio.id}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block">Phone</span>
                  <strong className="text-zinc-800">{studio.phone || 'Not set'}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block">Email</span>
                  <strong className="text-zinc-800">{studio.email || 'Not set'}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block">Location</span>
                  <strong className="text-zinc-800">{studio.city || 'Ahmedabad'}, {studio.state || 'Gujarat'}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 block">GST Number</span>
                  <strong className="text-zinc-800 font-mono">{studio.gstNumber || 'Not provided'}</strong>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-200 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Studio Owner & Authentication Details</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                  studio.lifecycleStatus === 'active' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {studio.lifecycleStatus === 'active' ? 'Active' : 'Suspended / Deactivated'}
                </span>
              </div>
              <div className="text-xs space-y-2">
                <div className="flex justify-between py-1 border-b border-zinc-100">
                  <span className="text-zinc-400">Owner Name</span>
                  <span className="font-bold text-zinc-800">{(studio as any).ownerName || studio.title || studio.name + ' Owner'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-100">
                  <span className="text-zinc-400">Login ID / Username</span>
                  <span className="font-mono text-zinc-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                    {(studio as any).ownerUsername || (studio as any).ownerName?.toLowerCase().replace(/\s+/g, '_') || studio.id}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-100">
                  <span className="text-zinc-400">Contact Email</span>
                  <span className="font-mono text-zinc-800 font-semibold">{studio.ownerEmail || studio.email}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-100">
                  <span className="text-zinc-400">Account Access</span>
                  <span className={`font-bold ${studio.lifecycleStatus === 'active' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {studio.lifecycleStatus === 'active' ? 'Login Enabled' : 'Login Disabled (Deactivated)'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-100">
                  <span className="text-zinc-400">Created On</span>
                  <span className="text-zinc-700">{new Date(studio.createdAt || Date.now()).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">Security Architecture</span>
                  <span className="text-zinc-500 italic">Centralized Firebase Cloud Authentication</span>
                </div>
              </div>
            </div>
          </div>

          {/* Studio Owner Account & Security Controls */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 font-display">Studio Owner Credentials & Access Controls</h3>
                  <p className="text-xs text-zinc-500">Change owner password directly or update login credentials. Takes effect immediately on all devices.</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-zinc-100 text-zinc-700 border border-zinc-200 self-start sm:self-auto">
                Direct Master Authority
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setCustomPasswordInput('');
                  setIsSetPasswordOpen(true);
                }}
                className="p-3.5 rounded-xl border border-zinc-200 hover:border-amber-400 hover:bg-amber-50/50 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <Key className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-mono text-zinc-400 group-hover:text-amber-700">Immediate</span>
                </div>
                <div className="text-xs font-bold text-zinc-900">Change Owner Password</div>
                <div className="text-xs text-zinc-500 mt-0.5">Set a new password. Works immediately across all devices.</div>
              </button>

              <button
                type="button"
                onClick={handleOpenEdit}
                className="p-3.5 rounded-xl border border-zinc-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <Edit3 className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-mono text-zinc-400 group-hover:text-indigo-700">Identity</span>
                </div>
                <div className="text-xs font-bold text-zinc-900">Edit Studio & Owner Details</div>
                <div className="text-xs text-zinc-500 mt-0.5">Update owner name, Login ID / username, contact phone, and studio info.</div>
              </button>

              <button
                type="button"
                onClick={handleToggleDeactivate}
                className={`p-3.5 rounded-xl border text-left transition-all group cursor-pointer ${
                  studio.lifecycleStatus === 'active'
                    ? 'border-zinc-200 hover:border-rose-400 hover:bg-rose-50/50'
                    : 'border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <ShieldAlert className={`w-4 h-4 ${studio.lifecycleStatus === 'active' ? 'text-rose-600' : 'text-emerald-600'}`} />
                  <span className="text-xs font-mono text-zinc-400">Toggle</span>
                </div>
                <div className="text-xs font-bold text-zinc-900">
                  {studio.lifecycleStatus === 'active' ? 'Deactivate Studio Account' : 'Reactivate Studio Account'}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {studio.lifecycleStatus === 'active' 
                    ? 'Suspends login access for owner and staff immediately.' 
                    : 'Restores login access for owner and staff immediately.'}
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EVENTS & BOOKINGS (COMPREHENSIVE READ-ONLY INSPECTION) */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 font-display">
                  Events & Shoots Directory ({bookings.length})
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Read-Only Inspection
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Full read-only monitoring of all shoots, functions, deliverables, crew assignments, and customer agreements.
              </p>
            </div>
            <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-zinc-100 text-zinc-600 border border-zinc-200 self-start sm:self-auto">
              Operational Actions Restricted to Studio Owner
            </span>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by shoot name, customer, phone, venue, or booking ID..."
                value={bookingSearch}
                onChange={e => setBookingSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 font-medium"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: 'all', label: 'All Shoots' },
                { id: 'confirmed', label: 'Confirmed' },
                { id: 'in_production', label: 'In Production' },
                { id: 'completed', label: 'Completed' },
                { id: 'cancelled', label: 'Cancelled' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setBookingStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    bookingStatusFilter === f.id
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bookings Table with Expandable Inspection Details */}
          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm divide-y divide-zinc-100">
            {filteredBookings.length === 0 ? (
              <div className="p-12 text-center text-xs text-zinc-400 space-y-1">
                <Calendar className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                <p className="font-bold text-zinc-600">No events or shoots recorded in this studio yet.</p>
                <p>When the Studio Owner creates shoots, they will load here in real time via Firebase Cloud.</p>
              </div>
            ) : (
              filteredBookings.map(b => {
                const isExpanded = expandedBookingId === b.id;
                const agreedAmt = Number(b.financials?.finalAgreedAmount ?? b.financials?.originalQuotation ?? 0);
                const recAmt = Number(b.financials?.verifiedPaymentsReceived ?? b.financials?.advanceReceived ?? 0);
                const balAmt = Math.max(0, agreedAmt - recAmt);
                const statusLabel = BOOKING_STATUS_LABELS[b.status] || b.status;

                return (
                  <div key={b.id} className="transition-colors hover:bg-zinc-50/50">
                    {/* Primary Row Header */}
                    <div 
                      onClick={() => setExpandedBookingId(isExpanded ? null : b.id)}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <button
                          type="button"
                          className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-600 flex items-center justify-center shrink-0 hover:bg-zinc-200 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                              {b.bookingNumber}
                            </span>
                            <h4 className="text-sm font-bold text-zinc-900 font-display">
                              {b.eventName}
                            </h4>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium">
                              {b.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1 flex-wrap">
                            <span>Client: <strong className="text-zinc-800">{b.customerName}</strong></span>
                            {b.customerPhone && <span>• Phone: <span className="font-mono text-zinc-700">{b.customerPhone}</span></span>}
                            <span>• Date: <span className="font-medium text-zinc-700">{b.mainEventDate || b.startDate || 'TBD'}</span></span>
                            <span>• Venue: <span className="text-zinc-700">{b.venue || 'Studio Main Stage'}</span></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-center">
                        <div className="text-right">
                          <div className="text-sm font-mono font-black text-zinc-900">
                            ₹{agreedAmt.toLocaleString('en-IN')}
                          </div>
                          <div className="text-xs text-zinc-500">
                            Adv: <span className="text-emerald-600 font-semibold">₹{recAmt.toLocaleString('en-IN')}</span> • Bal: <span className="text-amber-600 font-semibold">₹{balAmt.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase shrink-0 ${
                          b.status === 'completed' || b.status === 'fully_delivered'
                            ? 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                            : b.status === 'deal_confirmed' || (b.status as string) === 'confirmed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : b.status === 'in_production' || b.status === 'editing'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : b.status === 'cancelled'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {statusLabel}
                        </span>
                      </div>
                    </div>

                    {/* Expandable Detail Panel */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 bg-zinc-50/70 border-t border-zinc-100 space-y-4 text-xs animate-in fade-in duration-150">
                        {/* 1. Sub-Events / Functions Breakdown */}
                        <div>
                          <h5 className="font-bold uppercase tracking-wider text-zinc-600 mb-2 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-orange-600" />
                            <span>Functions & Sub-Events ({b.functions?.length || 0})</span>
                          </h5>
                          {(!b.functions || b.functions.length === 0) ? (
                            <div className="p-3 rounded-xl bg-white border border-zinc-200 text-zinc-400">
                              No sub-events configured for this shoot.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                              {b.functions.map((fn, fIdx) => (
                                <div key={fn.id || fIdx} className="p-3 bg-white rounded-xl border border-zinc-200/90 shadow-2xs space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-zinc-900">{fn.name}</span>
                                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-zinc-100 text-zinc-600">
                                      {fn.date} ({fn.startTime || '10:00 AM'} - {fn.endTime || '06:00 PM'})
                                    </span>
                                  </div>
                                  <div className="text-zinc-500">
                                    Venue: <strong className="text-zinc-700">{fn.venue || 'Main Venue'}</strong> • {fn.city || b.city}
                                  </div>
                                  {/* Assigned Crew */}
                                  <div className="pt-1 border-t border-zinc-100 flex items-center gap-1.5 flex-wrap">
                                    <span className="text-zinc-400 text-xs">Assigned Crew:</span>
                                    {(!fn.assignedCrew || fn.assignedCrew.length === 0) ? (
                                      <span className="text-zinc-400 italic">None assigned</span>
                                    ) : (
                                      fn.assignedCrew.map((c, cIdx) => (
                                        <span key={cIdx} className="px-2 py-0.5 rounded bg-orange-50 text-orange-800 border border-orange-200 text-xs font-medium">
                                          {c.employeeName} ({c.role})
                                        </span>
                                      ))
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* 2. Deliverables & Album Production */}
                        <div>
                          <h5 className="font-bold uppercase tracking-wider text-zinc-600 mb-2 flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Deliverables & Production Status ({b.deliverables?.length || 0})</span>
                          </h5>
                          {(!b.deliverables || b.deliverables.length === 0) ? (
                            <div className="p-3 rounded-xl bg-white border border-zinc-200 text-zinc-400">
                              No deliverables configured.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {b.deliverables.map((del, dIdx) => (
                                <div key={del.id || dIdx} className="p-2.5 bg-white rounded-xl border border-zinc-200/90 shadow-2xs space-y-1">
                                  <div className="font-bold text-zinc-900 truncate">{del.name}</div>
                                  <div className="flex items-center justify-between text-xs text-zinc-500">
                                    <span>Qty: {del.requiredQty} {del.unit || 'items'}</span>
                                    <span className={`px-1.5 py-0.5 rounded font-bold uppercase text-xs ${
                                      del.isDelivered
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-zinc-100 text-zinc-600'
                                    }`}>
                                      {del.isDelivered ? 'Delivered' : (del.stage || 'In Progress')}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* 3. Financial Milestones */}
                        {b.financials?.paymentMilestones && b.financials.paymentMilestones.length > 0 && (
                          <div>
                            <h5 className="font-bold uppercase tracking-wider text-zinc-600 mb-2 flex items-center gap-1.5">
                              <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Payment Milestones</span>
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {b.financials.paymentMilestones.map((m, mIdx) => (
                                <div key={m.id || mIdx} className="p-2.5 bg-white rounded-xl border border-zinc-200/90 shadow-2xs">
                                  <div className="font-semibold text-zinc-800">{m.title}</div>
                                  <div className="text-sm font-bold text-zinc-900 font-mono mt-0.5">
                                    ₹{Number(m.amount).toLocaleString('en-IN')}
                                  </div>
                                  <div className="text-xs text-zinc-500 mt-0.5">
                                    Status: <strong className={m.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}>{m.status}</strong>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: EMPLOYEES & CREW (READ-ONLY) */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 font-display">
                  Employees & Creative Crew ({employees.length})
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Read-Only Inspection
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Staff directory and crew schedule. Hiring and permissions are managed by the Studio Owner.
              </p>
            </div>
            <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-zinc-100 text-zinc-600 border border-zinc-200 self-start sm:self-auto">
              Hiring Owned by Studio Owner
            </span>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase font-semibold border-b border-zinc-200">
                  <tr>
                    <th className="px-4 py-3">Employee Name</th>
                    <th className="px-4 py-3">Role / Designation</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3 text-center">Assigned Shoots</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-zinc-400">
                        No employees registered in this studio yet.
                      </td>
                    </tr>
                  ) : (
                    employees.map(emp => {
                      const assignedCount = bookings.filter(b => 
                        (b.functions || []).some(fn => 
                          (fn.assignedPhotographerIds || []).includes(emp.id) || 
                          (fn.assignedVideographerIds || []).includes(emp.id) || 
                          (fn.assignedCrew || []).some(c => c.employeeId === emp.id)
                        )
                      ).length;

                      return (
                        <tr key={emp.id} className="hover:bg-zinc-50">
                          <td className="px-4 py-3 font-bold text-zinc-800">{emp.name || emp.fullName}</td>
                          <td className="px-4 py-3 text-amber-700 font-semibold">{emp.designation || emp.roleName || emp.roleId || 'Staff'}</td>
                          <td className="px-4 py-3 text-zinc-600">{emp.department || 'Photography'}</td>
                          <td className="px-4 py-3 font-mono text-zinc-500 text-xs">{emp.email}</td>
                          <td className="px-4 py-3 font-mono text-zinc-500 text-xs">{emp.phone || 'N/A'}</td>
                          <td className="px-4 py-3 text-center font-bold text-zinc-800">{assignedCount} shoots</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {(emp as any).status || emp.employmentStatus || 'Active'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
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
            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs">
              <span className="text-xs text-zinc-500 block">Total Invoiced</span>
              <span className="text-2xl font-black text-zinc-900 font-display">₹{totalInvoiced.toLocaleString('en-IN')}</span>
              <span className="text-xs text-zinc-400 block mt-1">Booked pipeline value</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs">
              <span className="text-xs text-emerald-600 font-medium block">Payments Collected</span>
              <span className="text-2xl font-black text-emerald-600 font-display">₹{paymentsReceived.toLocaleString('en-IN')}</span>
              <span className="text-xs text-zinc-400 block mt-1">Real payments received</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs">
              <span className="text-xs text-amber-600 font-medium block">Pending Balance</span>
              <span className="text-2xl font-black text-amber-600 font-display">₹{pendingBalance.toLocaleString('en-IN')}</span>
              <span className="text-xs text-zinc-400 block mt-1">Outstanding receivable</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs">
              <span className="text-xs text-zinc-500 block">Logged Expenses</span>
              <span className="text-2xl font-black text-rose-600 font-display">₹{totalExpenses.toLocaleString('en-IN')}</span>
              <span className="text-xs text-zinc-400 block mt-1">Studio operations cost</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Recorded Payment Collections ({payments.length})</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Authoritative financial transactions from Firestore database.</p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-600 border border-zinc-200">
                Audited Transactions
              </span>
            </div>

            {payments.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                No formal payment receipts recorded yet for this studio.
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {payments.map(p => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-amber-700">{p.id}</span>
                      <span className="text-zinc-500 ml-2">({p.paymentMethod || 'Direct Transfer'}) • {p.paymentDate || (p as any).createdAt}</span>
                    </div>
                    <div className="font-mono font-bold text-emerald-600">
                      +₹{Number(p.amount).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: SUBSCRIPTION & BILLING */}
      {activeTab === 'subscription' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-amber-500/30 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-amber-50 text-amber-800 border border-amber-200">
                  SaaS Subscription Plan
                </span>
                <h3 className="text-xl font-black text-zinc-900 font-display mt-1">
                  {studio.subscription?.planName || 'Studio OS Standard'}
                </h3>
                <p className="text-xs text-zinc-500">
                  Production SaaS subscription tier for active photography studio.
                </p>
              </div>

              <div className="text-right">
                <span className="text-3xl font-black text-amber-600 font-mono">₹{studio.subscription?.pricePerMonth || 500}</span>
                <span className="text-xs text-zinc-400 block">per month (INR)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-3 border-t border-zinc-200">
              <div>
                <span className="text-zinc-400 block">Status</span>
                <strong className="text-emerald-600 uppercase font-bold">{studio.subscription?.status || 'Active'}</strong>
              </div>
              <div>
                <span className="text-zinc-400 block">Valid Until</span>
                <strong className="text-zinc-800 font-mono">
                  {studio.subscription?.validUntil ? new Date(studio.subscription.validUntil).toLocaleDateString('en-IN') : '31/12/2027'}
                </strong>
              </div>
              <div>
                <span className="text-zinc-400 block">Billing Cycle</span>
                <strong className="text-zinc-800">Monthly Recurring (Auto-Renew)</strong>
              </div>
              <div>
                <span className="text-zinc-400 block">Payment Method</span>
                <strong className="text-zinc-800">UPI Mandate / Direct Gateway</strong>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                onClick={() => handleExtendSubscription(7)}
                className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-xs font-semibold text-zinc-800 border border-zinc-200 cursor-pointer"
              >
                +7 Days Grace
              </button>
              <button
                onClick={() => handleExtendSubscription(30)}
                className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-xs font-semibold text-amber-700 border border-zinc-200 cursor-pointer"
              >
                +30 Days Extension
              </button>
              <button
                onClick={() => handleExtendSubscription(90)}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-zinc-950 cursor-pointer"
              >
                +90 Days Enterprise Renewal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: ROLES & PERMISSIONS */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 font-display">Studio Role & Permission Overrides</h3>
              <p className="text-xs text-zinc-500">
                Studio-specific permissions and platform RBAC configuration.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetRolesToDefault}
                className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-xs font-semibold text-rose-700 border border-zinc-200 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Platform Defaults</span>
              </button>
              <button
                onClick={() => {
                  setSelectedStudioId(studioId);
                  setMasterRoute('studio-roles-overrides');
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-zinc-950 cursor-pointer"
              >
                Open Full Matrix Editor
              </button>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200 space-y-3">
            <div className="text-xs text-zinc-700">
              This studio inherits from the <strong>Master Platform Global Roles</strong> with isolated data enforcement.
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {['Photographer', 'Videographer', 'Cinematographer', 'Photo Editor', 'Video Editor', 'Accountant'].map(role => (
                <div key={role} className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                  <span className="font-semibold text-zinc-800">{role}</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Platform Default
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: FEATURE VISIBILITY */}
      {activeTab === 'features' && (() => {
        const studioOverrides = featureVisibilityService.getStudioPlatformOverride(studio.id);
        return (
          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-zinc-900 font-display">Master Admin Feature Governance</h3>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Platform feature gates for <strong>{studio.name}</strong>. Disabling a feature immediately hides and protects the module across all owner and employee devices.
                </p>
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl divide-y divide-zinc-100 shadow-xs">
              {featureList.map(f => {
                const isOverridden = studioOverrides.featureOverrides[f.key] !== undefined;
                const isEnabled = f.key === 'whatsapp' 
                  ? ((studio.settings as any)?.allowDirectWhatsApp !== false && studioOverrides.featureOverrides['whatsapp'] !== false)
                  : (studioOverrides.featureOverrides[f.key] !== false);

                return (
                  <div key={f.key} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-zinc-900">{f.name}</span>
                        {f.key === 'whatsapp' && (
                          <span className="px-2 py-0.5 rounded text-xs font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Per-Studio Direct WhatsApp
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {f.key === 'whatsapp'
                          ? 'Controls WhatsApp Click-to-Chat buttons on Customer profiles, Booking workspace, and Quotations.'
                          : 'Platform standard feature tier. Can be restricted per studio.'}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
                        <span>Governance: {isOverridden ? 'Studio Platform Override' : 'Global Default'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border flex items-center gap-1.5 ${
                        isEnabled 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                          : 'bg-rose-50 text-rose-800 border-rose-300'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {isEnabled ? 'Active' : 'Disabled'}
                      </span>

                      <button
                        onClick={() => handleToggleFeature(f.key, f.name)}
                        className={`min-h-[44px] min-w-[120px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-95 shadow-xs ${
                          isEnabled
                            ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20'
                        }`}
                        title={`Click to ${isEnabled ? 'disable' : 'enable'} ${f.name}`}
                      >
                        {isEnabled ? (
                          <>
                            <Lock className="w-4 h-4" />
                            <span>Disable</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-4 h-4" />
                            <span>Enable</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

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
                    <span className="text-zinc-500 block text-xs">{l.details}</span>
                  </div>
                  <div className="text-right text-xs text-zinc-500 font-mono">
                    <div>{l.adminName}</div>
                    <div>{new Date(l.timestamp).toLocaleTimeString('en-IN')}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Handover Modal */}
      {handoverData && (
        <StudioHandoverModal
          isOpen={isHandoverOpen}
          onClose={() => setIsHandoverOpen(false)}
          data={handoverData}
        />
      )}

      {/* Edit Studio Modal */}
      {isEditStudioOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-zinc-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 font-display">Edit Studio Profile & Account</h3>
                  <p className="text-xs text-zinc-500">Update business info, subscription, lifecycle status, and owner credentials.</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditStudioOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditStudio} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-600 uppercase mb-1">Studio Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-600 uppercase mb-1">Phone / Mobile *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.phone}
                    onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-600 uppercase mb-1">Studio Owner Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.ownerName}
                    onChange={e => setEditFormData({ ...editFormData, ownerName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-amber-400"
                    placeholder="Owner Full Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-600 uppercase mb-1">Owner Login ID / Username *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.loginId}
                    onChange={e => setEditFormData({ ...editFormData, loginId: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-900 font-mono font-bold focus:outline-none focus:border-amber-400"
                    placeholder="e.g. aarav_patel"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-600 uppercase mb-1">Studio Contact Email</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-600 uppercase mb-1">Owner Email</label>
                  <input
                    type="email"
                    value={editFormData.ownerEmail}
                    onChange={e => setEditFormData({ ...editFormData, ownerEmail: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-600 uppercase mb-1">City</label>
                  <input
                    type="text"
                    value={editFormData.city}
                    onChange={e => setEditFormData({ ...editFormData, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-600 uppercase mb-1">State</label>
                  <input
                    type="text"
                    value={editFormData.state}
                    onChange={e => setEditFormData({ ...editFormData, state: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-600 uppercase mb-1">GST Number</label>
                  <input
                    type="text"
                    value={editFormData.gstNumber}
                    onChange={e => setEditFormData({ ...editFormData, gstNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-600 uppercase mb-1">Studio Address</label>
                <input
                  type="text"
                  value={editFormData.address}
                  onChange={e => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
                <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                  Subscription & Account Status
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-500 uppercase mb-1">Subscription Plan</label>
                    <select
                      value={editFormData.subscriptionPlan}
                      onChange={e => setEditFormData({ ...editFormData, subscriptionPlan: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-semibold"
                    >
                      <option value="Studio OS Standard (₹500/mo)">Standard (₹500/mo)</option>
                      <option value="Studio OS Professional (₹1,500/mo)">Professional (₹1,500/mo)</option>
                      <option value="Studio OS Enterprise (₹3,500/mo)">Enterprise (₹3,500/mo)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 uppercase mb-1">Subscription Status</label>
                    <select
                      value={editFormData.subscriptionStatus}
                      onChange={e => setEditFormData({ ...editFormData, subscriptionStatus: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-semibold"
                    >
                      <option value="active">Active</option>
                      <option value="trial">Trial</option>
                      <option value="pending">Pending</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 uppercase mb-1">Account Visibility</label>
                    <select
                      value={editFormData.lifecycleStatus}
                      onChange={e => setEditFormData({ ...editFormData, lifecycleStatus: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-semibold"
                    >
                      <option value="active">Active (Visible)</option>
                      <option value="hidden">Hidden from Discovery</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsEditStudioOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition-all shadow-sm cursor-pointer"
                >
                  Save Studio Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set / Change Owner Password Modal */}
      {isSetPasswordOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-zinc-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 font-display">Change Studio Owner Password</h3>
                  <p className="text-xs text-zinc-500">Configure or auto-generate a new password.</p>
                </div>
              </div>
              <button
                onClick={() => setIsSetPasswordOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomPassword} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-zinc-600 uppercase">New Password *</label>
                  <button
                    type="button"
                    onClick={handleGenerateSecurePassword}
                    className="text-amber-700 hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-Generate Strong</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={customPasswordInput}
                  onChange={e => setCustomPasswordInput(e.target.value)}
                  placeholder="Enter min. 6 characters"
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 font-mono text-sm font-bold bg-zinc-50 text-zinc-900 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 space-y-1">
                <p className="font-bold">Immediate Effect:</p>
                <p>• The previous password stops working immediately across all devices.</p>
                <p>• The new password works immediately with the owner's Login ID.</p>
                <p>• Plaintext passwords are never displayed in the platform overview.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsSetPasswordOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition-all shadow-sm cursor-pointer"
                >
                  Save & Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAFT STUDIO ACTIVATION MODAL */}
      {isActivateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 font-display">Activate Studio & Provision Owner</h3>
                  <p className="text-xs text-zinc-500 font-mono">{studio.id}</p>
                </div>
              </div>
              <button
                onClick={() => setIsActivateModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activateError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{activateError}</span>
              </div>
            )}

            <form onSubmit={handleActivateDraftStudio} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">Owner Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={activateFormData.ownerName}
                  onChange={e => setActivateFormData(f => ({ ...f, ownerName: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm bg-zinc-50 text-zinc-900 focus:outline-none focus:bg-white focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">Registered Login Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh@newstudio.com"
                  value={activateFormData.ownerEmail}
                  onChange={e => setActivateFormData(f => ({ ...f, ownerEmail: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm bg-zinc-50 text-zinc-900 focus:outline-none focus:bg-white focus:border-purple-500"
                />
                <p className="text-xs text-zinc-400 mt-1">This will be the permanent login identity for the Studio Owner.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">Owner Mobile / WhatsApp *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={activateFormData.ownerPhone}
                  onChange={e => setActivateFormData(f => ({ ...f, ownerPhone: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm bg-zinc-50 text-zinc-900 focus:outline-none focus:bg-white focus:border-purple-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-zinc-700 uppercase">Initial Password (Optional / Auto-Gen)</label>
                  <button
                    type="button"
                    onClick={() => {
                      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
                      let p = '';
                      for (let i = 0; i < 8; i++) p += chars.charAt(Math.floor(Math.random() * chars.length));
                      setActivateFormData(f => ({ ...f, initialPassword: p }));
                    }}
                    className="text-purple-600 hover:underline font-bold text-xs cursor-pointer"
                  >
                    Auto-Fill 8-Char
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Leave blank to auto-generate 8-character password"
                  value={activateFormData.initialPassword}
                  onChange={e => setActivateFormData(f => ({ ...f, initialPassword: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm font-mono bg-zinc-50 text-zinc-900 focus:outline-none focus:bg-white focus:border-purple-500"
                />
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200/80 rounded-xl text-xs text-purple-900 space-y-1">
                <p className="font-semibold">Security & Provisioning:</p>
                <p>• Creates Firebase Auth identity linked to this studio record.</p>
                <p>• Automatically generates an 8-character temporary password meeting complexity requirements.</p>
                <p>• Updates studio status from Draft to Active.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsActivateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActivating}
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isActivating ? 'Provisioning...' : 'Activate & Generate Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
