import { Membership, MembershipSchema, MembershipRole } from '../types/schema';
import { TenantStore } from './tenantStore';

export const memberService = {
  listMembers(studioId: string): Membership[] {
    if (!studioId) throw new Error('[memberService.listMembers]: studioId is required');
    return TenantStore.get<Membership>(studioId, 'members');
  },

  getMember(studioId: string, memberId: string): Membership | undefined {
    if (!studioId) throw new Error('[memberService.getMember]: studioId is required');
    return this.listMembers(studioId).find(m => m.id === memberId || m.userId === memberId);
  },

  addMember(studioId: string, data: Omit<Membership, 'id' | 'studioId' | 'createdAt' | 'updatedAt'>): Membership {
    if (!studioId) throw new Error('[memberService.addMember]: studioId is required');
    const members = this.listMembers(studioId);
    const newMember: Membership = {
      ...data,
      id: `mem_${Date.now()}`,
      studioId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    MembershipSchema.parse(newMember);
    TenantStore.set(studioId, 'members', [...members, newMember]);
    return newMember;
  },

  updateMemberRole(studioId: string, memberId: string, role: MembershipRole, roleTitle: string): Membership {
    if (!studioId) throw new Error('[memberService.updateMemberRole]: studioId is required');
    const members = this.listMembers(studioId);
    let updated: Membership | null = null;
    const newList = members.map(m => {
      if (m.id === memberId || m.userId === memberId) {
        updated = { ...m, role, roleTitle, roleIds: [role], updatedAt: new Date().toISOString() };
        MembershipSchema.parse(updated);
        return updated;
      }
      return m;
    });
    if (!updated) throw new Error(`Member ${memberId} not found in studio ${studioId}`);
    TenantStore.set(studioId, 'members', newList);
    return updated;
  }
};
