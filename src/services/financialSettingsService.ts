import { FinancialSettings, FinancialSettingsSchema } from '../types/schema';
import { TenantStore } from './tenantStore';
import { auditService } from './auditService';
import { firestoreService } from './firestoreService';

export const DEFAULT_FINANCIAL_SETTINGS: Omit<FinancialSettings, 'studioId'> = {
  legalName: '',
  businessAddress: '',
  gstin: '',
  pan: '',
  state: '',
  country: 'India',
  currency: 'INR',
  currencySymbol: '₹',
  invoicePrefix: 'INV',
  quotationPrefix: 'QUO',
  receiptPrefix: 'REC',
  creditNotePrefix: 'CRN',
  refundPrefix: 'REF',
  expensePrefix: 'EXP',
  fyStartMonth: 4, // April
  defaultCgstRate: 9,
  defaultSgstRate: 9,
  defaultIgstRate: 18,
  defaultPaymentTerms: 'Due on Receipt',
  invoiceFooter: 'Thank you for choosing us!',
  termsAndConditions: '',
  defaultDiscountPercent: 0,
  rounding: true,
  brandAccentColor: '#09090b'
};

export class FinancialSettingsService {
  getSettings(studioId: string): FinancialSettings {
    if (!studioId) throw new Error('[financialSettingsService.getSettings]: studioId is required');
    const existing = TenantStore.get<FinancialSettings>(studioId, 'financialSettings');
    if (existing.length > 0) {
      return existing[0];
    }

    const studioProfile = TenantStore.getSingle<any>(studioId, 'profile');
    const initial: FinancialSettings = {
      studioId,
      ...DEFAULT_FINANCIAL_SETTINGS,
      legalName: studioProfile?.name || '',
      businessAddress: [studioProfile?.address, studioProfile?.city, studioProfile?.state].filter(Boolean).join(', '),
      gstin: studioProfile?.gstNumber || '',
      state: studioProfile?.state || '',
      updatedAt: new Date().toISOString()
    };
    TenantStore.set(studioId, 'financialSettings', [initial]);
    return initial;
  }

  updateSettings(
    studioId: string, 
    updates: Partial<FinancialSettings>, 
    operatorId: string = 'system'
  ): FinancialSettings {
    if (!studioId) throw new Error('[financialSettingsService.updateSettings]: studioId is required');
    const current = this.getSettings(studioId);
    const updated: FinancialSettings = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    FinancialSettingsSchema.parse(updated);
    TenantStore.set(studioId, 'financialSettings', [updated]);
    firestoreService.saveDocument(studioId, 'financialSettings', 'settings', updated).catch(() => {});

    auditService.log(
      studioId,
      operatorId,
      'UPDATE_FINANCIAL_SETTINGS',
      'financialSettings',
      studioId,
      { updatedFields: Object.keys(updates) }
    );

    return updated;
  }

  /**
   * Generates unique, concurrency-safe document numbers with year and sequential digits:
   * e.g., QUO-2026-000001, INV-2026-000001, REC-2026-000001
   * Never reuses deleted or cancelled document numbers.
   */
  generateDocumentNumber(
    studioId: string, 
    type: 'QUO' | 'INV' | 'REC' | 'CRN' | 'REF' | 'EXP'
  ): string {
    const settings = this.getSettings(studioId);
    const currentYear = new Date().getFullYear();

    let prefix = settings.invoicePrefix;
    if (type === 'QUO') prefix = settings.quotationPrefix || 'QUO';
    else if (type === 'INV') prefix = settings.invoicePrefix || 'INV';
    else if (type === 'REC') prefix = settings.receiptPrefix || 'REC';
    else if (type === 'CRN') prefix = settings.creditNotePrefix || 'CRN';
    else if (type === 'REF') prefix = settings.refundPrefix || 'REF';
    else if (type === 'EXP') prefix = settings.expensePrefix || 'EXP';

    const counterKey = `doc_seq_${type}_${currentYear}`;
    const currentCount = TenantStore.getSingle<number>(studioId, counterKey) || 0;
    const nextCount = currentCount + 1;
    TenantStore.set(studioId, counterKey, nextCount);

    const formattedSeq = String(nextCount).padStart(6, '0');
    return `${prefix}-${currentYear}-${formattedSeq}`;
  }

  /**
   * India-specific GST and tax calculations:
   * Checks intra-state (CGST + SGST) vs inter-state (IGST) vs tax-exempt.
   */
  calculateTaxes(
    studioIdOrSubtotal: string | number,
    subtotalOrDiscount: number = 0,
    discountOrTaxRate: number = 0,
    clientStateOrInterState?: string | boolean,
    isTaxExempt: boolean = false
  ) {
    let subtotal = 0;
    let discountAmount = 0;
    let taxRatePercent = 18;
    let isInterState = false;

    if (typeof studioIdOrSubtotal === 'string') {
      const studioId = studioIdOrSubtotal;
      subtotal = subtotalOrDiscount;
      discountAmount = discountOrTaxRate;
      const settings = this.getSettings(studioId);
      const studioState = settings.state || 'Maharashtra';
      const clientState = typeof clientStateOrInterState === 'string' ? clientStateOrInterState : studioState;
      isInterState = clientState.toLowerCase() !== studioState.toLowerCase();
    } else {
      subtotal = studioIdOrSubtotal;
      discountAmount = subtotalOrDiscount;
      taxRatePercent = discountOrTaxRate > 0 ? discountOrTaxRate : 18;
      isInterState = Boolean(clientStateOrInterState);
    }

    const taxableAmount = Math.max(0, subtotal - discountAmount);

    if (isTaxExempt || taxRatePercent <= 0) {
      return {
        subtotal,
        discountAmount,
        taxableAmount,
        cgstRate: 0,
        cgstAmount: 0,
        sgstRate: 0,
        sgstAmount: 0,
        igstRate: 0,
        igstAmount: 0,
        totalTax: 0,
        grandTotal: taxableAmount
      };
    }

    if (isInterState) {
      const igstAmount = Math.round((taxableAmount * taxRatePercent) / 100);
      return {
        subtotal,
        discountAmount,
        taxableAmount,
        cgstRate: 0,
        cgstAmount: 0,
        sgstRate: 0,
        sgstAmount: 0,
        igstRate: taxRatePercent,
        igstAmount,
        totalTax: igstAmount,
        grandTotal: taxableAmount + igstAmount
      };
    }

    // Intra-state (equal split between CGST and SGST)
    const halfRate = taxRatePercent / 2;
    const cgstAmount = Math.round((taxableAmount * halfRate) / 100);
    const sgstAmount = Math.round((taxableAmount * halfRate) / 100);
    const totalTax = cgstAmount + sgstAmount;

    return {
      subtotal,
      discountAmount,
      taxableAmount,
      cgstRate: halfRate,
      cgstAmount,
      sgstRate: halfRate,
      sgstAmount,
      igstRate: 0,
      igstAmount: 0,
      totalTax,
      grandTotal: taxableAmount + totalTax
    };
  }
}

export const financialSettingsService = new FinancialSettingsService();
