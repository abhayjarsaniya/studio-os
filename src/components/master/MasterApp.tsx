import React from 'react';
import { MasterAdminProvider, useMasterAdmin } from '../../context/MasterAdminContext';
import { MasterLayout } from './MasterLayout';

// Master Pages
import { MasterDashboardPage } from '../../pages/master/MasterDashboardPage';
import { MasterStudiosPage } from '../../pages/master/MasterStudiosPage';
import { MasterStudioCreatePage } from '../../pages/master/MasterStudioCreatePage';
import { MasterStudioDetailPage } from '../../pages/master/MasterStudioDetailPage';
import { MasterStudioRolesOverridesPage } from '../../pages/master/MasterStudioRolesOverridesPage';
import { MasterStudioFeaturesControlPage } from '../../pages/master/MasterStudioFeaturesControlPage';
import { MasterSubscriptionsPage } from '../../pages/master/MasterSubscriptionsPage';
import { MasterPlansPage } from '../../pages/master/MasterPlansPage';
import { MasterRolesPermissionsPage } from '../../pages/master/MasterRolesPermissionsPage';
import { MasterFeaturesPage } from '../../pages/master/MasterFeaturesPage';
import { MasterReportsPage } from '../../pages/master/MasterReportsPage';
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
      case 'analytics':
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
      case 'plans':
        return <MasterPlansPage />;
      case 'roles-permissions':
        return <MasterRolesPermissionsPage />;
      case 'features':
        return <MasterFeaturesPage />;
      case 'reports':
        return <MasterReportsPage />;
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
