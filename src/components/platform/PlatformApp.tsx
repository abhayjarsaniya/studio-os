import React from 'react';
import { PlatformProvider, usePlatform } from '../../context/PlatformContext';
import { PlatformLayout } from './PlatformLayout';

// Platform Pages
import { PlatformDashboardPage } from '../../pages/platform/PlatformDashboardPage';
import { PlatformStudiosPage } from '../../pages/platform/PlatformStudiosPage';
import { PlatformStudioDetailPage } from '../../pages/platform/PlatformStudioDetailPage';
import { PlatformStudioCreatePage } from '../../pages/platform/PlatformStudioCreatePage';
import { PlatformSubscriptionsPage } from '../../pages/platform/PlatformSubscriptionsPage';
import { PlatformPlansPage } from '../../pages/platform/PlatformPlansPage';
import { PlatformBillingPage } from '../../pages/platform/PlatformBillingPage';
import { PlatformAnalyticsPage } from '../../pages/PlatformAnalyticsPage';
import { PlatformFeaturesPage } from '../../pages/platform/PlatformFeaturesPage';
import { PlatformAnnouncementsPage } from '../../pages/platform/PlatformAnnouncementsPage';
import { PlatformSupportPage } from '../../pages/platform/PlatformSupportPage';
import { PlatformAdminsPage } from '../../pages/platform/PlatformAdminsPage';
import { PlatformAuditLogsPage } from '../../pages/platform/PlatformAuditLogsPage';
import { PlatformSettingsPage } from '../../pages/platform/PlatformSettingsPage';
import { PlatformEventsPage } from '../../pages/platform/PlatformEventsPage';

const PlatformRouter: React.FC = () => {
  const { platformRoute, canAdmin } = usePlatform();

  const renderPage = () => {
    switch (platformRoute) {
      case 'dashboard':
        return <PlatformDashboardPage />;
      case 'studios':
        return canAdmin('view_studios') ? <PlatformStudiosPage /> : <PlatformDashboardPage />;
      case 'create-studio':
        return canAdmin('manage_studios') ? <PlatformStudioCreatePage /> : <PlatformDashboardPage />;
      case 'events':
        return canAdmin('view_studios') ? <PlatformEventsPage /> : <PlatformDashboardPage />;
      case 'studio-detail':
        return canAdmin('view_studios') ? <PlatformStudioDetailPage /> : <PlatformDashboardPage />;
      case 'subscriptions':
        return canAdmin('view_subscriptions') ? <PlatformSubscriptionsPage /> : <PlatformDashboardPage />;
      case 'plans':
        return canAdmin('manage_plans') ? <PlatformPlansPage /> : <PlatformDashboardPage />;
      case 'billing':
      case 'payments':
      case 'revenue':
        return canAdmin('view_revenue') ? <PlatformBillingPage /> : <PlatformDashboardPage />;
      case 'analytics':
        return canAdmin('view_revenue') ? <PlatformAnalyticsPage /> : <PlatformDashboardPage />;
      case 'features':
        return canAdmin('manage_settings') ? <PlatformFeaturesPage /> : <PlatformDashboardPage />;
      case 'announcements':
        return canAdmin('manage_announcements') ? <PlatformAnnouncementsPage /> : <PlatformDashboardPage />;
      case 'support':
        return canAdmin('manage_support') ? <PlatformSupportPage /> : <PlatformDashboardPage />;
      case 'admins':
        return canAdmin('manage_admins') ? <PlatformAdminsPage /> : <PlatformDashboardPage />;
      case 'audit-logs':
        return canAdmin('view_audit_logs') ? <PlatformAuditLogsPage /> : <PlatformDashboardPage />;
      case 'settings':
        return canAdmin('manage_settings') ? <PlatformSettingsPage /> : <PlatformDashboardPage />;
      default:
        return <PlatformDashboardPage />;
    }
  };

  return <PlatformLayout>{renderPage()}</PlatformLayout>;
};

export const PlatformApp: React.FC = () => {
  return (
    <PlatformProvider>
      <PlatformRouter />
    </PlatformProvider>
  );
};
