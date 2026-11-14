import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  PlatformAdminUser, 
  PlatformRole, 
  PlatformPermission 
} from '../types/schema';
import { 
  platformAuthService, 
  DEFAULT_PLATFORM_SUPER_ADMIN, 
  ROLE_PERMISSIONS_MAP 
} from '../services/platformAuthService';

export interface PlatformContextType {
  currentAdmin: PlatformAdminUser;
  setCurrentAdminRole: (role: PlatformRole) => void;
  canAdmin: (permission: PlatformPermission) => boolean;
  platformRoute: string;
  setPlatformRoute: (route: string) => void;
  selectedStudioId: string | null;
  setSelectedStudioId: (id: string | null) => void;
  isRoleSwitcherOpen: boolean;
  setIsRoleSwitcherOpen: (open: boolean) => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const PlatformContext = createContext<PlatformContextType | undefined>(undefined);

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentAdmin, setCurrentAdmin] = useState<PlatformAdminUser>(DEFAULT_PLATFORM_SUPER_ADMIN);
  const [platformRoute, setPlatformRouteState] = useState<string>('dashboard');
  const [selectedStudioId, setSelectedStudioId] = useState<string | null>(null);
  const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Sync hash with platform route
  const syncHashToPlatformRoute = useCallback((hash: string) => {
    if (!hash.startsWith('#/platform')) return;

    if (hash === '#/platform' || hash === '#/platform/dashboard') {
      setPlatformRouteState('dashboard');
    } else if (hash === '#/platform/studios/create') {
      setPlatformRouteState('create-studio');
    } else if (hash.match(/#\/platform\/studios\/([^/]+)/)) {
      const match = hash.match(/#\/platform\/studios\/([^/]+)/);
      if (match) {
        setSelectedStudioId(match[1]);
        setPlatformRouteState('studio-detail');
      }
    } else if (hash.startsWith('#/platform/studios')) {
      setPlatformRouteState('studios');
    } else if (hash.startsWith('#/platform/events')) {
      setPlatformRouteState('events');
    } else if (hash.startsWith('#/platform/subscriptions')) {
      setPlatformRouteState('subscriptions');
    } else if (hash.startsWith('#/platform/plans')) {
      setPlatformRouteState('plans');
    } else if (hash.startsWith('#/platform/billing')) {
      setPlatformRouteState('billing');
    } else if (hash.startsWith('#/platform/payments')) {
      setPlatformRouteState('payments');
    } else if (hash.startsWith('#/platform/analytics')) {
      setPlatformRouteState('analytics');
    } else if (hash.startsWith('#/platform/features')) {
      setPlatformRouteState('features');
    } else if (hash.startsWith('#/platform/announcements')) {
      setPlatformRouteState('announcements');
    } else if (hash.startsWith('#/platform/support')) {
      setPlatformRouteState('support');
    } else if (hash.startsWith('#/platform/admins')) {
      setPlatformRouteState('admins');
    } else if (hash.startsWith('#/platform/audit-logs')) {
      setPlatformRouteState('audit-logs');
    } else if (hash.startsWith('#/platform/settings')) {
      setPlatformRouteState('settings');
    }
  }, []);

  useEffect(() => {
    syncHashToPlatformRoute(window.location.hash);
    const onHashChange = () => syncHashToPlatformRoute(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [syncHashToPlatformRoute]);

  const setPlatformRoute = (route: string) => {
    setPlatformRouteState(route);
    if (route === 'studio-detail' && selectedStudioId) {
      window.location.hash = `#/platform/studios/${selectedStudioId}`;
    } else if (route === 'create-studio') {
      window.location.hash = `#/platform/studios/create`;
    } else {
      window.location.hash = `#/platform/${route}`;
    }
  };

  const setCurrentAdminRole = (role: PlatformRole) => {
    setCurrentAdmin({
      ...currentAdmin,
      role,
      permissions: ROLE_PERMISSIONS_MAP[role]
    });
    triggerRefresh();
  };

  const canAdmin = useCallback((permission: PlatformPermission) => {
    return platformAuthService.hasPermission(currentAdmin, permission);
  }, [currentAdmin]);

  return (
    <PlatformContext.Provider
      value={{
        currentAdmin,
        setCurrentAdminRole,
        canAdmin,
        platformRoute,
        setPlatformRoute,
        selectedStudioId,
        setSelectedStudioId,
        isRoleSwitcherOpen,
        setIsRoleSwitcherOpen,
        refreshTrigger,
        triggerRefresh
      }}
    >
      {children}
    </PlatformContext.Provider>
  );
};

export const usePlatform = () => {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
};
