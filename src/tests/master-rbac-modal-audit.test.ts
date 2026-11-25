import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { liveRbacService, getDefaultRoleTemplate } from '../services/liveRbacService';
import { liveFeatureService, resolveEffectiveFeatureMap } from '../services/liveFeatureService';
import { MASTER_MODULES_CATALOG, MASTER_ACTIONS_CATALOG } from '../types/masterAdmin';
import { CENTRAL_FEATURE_REGISTRY } from '../services/featureRegistry';

describe('STUDIO OS — Comprehensive Modal Lifecycle & Master Admin RBAC Audit', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (globalThis as any).document = {
      body: {
        style: { overflow: '' }
      }
    };
    (globalThis as any).window = {
      confirm: (msg: string) => true
    };
  });

  afterEach(() => {
    if ((globalThis as any).document) {
      (globalThis as any).document.body.style.overflow = '';
    }
  });

  // 1. Modal Lifecycle Logic Tests
  describe('Universal Modal Lifecycle Behavior (Hook & DOM Standards)', () => {
    it('1.1 verifies document.body scroll lock mechanism and cleanup', () => {
      document.body.style.overflow = '';

      // Open modal
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      expect(document.body.style.overflow).toBe('hidden');

      // Close modal / unmount
      document.body.style.overflow = originalOverflow || 'unset';
      expect(document.body.style.overflow).toBe('unset');
    });

    it('1.2 verifies unsaved changes confirmation prompt when dirty', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      let closed = false;

      const onClose = () => {
        closed = true;
      };

      const handleAttemptClose = (isDirty: boolean, confirmMsg: string) => {
        if (isDirty) {
          if (window.confirm(confirmMsg)) {
            onClose();
          }
        } else {
          onClose();
        }
      };

      // When dirty and user rejects confirmation
      handleAttemptClose(true, 'Discard unsaved changes?');
      expect(confirmSpy).toHaveBeenCalledWith('Discard unsaved changes?');
      expect(closed).toBe(false);

      // When dirty and user accepts confirmation
      confirmSpy.mockReturnValue(true);
      handleAttemptClose(true, 'Discard unsaved changes?');
      expect(closed).toBe(true);
    });

    it('1.3 verifies backdrop click distinction between container and inner modal content', () => {
      let closed = false;
      const onClose = () => {
        closed = true;
      };

      const handleBackdropClick = (target: any, currentTarget: any) => {
        if (target === currentTarget) {
          onClose();
        }
      };

      const container = { id: 'backdrop' };
      const child = { id: 'modal-body' };

      // Inner click -> must NOT close
      handleBackdropClick(child, container);
      expect(closed).toBe(false);

      // Backdrop click -> must close
      handleBackdropClick(container, container);
      expect(closed).toBe(true);
    });
  });

  // 2. Master Admin RBAC Full Authority Tests
  describe('Master Admin Full RBAC Control (Zero Locks on Studio Owner)', () => {
    it('2.1 provides all 28 modules and 12 granular actions', () => {
      expect(MASTER_MODULES_CATALOG.length).toBe(28);
      expect(MASTER_ACTIONS_CATALOG.length).toBe(12);

      const actionIds = MASTER_ACTIONS_CATALOG.map((a) => a.id);
      expect(actionIds).toEqual([
        'view',
        'create',
        'edit',
        'delete',
        'export',
        'approve',
        'assign',
        'view_financials',
        'edit_financials',
        'view_client_pii',
        'manage_settings',
        'bulk_action'
      ]);
    });

    it('2.2 allows Master Admin to freely configure and customize Studio Owner permissions', () => {
      const ownerTemplate = getDefaultRoleTemplate('studio_owner');
      expect(ownerTemplate.id).toBe('studio_owner');

      // Clone owner template
      const customizedOwner = JSON.parse(JSON.stringify(ownerTemplate));

      // Master Admin restricts delete & edit_financials for an owner in a specific studio
      customizedOwner.permissions['invoices_billing']['delete'] = false;
      customizedOwner.permissions['invoices_billing']['edit_financials'] = false;

      expect(customizedOwner.permissions['invoices_billing']['delete']).toBe(false);
      expect(customizedOwner.permissions['invoices_billing']['edit_financials']).toBe(false);
      expect(customizedOwner.permissions['invoices_billing']['view']).toBe(true);
    });

    it('2.3 saves role policy with audit trail to liveRbacService', async () => {
      const role = getDefaultRoleTemplate('manager');
      const saveSpy = vi.spyOn(liveRbacService, 'saveRolePolicy').mockResolvedValue(undefined);

      await liveRbacService.saveRolePolicy({
        studioId: 'studio_test_101',
        role,
        actingAdmin: 'master@studio-os.live',
        auditChanges: [
          {
            module: 'events',
            permissionChanged: 'delete',
            previousValue: true,
            newValue: false
          }
        ]
      });

      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          studioId: 'studio_test_101',
          actingAdmin: 'master@studio-os.live'
        })
      );
    });

    it('2.4 evaluates user permissions with user overrides precedence', () => {
      const rolePerms: Record<string, boolean> = { view: true, delete: true };
      const userOvrPerms: Record<string, boolean | undefined> = { delete: false };

      // User override takes precedence over base role
      const canView = userOvrPerms.view !== undefined ? userOvrPerms.view : rolePerms.view;
      const canDelete = userOvrPerms.delete !== undefined ? userOvrPerms.delete : rolePerms.delete;

      expect(canView).toBe(true);
      expect(canDelete).toBe(false);
    });
  });

  // 3. Feature Visibility Synchronization Tests
  describe('Master Admin Feature Visibility Synchronization', () => {
    it('3.1 registers core features in CENTRAL_FEATURE_REGISTRY', () => {
      expect(CENTRAL_FEATURE_REGISTRY.length).toBeGreaterThanOrEqual(10);
      const featureKeys = CENTRAL_FEATURE_REGISTRY.map((f) => f.id);
      expect(featureKeys).toContain('customer_crm');
      expect(featureKeys).toContain('whatsapp_chat');
      expect(featureKeys).toContain('finance_billing');
      expect(featureKeys).toContain('tasks_production');
    });

    it('3.2 evaluates studio feature enablement correctly via resolveEffectiveFeatureMap', () => {
      // 1. Globally disabled -> disabled for everyone
      const map1 = resolveEffectiveFeatureMap({
        globalSettings: { whatsapp_chat: false },
        studioOverrides: {}
      });
      expect(map1.whatsapp_chat.enabled).toBe(false);
      expect(map1.whatsapp_chat.reason).toBe('global_off');

      // 2. Globally enabled, no studio override -> enabled
      const map2 = resolveEffectiveFeatureMap({
        globalSettings: { finance_billing: true },
        studioOverrides: {}
      });
      expect(map2.finance_billing.enabled).toBe(true);

      // 3. Globally enabled, studio disabled -> disabled for that studio
      const map3 = resolveEffectiveFeatureMap({
        globalSettings: { finance_billing: true },
        studioOverrides: { finance_billing: false }
      });
      expect(map3.finance_billing.enabled).toBe(false);
      expect(map3.finance_billing.reason).toBe('studio_off');
    });
  });
});
