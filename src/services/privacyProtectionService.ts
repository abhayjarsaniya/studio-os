import { TenantStore } from './tenantStore';
import { Customer, StudioEvent } from '../types';
import { CustomerPrivacyPolicy, CustomerPrivacyPolicySchema } from '../types/schema';

export class PrivacyProtectionService {
  private readonly POLICY_STORE = 'customer_privacy_policy';

  getPolicy(studioId: string): CustomerPrivacyPolicy {
    const existing = TenantStore.getSingle<CustomerPrivacyPolicy>(studioId, this.POLICY_STORE);
    if (existing) return existing;

    const defaultPolicy: CustomerPrivacyPolicy = {
      studioId,
      maskCustomerNamesForNonOwners: true,
      allowedRolesForCustomerData: ['owner', 'Studio Owner', 'manager', 'Receptionist'],
      allowedRolesForFinancials: ['owner', 'Studio Owner', 'Accountant'],
      updatedAt: new Date().toISOString()
    };
    TenantStore.set(studioId, this.POLICY_STORE, defaultPolicy);
    return defaultPolicy;
  }

  updatePolicy(studioId: string, updates: Partial<CustomerPrivacyPolicy>): CustomerPrivacyPolicy {
    const current = this.getPolicy(studioId);
    const updated: CustomerPrivacyPolicy = CustomerPrivacyPolicySchema.parse({
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    });
    TenantStore.set(studioId, this.POLICY_STORE, updated);
    return updated;
  }

  /**
   * Evaluates if a role can see full customer identity (real name, phone, email).
   */
  canRoleViewCustomerDetails(studioId: string, roleNameOrId: string): boolean {
    if (!roleNameOrId) return false;
    const lower = roleNameOrId.toLowerCase();
    if (lower === 'owner' || lower.includes('owner') || lower === 'admin' || lower === 'super admin') {
      return true;
    }

    const policy = this.getPolicy(studioId);
    if (!policy.maskCustomerNamesForNonOwners) {
      return true;
    }

    return policy.allowedRolesForCustomerData.some(r => r.toLowerCase() === lower);
  }

  /**
   * Evaluates if a role can view financial metrics and amounts.
   */
  canRoleViewFinancials(studioId: string, roleNameOrId: string): boolean {
    if (!roleNameOrId) return false;
    const lower = roleNameOrId.toLowerCase();
    if (lower === 'owner' || lower.includes('owner') || lower === 'super admin') {
      return true;
    }

    const policy = this.getPolicy(studioId);
    return policy.allowedRolesForFinancials.some(r => r.toLowerCase() === lower);
  }

  /**
   * Sanitizes customer record for non-owner viewing.
   */
  filterCustomerForUser(studioId: string, customer: Customer, roleNameOrId: string): Customer {
    if (!customer) return customer;
    if (this.canRoleViewCustomerDetails(studioId, roleNameOrId)) {
      return customer;
    }

    // Generate masked client code
    const rawDigits = customer.id.replace(/\D/g, '');
    const clientCode = rawDigits.length >= 3 ? rawDigits.slice(-3) : '001';
    const maskedName = `Client #${clientCode}`;

    return {
      ...customer,
      name: maskedName,
      company: customer.company ? 'Client Company (Protected)' : undefined,
      email: '••••••••@client.protected',
      phone: '+91 ••••• •••' + (customer.phone?.slice(-2) || '00'),
      alternatePhone: undefined,
      address: 'Client Address Protected by Studio Policy',
      city: customer.city || 'Gujarat',
      notes: '[Client Notes Protected - Studio Owner Access Only]'
    };
  }

  /**
   * Sanitizes event record for non-owner viewing.
   * If customer name is hidden, masks customerName and customerContact.
   */
  filterEventForUser(studioId: string, event: StudioEvent, roleNameOrId: string): StudioEvent {
    if (!event) return event;
    const canSeeCustomer = this.canRoleViewCustomerDetails(studioId, roleNameOrId);
    const canSeeFinances = this.canRoleViewFinancials(studioId, roleNameOrId);

    const cloned = { ...event };

    if (!canSeeCustomer) {
      const rawDigits = (event.customerId || event.id).replace(/\D/g, '');
      const clientCode = rawDigits.length >= 3 ? rawDigits.slice(-3) : '001';
      cloned.customerName = `Client #${clientCode}`;
      if (cloned.customerPhone) {
        cloned.customerPhone = '+91 ••••• •••' + (cloned.customerPhone.slice(-2) || '00');
      }
      if ((cloned as any).customerContact) {
        (cloned as any).customerContact = '+91 ••••• •••' + ((cloned as any).customerContact?.slice(-2) || '00');
      }
    }

    if (!canSeeFinances) {
      if ((cloned as any).budget !== undefined) {
        (cloned as any).budget = 0;
      }
      if ((cloned as any).totalAmount !== undefined) {
        (cloned as any).totalAmount = 0;
      }
      if ((cloned as any).paidAmount !== undefined) {
        (cloned as any).paidAmount = 0;
      }
    }

    return cloned;
  }
}

export const privacyProtectionService = new PrivacyProtectionService();
