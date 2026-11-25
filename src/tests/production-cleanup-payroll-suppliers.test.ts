import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateNetPayable,
  buildDeterministicPayrollId
} from '../services/livePayrollService';
import { normalizePhone } from '../services/liveSupplierService';
import { studioService } from '../services/studioService';
import fs from 'node:fs';
import path from 'node:path';

describe('Production Data Cleanup — No Shreeji or Demo Seeding in Production', () => {
  it('MasterPayrollPage does not hardcode studio_shreeji_films or seed fake payroll', () => {
    const content = fs.readFileSync(
      path.resolve(process.cwd(), 'src/pages/master/MasterPayrollPage.tsx'),
      'utf8'
    );
    expect(content).not.toContain('studio_shreeji_films');
    expect(content).not.toContain('SAL_HDFC_');
    expect(content).toContain('livePayrollService.subscribeAllStudiosPayroll');
  });

  it('MasterSuppliersPage does not hardcode studio_shreeji_films or seed demo suppliers', () => {
    const content = fs.readFileSync(
      path.resolve(process.cwd(), 'src/pages/master/MasterSuppliersPage.tsx'),
      'utf8'
    );
    expect(content).not.toContain('studio_shreeji_films');
    expect(content).not.toContain('Apex Cinematic Cranes');
    expect(content).not.toContain('Royal Luxe Album Labs');
    expect(content).not.toContain('Drone Works');
    expect(content).toContain('No suppliers added yet.');
    expect(content).toContain('liveSupplierService.subscribeAllStudiosSuppliers');
  });

  it('SuppliersPage uses liveSupplierService and shows empty state without fake data', () => {
    const content = fs.readFileSync(
      path.resolve(process.cwd(), 'src/pages/SuppliersPage.tsx'),
      'utf8'
    );
    expect(content).toContain('liveSupplierService.subscribeStudioSuppliers');
    expect(content).toContain('No suppliers added yet.');
  });

  it('studioService guards shreejiStudio behind isTestEnv', () => {
    const content = fs.readFileSync(
      path.resolve(process.cwd(), 'src/services/studioService.ts'),
      'utf8'
    );
    expect(content).toContain('if (isTestEnv)');
    // In test env, studioService still works for legacy tests
    expect(Array.isArray(studioService.listStudios())).toBe(true);
  });
});

describe('Payroll Calculations & Duplicate Prevention', () => {
  it('calculates Net Payable = Base Salary + Bonus + Incentives - Deductions', () => {
    expect(
      calculateNetPayable({
        baseSalary: 40000,
        bonus: 5000,
        incentives: 2500,
        deductions: 1500
      })
    ).toBe(46000);

    // Clamps negative net payable to 0
    expect(
      calculateNetPayable({
        baseSalary: 5000,
        bonus: 0,
        incentives: 0,
        deductions: 8000
      })
    ).toBe(0);
  });

  it('generates deterministic payroll document IDs per employee and month to prevent duplicates', () => {
    const id1 = buildDeterministicPayrollId('emp_abc_1', '2026-11');
    const id2 = buildDeterministicPayrollId('emp_abc_1', '2026-11');
    const id3 = buildDeterministicPayrollId('emp_abc_1', '2026-12');
    expect(id1).toBe('pay_emp_abc_1_2026-11');
    expect(id1).toBe(id2);
    expect(id1).not.toBe(id3);
  });
});

describe('Supplier Phone Normalization & Duplicate Prevention', () => {
  it('normalizes 10-digit Indian mobile numbers consistently', () => {
    expect(normalizePhone('+91 98250-11223')).toBe('9825011223');
    expect(normalizePhone('09825011223')).toBe('9825011223');
    expect(normalizePhone('98250 11223')).toBe('9825011223');
  });
});
