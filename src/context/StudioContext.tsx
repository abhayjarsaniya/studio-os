import React, { createContext, useContext, useState, useEffect } from 'react';
import { Studio, Branch, Membership } from '../types/schema';
import { studioService } from '../services/studioService';
import { branchService } from '../services/branchService';
import { memberService } from '../services/memberService';
import { studioA } from '../data/multiTenantDemoData';

interface StudioContextType {
  currentStudio: Studio;
  availableStudios: Studio[];
  switchStudio: (studioId: string) => void;
  branches: Branch[];
  currentBranchId: string | 'all';
  setCurrentBranchId: (id: string | 'all') => void;
  members: Membership[];
  isStudioSwitcherOpen: boolean;
  setIsStudioSwitcherOpen: (open: boolean) => void;
  refreshStudioData: () => void;
}

const StudioContext = createContext<StudioContextType | undefined>(undefined);

const ACTIVE_STUDIO_STORAGE_KEY = 'studio_os_active_studio_id_v2';
const ACTIVE_BRANCH_STORAGE_KEY = 'studio_os_active_branch_id_v2';

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [availableStudios, setAvailableStudios] = useState<Studio[]>(() => {
    return studioService.listStudios();
  });

  const [currentStudioId, setCurrentStudioId] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(ACTIVE_STUDIO_STORAGE_KEY) || 'std_demo_royal';
    }
    return 'std_demo_royal';
  });

  const [currentBranchId, setCurrentBranchIdState] = useState<string | 'all'>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY) || 'all';
    }
    return 'all';
  });

  const [isStudioSwitcherOpen, setIsStudioSwitcherOpen] = useState(false);

  // Active studio object
  const currentStudio = availableStudios.find(s => s.id === currentStudioId) || availableStudios[0] || studioA;

  // Active studio's branches & members
  const [branches, setBranches] = useState<Branch[]>([]);
  const [members, setMembers] = useState<Membership[]>([]);

  const loadStudioSubData = (sId: string) => {
    try {
      const b = branchService.listBranches(sId);
      const m = memberService.listMembers(sId);
      setBranches(b);
      setMembers(m);
    } catch (e) {
      console.error('Failed to load studio sub data:', e);
    }
  };

  useEffect(() => {
    loadStudioSubData(currentStudio.id);
  }, [currentStudio.id]);

  const switchStudio = (studioId: string) => {
    if (studioId === currentStudioId) return;
    try {
      // Validate studio exists
      studioService.getStudio(studioId);
      setCurrentStudioId(studioId);
      setCurrentBranchIdState('all');
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(ACTIVE_STUDIO_STORAGE_KEY, studioId);
        localStorage.setItem(ACTIVE_BRANCH_STORAGE_KEY, 'all');
      }
      loadStudioSubData(studioId);
    } catch (e) {
      console.error(`Failed to switch to studio ${studioId}:`, e);
    }
  };

  const setCurrentBranchId = (id: string | 'all') => {
    setCurrentBranchIdState(id);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(ACTIVE_BRANCH_STORAGE_KEY, id);
    }
  };

  const refreshStudioData = () => {
    const updatedStudios = studioService.listStudios();
    setAvailableStudios(updatedStudios);
    loadStudioSubData(currentStudio.id);
  };

  return (
    <StudioContext.Provider
      value={{
        currentStudio,
        availableStudios,
        switchStudio,
        branches,
        currentBranchId,
        setCurrentBranchId,
        members,
        isStudioSwitcherOpen,
        setIsStudioSwitcherOpen,
        refreshStudioData
      }}
    >
      {children}
    </StudioContext.Provider>
  );
};

export const useStudio = () => {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return context;
};
