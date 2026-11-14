import { Branch, BranchSchema } from '../types/schema';
import { TenantStore } from './tenantStore';

export const branchService = {
  listBranches(studioId: string): Branch[] {
    if (!studioId) throw new Error('[branchService.listBranches]: studioId is required');
    return TenantStore.get<Branch>(studioId, 'branches');
  },

  getBranch(studioId: string, branchId: string): Branch | undefined {
    if (!studioId) throw new Error('[branchService.getBranch]: studioId is required');
    return this.listBranches(studioId).find(b => b.id === branchId);
  },

  createBranch(studioId: string, data: Omit<Branch, 'id' | 'studioId' | 'createdAt' | 'updatedAt'>): Branch {
    if (!studioId) throw new Error('[branchService.createBranch]: studioId is required');
    const branches = this.listBranches(studioId);
    const newBranch: Branch = {
      ...data,
      id: `branch_${Date.now()}`,
      studioId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    BranchSchema.parse(newBranch);
    TenantStore.set(studioId, 'branches', [...branches, newBranch]);
    return newBranch;
  },

  updateBranch(studioId: string, branchId: string, updates: Partial<Branch>): Branch {
    if (!studioId) throw new Error('[branchService.updateBranch]: studioId is required');
    const branches = this.listBranches(studioId);
    let updated: Branch | null = null;
    const newList = branches.map(b => {
      if (b.id === branchId) {
        updated = { ...b, ...updates, updatedAt: new Date().toISOString() };
        BranchSchema.parse(updated);
        return updated;
      }
      return b;
    });
    if (!updated) throw new Error(`Branch ${branchId} not found in studio ${studioId}`);
    TenantStore.set(studioId, 'branches', newList);
    return updated;
  }
};
