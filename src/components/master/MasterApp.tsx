import React from 'react';
import { MasterAdminProvider, useMasterAdmin } from '../../context/MasterAdminContext';
import { MasterLayout } from './MasterLayout';

// Master Platform Pages
import { MasterDashboardPage } from '../../pages/master/MasterDashboardPage';
import { MasterStudiosPage } from '../../pages/master/MasterStudiosPage';
import { MasterStudioCreatePage } from '../../pages/master/MasterStudioCreatePage';
import { MasterStudioDetailPage } from '../../pages/master/MasterStudioDetailPage';
import { MasterStudioRolesOverridesPage } from '../../pages/master/MasterStudioRolesOverridesPage';
import { MasterStudioFeaturesControlPage } from '../../pages/master/MasterStudioFeaturesControlPage';
import { MasterSubscriptionsPage } from '../../pages/master/MasterSubscriptionsPage';
import { MasterPlansPage } from '../../pages/master/MasterPlansPage';
import { MasterAutoPayPage } from '../../pages/master/MasterAutoPayPage';
import { MasterTransactionsPage } from '../../pages/master/MasterTransactionsPage';
import { MasterRolesPermissionsPage } from '../../pages/master/MasterRolesPermissionsPage';
import { MasterFeaturesPage } from '../../pages/master/MasterFeaturesPage';
import { MasterCustomerReportsPage } from '../../pages/master/MasterCustomerReportsPage';
import { MasterAnalyticsPage } from '../../pages/master/MasterAnalyticsPage';
import { MasterTeamReportsPage } from '../../pages/master/MasterTeamReportsPage';
import { MasterPayrollPage } from '../../pages/master/MasterPayrollPage';
import { MasterSuppliersPage } from '../../pages/master/MasterSuppliersPage';
import { MasterReportsPage } from '../../pages/master/MasterReportsPage';
import { MasterNotificationsPage } from '../../pages/master/MasterNotificationsPage';
import { MasterAuditLogsPage } from '../../pages/master/MasterAuditLogsPage';
import { MasterSettingsPage } from '../../pages/master/MasterSettingsPage';
import { MasterAccountsPage } from '../../pages/master/MasterAccountsPage';
import { MasterLoginPage } from '../../pages/master/MasterLoginPage';

const MasterRouter: React.FC = () => {
  const { masterRoute, selectedStudioId } = useMasterAdmin();

  if (masterRoute === 'login') {
    return <MasterLoginPage />;
  }

  const renderContent = () => {
    switch (masterRoute) {
      case 'dashboard':
        return <MasterDashboardPage />;
      case 'studios':
        return <MasterStudiosPage />;
      case 'accounts':
        return <MasterAccountsPage />;
      case 'create-studio':
        return <MasterStudioCreatePage />;
      case 'studio-detail':
        return <MasterStudioDetailPage />;
      case 'studio-roles-overrides':
        return <MasterStudioRolesOverridesPage />;
      case 'studio-features':
        return <MasterStudioFeaturesControlPage studioId={selectedStudioId || 'std_demo_royal'} />;
      case 'subscriptions':
        return <MasterSubscriptionsPage />;
      case 'autopay':
        return <MasterAutoPayPage />;
      case 'transactions':
        return <MasterTransactionsPage />;
      case 'plans':
        return <MasterPlansPage />;
      case 'roles-permissions':
        return <MasterRolesPermissionsPage />;
      case 'features':
        return <MasterFeaturesPage />;
      case 'customer-reports':
        return <MasterCustomerReportsPage />;
      case 'analytics':
        return <MasterAnalyticsPage />;
      case 'team-reports':
        return <MasterTeamReportsPage />;
      case 'payroll':
        return <MasterPayrollPage />;
      case 'suppliers':
        return <MasterSuppliersPage />;
      case 'reports':
        return <MasterReportsPage />;
      case 'notifications':
        return <MasterNotificationsPage />;
      case 'audit-logs':
        return <MasterAuditLogsPage />;
      case 'settings':
        return <MasterSettingsPage />;
      default:
        return <MasterDashboardPage />;
    }
  };

  return <MasterLayout>{renderContent()}</MasterLayout>;
};

export const MasterApp: React.FC = () => {
  return (
    <MasterAdminProvider>
      <MasterRouter />
    </MasterAdminProvider>
  );
};
