import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  MasterAdminUser, 
  MasterAdminPermission, 
  MasterFilterState 
} from '../types/masterAdmin';
import { DEFAULT_MASTER_ADMIN } from '../services/masterMigrationService';
import { TenantStore } from '../services/tenantStore';

export interface MasterAdminContextType {
  currentAdmin: MasterAdminUser;
  canMaster: (permission: MasterAdminPermission) => boolean;
  masterRoute: string;
  setMasterRoute: (route: string) => void;
  selectedStudioId: string | null;
  setSelectedStudioId: (id: string | null) => void;
  filterState: MasterFilterState;
  setFilterState: React.Dispatch<React.SetStateAction<MasterFilterState>>;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const MasterAdminContext = createContext<MasterAdminContextType | undefined>(undefined);

export const MasterAdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentAdmin, setCurrentAdmin] = useState<MasterAdminUser>(() => {
    const saved = TenantStore.getSingle<MasterAdminUser>('global_platform_master', 'current_master_admin');
    return saved || DEFAULT_MASTER_ADMIN;
  });

  const [masterRoute, setMasterRouteState] = useState<string>('dashboard');
  const [selectedStudioId, setSelectedStudioId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [filterState, setFilterState] = useState<MasterFilterState>({
    dateRange: 'all_time',
    studioId: 'all',
    city: 'all',
    studioStatus: 'all',
    eventCategory: 'all'
  });

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Sync route with window hash
  const syncHashToRoute = useCallback((hash: string) => {
    // Backward compatibility: redirect #/platform/* to #/master/*
    if (hash.startsWith('#/platform')) {
      const newHash = hash.replace('#/platform', '#/master');
      window.location.hash = newHash;
      return;
    }

    if (!hash.startsWith('#/master')) return;

    if (hash === '#/master' || hash === '#/master/dashboard') {
      setMasterRouteState('dashboard');
    } else if (hash === '#/master/studios/create' || hash.startsWith('#/master/studios/create')) {
      setMasterRouteState('create-studio');
    } else if (hash.match(/#\/master\/studios\/([^/]+)\/roles-permissions/)) {
      const match = hash.match(/#\/master\/studios\/([^/]+)\/roles-permissions/);
      if (match) {
        setSelectedStudioId(match[1]);
        setMasterRouteState('studio-roles-overrides');
      }
    } else if (hash.match(/#\/master\/studios\/([^/]+)\/features/)) {
      const match = hash.match(/#\/master\/studios\/([^/]+)\/features/);
      if (match) {
        setSelectedStudioId(match[1]);
        setMasterRouteState('studio-features');
      }
    } else if (hash.match(/#\/master\/studios\/([^/]+)/)) {
      const match = hash.match(/#\/master\/studios\/([^/]+)/);
      if (match) {
        setSelectedStudioId(match[1]);
        setMasterRouteState('studio-detail');
      }
    } else if (hash.startsWith('#/master/studios')) {
      setMasterRouteState('studios');
    } else if (hash.startsWith('#/master/accounts')) {
      setMasterRouteState('accounts');
    } else if (hash.startsWith('#/master/subscriptions')) {
      setMasterRouteState('subscriptions');
    } else if (hash.startsWith('#/master/plans')) {
      setMasterRouteState('plans');
    } else if (hash.startsWith('#/master/roles-permissions')) {
      setMasterRouteState('roles-permissions');
    } else if (hash.startsWith('#/master/features')) {
      setMasterRouteState('features');
    } else if (hash.startsWith('#/master/customer-reports')) {
      setMasterRouteState('customer-reports');
    } else if (hash.startsWith('#/master/analytics')) {
      setMasterRouteState('analytics');
    } else if (hash.startsWith('#/master/team-reports')) {
      setMasterRouteState('team-reports');
    } else if (hash.startsWith('#/master/payroll')) {
      setMasterRouteState('payroll');
    } else if (hash.startsWith('#/master/suppliers')) {
      setMasterRouteState('suppliers');
    } else if (hash.startsWith('#/master/reports')) {
      setMasterRouteState('reports');
    } else if (hash.startsWith('#/master/notifications')) {
      setMasterRouteState('notifications');
    } else if (hash.startsWith('#/master/audit-logs')) {
      setMasterRouteState('audit-logs');
    } else if (hash.startsWith('#/master/settings')) {
      setMasterRouteState('settings');
    } else if (hash.startsWith('#/master/login')) {
      setMasterRouteState('login');
    }
  }, []);

  useEffect(() => {
    syncHashToRoute(window.location.hash);
    const onHashChange = () => syncHashToRoute(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [syncHashToRoute]);

  const setMasterRoute = (route: string) => {
    setMasterRouteState(route);
    if (route === 'studio-detail' && selectedStudioId) {
      window.location.hash = `#/master/studios/${selectedStudioId}`;
    } else if (route === 'studio-features' && selectedStudioId) {
      window.location.hash = `#/master/studios/${selectedStudioId}/features`;
    } else if (route === 'studio-roles-overrides' && selectedStudioId) {
      window.location.hash = `#/master/studios/${selectedStudioId}/roles-permissions`;
    } else if (route === 'create-studio') {
      window.location.hash = `#/master/studios/create`;
    } else {
      window.location.hash = `#/master/${route}`;
    }
  };

  const canMaster = useCallback((permission: MasterAdminPermission): boolean => {
    if (currentAdmin.role === 'master_super_admin') return true;
    return currentAdmin.permissions.includes(permission);
  }, [currentAdmin]);

  return (
    <MasterAdminContext.Provider
      value={{
        currentAdmin,
        canMaster,
        masterRoute,
        setMasterRoute,
        selectedStudioId,
        setSelectedStudioId,
        filterState,
        setFilterState,
        refreshTrigger,
        triggerRefresh
      }}
    >
      {children}
    </MasterAdminContext.Provider>
  );
};

export const useMasterAdmin = (): MasterAdminContextType => {
  let ctx: MasterAdminContextType | undefined;
  try {
    ctx = useContext(MasterAdminContext);
  } catch {
    ctx = undefined;
  }
  if (!ctx) {
    return {
      currentAdmin: DEFAULT_MASTER_ADMIN,
      canMaster: () => true,
      masterRoute: 'dashboard',
      setMasterRoute: (route: string) => {
        window.location.hash = `#/master/${route}`;
      },
      selectedStudioId: null,
      setSelectedStudioId: () => {},
      filterState: {
        dateRange: 'all_time',
        studioId: 'all',
        city: 'all',
        studioStatus: 'all',
        eventCategory: 'all'
      },
      setFilterState: () => {},
      refreshTrigger: 0,
      triggerRefresh: () => {}
    };
  }
  return ctx;
};
