import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  resolveEffectivePermissions,
  liveRbacService,
  getDefaultRoleTemplate
} from '../services/liveRbacService';
import {
  checkBundlePermission,
  sanitizeRecordByPermissions,
  ServerPermissionsBundle
} from '../../api/_lib/rbacServer';
import fs from 'node:fs';
import path from 'node:path';

describe('Master Admin RBAC — Studio Isolation & Unrestricted Studio Owner', () => {
  afterEach(() => {
    liveRbacService.setActiveBundle(null);
  });

  it('allows Master Admin to restrict Studio Owner permissions in Studio A without affecting Studio B', () => {
    const studioAOwnerRole = getDefaultRoleTemplate('studio_owner');
    studioAOwnerRole.permissions.customers_crm = {
      ...studioAOwnerRole.permissions.customers_crm,
      create: false
    };

    const studioBOwnerRole = getDefaultRoleTemplate('studio_owner');

    const bundleA = resolveEffectivePermissions({
      studioId: 'studio_A',
      uid: 'owner_A',
      roleId: 'studio_owner',
      studioRole: studioAOwnerRole
    });

    const bundleB = resolveEffectivePermissions({
      studioId: 'studio_B',
      uid: 'owner_B',
      roleId: 'studio_owner',
      studioRole: studioBOwnerRole
    });

    expect(bundleA.permissions.customers_crm.create).toBe(false);
    expect(bundleB.permissions.customers_crm.create).toBe(true);

    // Re-enable in Studio A
    studioAOwnerRole.permissions.customers_crm.create = true;
    const bundleAReEnabled = resolveEffectivePermissions({
      studioId: 'studio_A',
      uid: 'owner_A',
      roleId: 'studio_owner',
      studioRole: studioAOwnerRole
    });
    expect(bundleAReEnabled.permissions.customers_crm.create).toBe(true);
  });

  it('liveRbacService reflects active bundle immediately for Studio Owner and Employees', () => {
    const ownerRole = getDefaultRoleTemplate('studio_owner');
    ownerRole.permissions.invoices_billing = {
      ...ownerRole.permissions.invoices_billing,
      view_financials: true,
      edit_financials: false
    };

    const bundle = resolveEffectivePermissions({
      studioId: 'studio_A',
      uid: 'owner_A',
      roleId: 'studio_owner',
      studioRole: ownerRole
    });

    liveRbacService.setActiveBundle(bundle);
    expect(liveRbacService.canFromActiveBundle('invoices', 'view_financials')).toBe(true);
    expect(liveRbacService.canFromActiveBundle('invoices', 'edit_financials')).toBe(false);
  });
});

describe('Master Admin RBAC — Precedence & Individual User Overrides', () => {
  it('applies individual user allow and deny independently over studio role defaults', () => {
    const photoRole = getDefaultRoleTemplate('photographer');

    const empABundle = resolveEffectivePermissions({
      studioId: 'studio_A',
      uid: 'emp_A',
      roleId: 'photographer',
      studioRole: photoRole,
      userOverride: {
        uid: 'emp_A',
        studioId: 'studio_A',
        roleId: 'photographer',
        permissions: { quotations: { create: true } },
        updatedAt: new Date().toISOString()
      }
    });

    const empBBundle = resolveEffectivePermissions({
      studioId: 'studio_A',
      uid: 'emp_B',
      roleId: 'photographer',
      studioRole: photoRole,
      userOverride: {
        uid: 'emp_B',
        studioId: 'studio_A',
        roleId: 'photographer',
        permissions: { events: { view: false } },
        updatedAt: new Date().toISOString()
      }
    });

    expect(empABundle.permissions.quotations.create).toBe(true);
    expect(empABundle.permissions.events.view).toBe(true);

    expect(empBBundle.permissions.quotations.create).toBe(false);
    expect(empBBundle.permissions.events.view).toBe(false);
  });

  it('blocks all access immediately when user is deactivated (Platform Security Restriction)', () => {
    const bundle = resolveEffectivePermissions({
      studioId: 'studio_A',
      uid: 'emp_A',
      roleId: 'studio_owner',
      isDeactivated: true,
      userOverride: {
        uid: 'emp_A',
        studioId: 'studio_A',
        roleId: 'studio_owner',
        permissions: { customers_crm: { view: true, create: true } },
        updatedAt: new Date().toISOString()
      }
    });

    expect(bundle.permissions.customers_crm.view).toBe(false);
    expect(bundle.permissions.customers_crm.create).toBe(false);
    liveRbacService.setActiveBundle(bundle);
    expect(liveRbacService.canFromActiveBundle('customers', 'view')).toBe(false);
    liveRbacService.setActiveBundle(null);
  });
});

describe('Server-Side RBAC Enforcement & Field Stripping', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('strips financial and PII fields when view_financials or view_client_pii is disabled', () => {
    const bundle: ServerPermissionsBundle = {
      uid: 'emp_1',
      studioId: 'studio_A',
      roleId: 'photographer',
      isDeactivated: false,
      isMasterAdmin: false,
      permissions: {
        customers_crm: {
          view: true,
          view_client_pii: false,
          view_financials: false
        }
      },
      scopes: { customers_crm: 'assigned_only' },
      fieldAccess: {
        'customers_crm.phone': { visible: false, editable: false },
        'customers_crm.email': { visible: false, editable: false }
      }
    };

    const rawCustomer = {
      id: 'cust_1',
      name: 'Rohan & Priya',
      phone: '+91 98765 43210',
      email: 'rohan@example.com',
      address: 'Ahmedabad',
      totalAmount: 150000,
      advancePaid: 50000
    };

    const sanitized = sanitizeRecordByPermissions(rawCustomer, 'customers_crm', bundle);
    expect(sanitized.id).toBe('cust_1');
    expect(sanitized.name).toBe('Rohan & Priya');
    expect(sanitized.phone).toBeUndefined();
    expect(sanitized.email).toBeUndefined();
    expect(sanitized.address).toBeUndefined();
    expect(sanitized.totalAmount).toBeUndefined();
    expect(sanitized.advancePaid).toBeUndefined();
  });

  it('checkBundlePermission enforces edit_financials independently of view_financials', () => {
    const bundle: ServerPermissionsBundle = {
      uid: 'owner_1',
      studioId: 'studio_A',
      roleId: 'studio_owner',
      isDeactivated: false,
      isMasterAdmin: false,
      permissions: {
        invoices_billing: {
          view: true,
          view_financials: true,
          edit_financials: false
        }
      },
      scopes: { invoices_billing: 'all' },
      fieldAccess: {}
    };

    expect(checkBundlePermission(bundle, 'invoices_billing', 'view_financials')).toBe(true);
    expect(checkBundlePermission(bundle, 'invoices_billing', 'edit_financials')).toBe(false);
  });

  it('api/rbac/enforce returns 403 when permission is denied', async () => {
    vi.doMock('../../api/_lib/razorpayServer', () => ({
      verifyFirebaseCaller: vi.fn().mockResolvedValue({
        uid: 'owner_A',
        email: 'ownerA@studio-os.internal',
        isMasterAdmin: false,
        studioId: 'studio_A'
      }),
      getFirebaseAdmin: vi.fn().mockReturnValue(null)
    }));
    vi.doMock('../../api/_lib/rbacServer', async () => {
      const actual = await vi.importActual<any>('../../api/_lib/rbacServer');
      return {
        ...actual,
        resolveServerPermissions: vi.fn().mockResolvedValue({
          uid: 'owner_A',
          studioId: 'studio_A',
          roleId: 'studio_owner',
          isDeactivated: false,
          isMasterAdmin: false,
          permissions: {
            customers_crm: { view: true, create: false }
          },
          scopes: { customers_crm: 'all' },
          fieldAccess: {}
        })
      };
    });

    const { default: enforceHandler } = await import('../../api/rbac/enforce');
    const res: any = {
      headers: {},
      statusCode: 200,
      body: null,
      setHeader(k: string, v: string) { this.headers[k] = v; },
      status(code: number) { this.statusCode = code; return this; },
      json(data: any) { this.body = data; return this; }
    };

    await enforceHandler(
      { method: 'POST', body: { studioId: 'studio_A', moduleId: 'customers_crm', actionId: 'create' } },
      res
    );
    expect(res.statusCode).toBe(403);
    expect(res.body.allowed).toBe(false);
  });
});

describe('MasterRolesPermissionsPage — Unrestricted & Mobile Structure', () => {
  it('does not lock studio_owner checkboxes and provides dedicated mobile expandable UI', () => {
    const content = fs.readFileSync(
      path.resolve(process.cwd(), 'src/pages/master/MasterRolesPermissionsPage.tsx'),
      'utf8'
    );
    expect(content).not.toContain('Studio Owner role permissions cannot be reduced');
    expect(content).toContain('md:hidden');
    expect(content).toContain('hidden md:block');
    expect(content).not.toMatch(/text-\[1[01]px\]/);
  });
});
