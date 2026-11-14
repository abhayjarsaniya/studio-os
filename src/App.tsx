import React from 'react';
import { StudioProvider } from './context/StudioContext';
import { AppProvider, useApp } from './context/AppContext';
import { DesktopSidebar } from './components/layout/DesktopSidebar';
import { DesktopHeader } from './components/layout/DesktopHeader';
import { MobileHeader } from './components/layout/MobileHeader';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { StudioLoginPage } from './pages/StudioLoginPage';
import { EmployeeLoginPage } from './pages/EmployeeLoginPage';
import { EmployeeDashboardPage } from './pages/EmployeeDashboardPage';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { EventsPage } from './pages/EventsPage';
import { CustomersPage } from './pages/CustomersPage';
import { TasksPage } from './pages/TasksPage';
import { CalendarPage } from './pages/CalendarPage';
import { TeamPage } from './pages/TeamPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LeavePage } from './pages/LeavePage';
import { PayrollPage } from './pages/PayrollPage';
import { RolesPage } from './pages/RolesPage';
import { FinancePage } from './pages/FinancePage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ReportCenterPage } from './pages/ReportCenterPage';
import { PlatformAnalyticsPage } from './pages/PlatformAnalyticsPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { CreateBookingPage } from './pages/CreateBookingPage';
import { UnifiedBookingPage } from './pages/UnifiedBookingPage';
import { CrewMembersPage } from './pages/CrewMembersPage';
import { CreateQuotationPage } from './pages/CreateQuotationPage';
import { BookingsWorkspacePage } from './pages/BookingsWorkspacePage';
import { DeliveriesPage } from './pages/DeliveriesPage';
import { HistoryBookingsPage } from './pages/history/HistoryBookingsPage';

// Modals
import { EventDetailModal } from './components/events/EventDetailModal';
import { EventFormModal } from './components/events/EventFormModal';
import { CustomerDetailModal } from './components/customers/CustomerDetailModal';
import { CustomerFormModal } from './components/customers/CustomerFormModal';
import { WhatsAppMessagePreviewModal } from './components/customers/WhatsAppMessagePreviewModal';
import { CustomerMergeModal } from './components/customers/CustomerMergeModal';
import { TaskFormModal } from './components/tasks/TaskFormModal';
import { PDFViewerModal } from './components/finance/PDFViewerModal';
import { PlatformApp } from './components/platform/PlatformApp';
import { MasterApp } from './components/master/MasterApp';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useStudio } from './context/StudioContext';
import { featureVisibilityService } from './services/featureVisibilityService';
import { ShieldAlert } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab,
    currentUser,
    selectedEventId, 
    setSelectedEventId, 
    isEventFormOpen, 
    setIsEventFormOpen,
    editingEvent,
    setEditingEvent,
    events,
    selectedCustomerId,
    setSelectedCustomerId,
    customers,
    isCustomerFormOpen,
    setIsCustomerFormOpen,
    isTaskFormOpen,
    setIsTaskFormOpen,
    pdfViewerModal,
    closePdfViewer
  } = useApp();

  const { currentStudio } = useStudio();

  const isOwner = currentUser?.role === 'owner';
  const checkFeatureAccess = (featureId: string): boolean => {
    const studioId = currentStudio.id || 'std_demo_royal';
    const evalRes = featureVisibilityService.evaluateFeature(studioId, featureId, isOwner);
    return evalRes.accessible;
  };

  const renderDisabledFeatureNotice = (featureName: string) => (
    <div className="p-8 text-center bg-white border border-zinc-200 rounded-3xl max-w-lg mx-auto mt-12 shadow-sm space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center mx-auto">
        <ShieldAlert className="w-6 h-6 text-amber-600" />
      </div>
      <div className="space-y-1">
        <h2 className="text-base font-bold text-zinc-900 font-display">Feature Administratively Disabled</h2>
        <p className="text-xs text-zinc-500">
          The module "{featureName}" has been disabled by Platform Master Admin or is not entitled under your studio's subscription plan.
        </p>
      </div>
      <button
        onClick={() => setActiveTab('dashboard')}
        className="min-h-[44px] px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
      >
        Return to Dashboard
      </button>
    </div>
  );

  const selectedEvent = events.find(e => e.id === selectedEventId) || null;
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || null;

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'history':
        return <HistoryBookingsPage />;
      case 'create-booking':
      case 'new-booking':
        return <UnifiedBookingPage />;
      case 'crew':
        return <CrewMembersPage />;
      case 'create-quotation':
        return <CreateQuotationPage />;
      case 'bookings':
        return <BookingsWorkspacePage />;
      case 'deliveries':
        if (!checkFeatureAccess('deliverables') && !checkFeatureAccess('advanced_delivery')) {
          return renderDisabledFeatureNotice('Advanced Delivery Tracking');
        }
        return <DeliveriesPage />;
      case 'events':
        return <EventsPage />;
      case 'customers':
        if (!checkFeatureAccess('crm_customers') && !checkFeatureAccess('customer_crm')) {
          return renderDisabledFeatureNotice('Customer CRM');
        }
        return <CustomersPage />;
      case 'tasks':
        if (!checkFeatureAccess('tasks') && !checkFeatureAccess('tasks_production')) {
          return renderDisabledFeatureNotice('Task Management');
        }
        return <TasksPage />;
      case 'calendar':
        return <CalendarPage />;
      case 'team':
        return <CrewMembersPage />;
      case 'suppliers':
        if (!checkFeatureAccess('suppliers') && !checkFeatureAccess('external_suppliers')) {
          return renderDisabledFeatureNotice('External Suppliers');
        }
        return <SuppliersPage />;
      case 'roles':
        return <DashboardPage />;
      case 'leave':
        if (!checkFeatureAccess('leave_management')) {
          return renderDisabledFeatureNotice('Staff Leave Management');
        }
        return <LeavePage />;
      case 'payroll':
        if (!checkFeatureAccess('payroll') && !checkFeatureAccess('payroll_salaries')) {
          return renderDisabledFeatureNotice('Confidential Payroll');
        }
        return <PayrollPage />;
      case 'finance':
        if (!checkFeatureAccess('finance') && !checkFeatureAccess('finance_billing')) {
          return renderDisabledFeatureNotice('Finance & Invoicing');
        }
        return <FinancePage />;
      case 'analytics':
        if (!checkFeatureAccess('analytics') && !checkFeatureAccess('analytics_bi')) {
          return renderDisabledFeatureNotice('Business Intelligence & Analytics');
        }
        return <AnalyticsPage />;
      case 'reports':
        if (!checkFeatureAccess('reports') && !checkFeatureAccess('report_center')) {
          return renderDisabledFeatureNotice('Report Center');
        }
        return <ReportCenterPage />;
      case 'platform-analytics':
        return <PlatformAnalyticsPage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-zinc-50/70 overflow-hidden font-sans">
      {/* Desktop Sidebar (hidden on mobile) */}
      <div className="hidden sm:flex">
        <DesktopSidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Desktop Header */}
        <div className="hidden sm:block">
          <DesktopHeader />
        </div>

        {/* Mobile Header */}
        <MobileHeader />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-6 pb-24 sm:pb-8">
          {renderActivePage()}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>

      {/* Event Detail Modal */}
      <EventDetailModal
        isOpen={!!selectedEventId}
        event={selectedEvent}
        onClose={() => setSelectedEventId(null)}
        onEdit={(event) => {
          setEditingEvent(event);
          setIsEventFormOpen(true);
        }}
      />

      {/* Event Form Modal (Create & Edit) */}
      <EventFormModal
        isOpen={isEventFormOpen}
        onClose={() => {
          setIsEventFormOpen(false);
          setEditingEvent(null);
        }}
        eventToEdit={editingEvent}
      />

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        isOpen={!!selectedCustomerId}
        customer={selectedCustomer}
        onClose={() => setSelectedCustomerId(null)}
      />

      {/* Customer Form Modal */}
      <CustomerFormModal
        isOpen={isCustomerFormOpen}
        onClose={() => setIsCustomerFormOpen(false)}
      />

      {/* WhatsApp Message Preview & Click-to-Chat Modal */}
      <WhatsAppMessagePreviewModal />

      {/* Safe Customer Record Merge Modal */}
      <CustomerMergeModal />

      {/* Task Form Modal */}
      <TaskFormModal
        isOpen={isTaskFormOpen}
        onClose={() => setIsTaskFormOpen(false)}
      />

      {/* Global Financial Document PDF Viewer Modal */}
      <PDFViewerModal
        isOpen={pdfViewerModal.isOpen}
        onClose={closePdfViewer}
        payload={pdfViewerModal.payload}
      />
    </div>
  );
};

export function App() {
  const [currentRoute, setCurrentRoute] = React.useState<string>(() => {
    return typeof window !== 'undefined' ? window.location.hash : '#/app/dashboard';
  });

  React.useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(window.location.hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 1. Master Admin Platform Portal
  if (currentRoute.startsWith('#/master') || currentRoute.startsWith('#/platform')) {
    return (
      <ErrorBoundary fallbackTitle="Master Admin Platform Portal Error">
        <MasterApp />
      </ErrorBoundary>
    );
  }

  // 2. Studio Owner Login
  if (currentRoute === '#/studio/login' || currentRoute === '#/login') {
    return (
      <ErrorBoundary fallbackTitle="Studio Owner Login Error">
        <StudioLoginPage />
      </ErrorBoundary>
    );
  }

  // 3. Employee Login
  if (currentRoute === '#/employee/login') {
    return (
      <ErrorBoundary fallbackTitle="Employee Login Error">
        <EmployeeLoginPage />
      </ErrorBoundary>
    );
  }

  // 4. Employee Dedicated Dashboard Workspace
  if (currentRoute.startsWith('#/employee')) {
    return (
      <ErrorBoundary fallbackTitle="Employee Workspace Error">
        <EmployeeDashboardPage />
      </ErrorBoundary>
    );
  }

  // 5. Studio Owner & Tenant Workspace
  return (
    <ErrorBoundary fallbackTitle="Studio OS Workspace Error">
      <StudioProvider>
        <AppProvider>
          <MainLayout />
        </AppProvider>
      </StudioProvider>
    </ErrorBoundary>
  );
}

export default App;
