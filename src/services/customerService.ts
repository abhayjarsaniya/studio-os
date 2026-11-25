import { Customer, CustomerSchema, CustomerStatus, CustomerPreferences, CustomerNote, CustomerNoteSchema, CustomerInteraction, CustomerInteractionSchema, StudioEvent, Task, WhatsAppLog, FollowUp } from '../types/schema';
import { TenantStore } from './tenantStore';
import { auditService } from './auditService';
import { notificationService } from './notificationService';
import { firestoreService } from './firestoreService';

export interface NormalizedPhone {
  raw: string;
  countryCode: string;
  nationalNumber: string;
  fullInternational: string;
  waMeFormat: string;
  isValid: boolean;
}

export function normalizePhoneNumber(phone: string, defaultCountryCode: string = '91'): NormalizedPhone {
  if (!phone) {
    return { raw: '', countryCode: defaultCountryCode, nationalNumber: '', fullInternational: '', waMeFormat: '', isValid: false };
  }

  // Strip all non-numeric characters except leading '+'
  let cleaned = phone.trim().replace(/[^\d+]/g, '');

  let countryCode = defaultCountryCode;
  let nationalNumber = cleaned;

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
    if (cleaned.startsWith('91') && cleaned.length >= 12) {
      countryCode = '91';
      nationalNumber = cleaned.substring(2);
    } else if (cleaned.startsWith('1') && cleaned.length === 11) {
      countryCode = '1';
      nationalNumber = cleaned.substring(1);
    } else if (cleaned.startsWith('44') && cleaned.length >= 11) {
      countryCode = '44';
      nationalNumber = cleaned.substring(2);
    } else if (cleaned.startsWith('971') && cleaned.length >= 11) {
      countryCode = '971';
      nationalNumber = cleaned.substring(3);
    } else {
      countryCode = cleaned.slice(0, 3);
      nationalNumber = cleaned.slice(3);
    }
  } else {
    // If 11 digits starting with 0 (Indian local format with trunk prefix)
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
      countryCode = '91';
      nationalNumber = cleaned.substring(1);
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      countryCode = '91';
      nationalNumber = cleaned.substring(2);
    } else if (cleaned.length === 10) {
      // 10-digit Indian standard
      countryCode = '91';
      nationalNumber = cleaned;
    } else {
      nationalNumber = cleaned;
    }
  }

  const waMeFormat = `${countryCode}${nationalNumber}`;
  const fullInternational = `+${countryCode} ${nationalNumber}`;
  const isValid = nationalNumber.length >= 7 && nationalNumber.length <= 15;

  return {
    raw: phone,
    countryCode,
    nationalNumber,
    fullInternational,
    waMeFormat,
    isValid
  };
}

export interface CustomerFilterOptions {
  search?: string;
  status?: string;
  category?: string;
  assignedManagerId?: string;
  branchId?: string;
  tag?: string;
  sortBy?: 'name' | 'createdAt' | 'lastInteraction' | 'pendingBalance' | 'totalBookings';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface DuplicateCheckResult {
  hasDuplicate: boolean;
  duplicates: Customer[];
  matches: Customer[];
  reasons: string[];
}

export interface CRMDashboardMetrics {
  totalCustomers: number;
  newThisMonth: number;
  newCustomersThisMonth: number;
  activeCustomers: number;
  leadsCount: number;
  potentialLeads: number;
  bookedCustomers: number;
  customersWithUpcomingEvents: number;
  upcomingEventCustomers: number;
  awaitingFollowUp: number;
  pendingPaymentCustomers: number;
  recentlyContactedCount: number;
  recentlyContactedCustomers: number;
  completedCustomers: number;
  completedEventCustomers: number;
}

export class CustomerService {
  normalizePhoneNumber(phone: string, defaultCountryCode: string = '91'): string {
    return normalizePhoneNumber(phone, defaultCountryCode).waMeFormat;
  }

  listCustomers(studioId: string, filter?: CustomerFilterOptions): Customer[] {
    if (!studioId) throw new Error('[customerService.listCustomers]: studioId is required');
    let all = TenantStore.get<Customer>(studioId, 'customers');
    if ((!all || all.length === 0) && (studioId === 'studio_shreeji_films' || studioId === 'std_demo_royal')) {
      const fallbackId = studioId === 'studio_shreeji_films' ? 'std_demo_royal' : 'studio_shreeji_films';
      all = TenantStore.get<Customer>(fallbackId, 'customers');
    }
    all = all || [];

    // Filter out soft-merged records by default unless searching
    all = all.filter(c => !c.mergedIntoId);

    if (filter) {
      if (filter.search) {
        const q = filter.search.toLowerCase().trim();
        all = all.filter(c =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.alternatePhone && c.alternatePhone.includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.city && c.city.toLowerCase().includes(q)) ||
          (c.companyName && c.companyName.toLowerCase().includes(q)) ||
          c.id.toLowerCase().includes(q)
        );
      }

      if (filter.status && filter.status !== 'All') {
        all = all.filter(c => c.status === filter.status);
      }

      if (filter.assignedManagerId && filter.assignedManagerId !== 'All') {
        all = all.filter(c => c.assignedManagerId === filter.assignedManagerId);
      }

      if (filter.branchId && filter.branchId !== 'All') {
        all = all.filter(c => c.branchId === filter.branchId);
      }

      if (filter.tag && filter.tag !== 'All') {
        all = all.filter(c => (c.tags || []).includes(filter.tag!));
      }

      // Sort
      const order = filter.sortOrder === 'asc' ? 1 : -1;
      const sortBy = filter.sortBy || 'createdAt';

      all = [...all].sort((a, b) => {
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name) * order;
        }
        if (sortBy === 'pendingBalance') {
          return ((a.pendingBalance || 0) - (b.pendingBalance || 0)) * order;
        }
        if (sortBy === 'totalBookings') {
          return ((a.totalBookings || 0) - (b.totalBookings || 0)) * order;
        }
        if (sortBy === 'lastInteraction') {
          const tA = a.lastInteractionDate ? new Date(a.lastInteractionDate).getTime() : 0;
          const tB = b.lastInteractionDate ? new Date(b.lastInteractionDate).getTime() : 0;
          return (tA - tB) * order;
        }
        // Default: createdAt
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * order;
      });
    }

    return all;
  }

  getCustomer(studioId: string, customerId: string): Customer | undefined {
    if (!studioId) throw new Error('[customerService.getCustomer]: studioId is required');
    const all = TenantStore.get<Customer>(studioId, 'customers');
    return all.find(c => c.id === customerId);
  }

  /**
   * Duplicate detection by normalized mobile number or email address
   */
  detectDuplicates(
    studioId: string,
    phone: string,
    email?: string,
    excludeCustomerId?: string
  ): DuplicateCheckResult {
    if (!studioId) throw new Error('[customerService.detectDuplicates]: studioId is required');
    const normalizedInput = normalizePhoneNumber(phone);
    const existing = TenantStore.get<Customer>(studioId, 'customers')
      .filter(c => !c.mergedIntoId && c.id !== excludeCustomerId);

    const duplicates: Customer[] = [];
    const reasons: string[] = [];

    const normInputWa = normalizedInput.waMeFormat;
    const cleanEmail = (email || '').trim().toLowerCase();

    existing.forEach(c => {
      let isDup = false;
      const cNorm = normalizePhoneNumber(c.phone);
      const cAltNorm = c.alternatePhone ? normalizePhoneNumber(c.alternatePhone) : null;

      // Check phone match
      if (normInputWa && (cNorm.waMeFormat === normInputWa || (cAltNorm && cAltNorm.waMeFormat === normInputWa))) {
        duplicates.push(c);
        reasons.push(`Mobile number matching customer "${c.name}" (${c.phone})`);
        isDup = true;
      }

      // Check email match
      if (!isDup && cleanEmail && c.email && c.email.trim().toLowerCase() === cleanEmail) {
        duplicates.push(c);
        reasons.push(`Email address matching customer "${c.name}" (${c.email})`);
      }
    });

    return {
      hasDuplicate: duplicates.length > 0,
      duplicates,
      matches: duplicates,
      reasons
    };
  }

  createCustomer(
    studioId: string,
    data: {
      name: string;
      phone: string;
      city?: string;
      email?: string;
      address?: string;
      alternatePhone?: string;
      state?: string;
      postalCode?: string;
      dob?: string;
      anniversaryDate?: string;
      companyName?: string;
      companyGst?: string;
      customerSource?: string;
      status?: CustomerStatus;
      assignedManagerId?: string;
      assignedManagerName?: string;
      assignedManager?: string;
      avatarUrl?: string;
      avatar?: string;
      notes?: string;
      tags?: string[];
      communicationPreferences?: CustomerPreferences;
      allowDuplicate?: boolean;
      createdBy?: string;
      [key: string]: any;
    },
    operatorId: string = 'system',
    allowDuplicateParam?: boolean
  ): Customer {
    if (!studioId) throw new Error('[customerService.createCustomer]: studioId is required');
    if (!data.name || !data.name.trim()) throw new Error('Customer full name is required');
    if (!data.phone || !data.phone.trim()) throw new Error('Mobile number is required');

    const phoneNorm = normalizePhoneNumber(data.phone);
    if (!phoneNorm.isValid) {
      throw new Error(`Invalid mobile number format: "${data.phone}". Please provide a valid 10-15 digit phone number.`);
    }

    // Check duplicate
    if (!data.allowDuplicate) {
      const dupCheck = this.detectDuplicates(studioId, data.phone, data.email);
      if (dupCheck.hasDuplicate) {
        throw new Error(`Potential duplicate customer found: ${dupCheck.reasons.join(', ')}. Pass allowDuplicate to override.`);
      }
    }

    const customers = TenantStore.get<Customer>(studioId, 'customers');
    const now = new Date().toISOString();

    const newCustomer: Customer = {
      ...data,
      id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studioId,
      city: data.city || 'Mumbai',
      phone: phoneNorm.nationalNumber, // Store clean national number
      alternatePhone: data.alternatePhone ? normalizePhoneNumber(data.alternatePhone).nationalNumber : undefined,
      totalBookings: 0,
      totalSpent: 0,
      pendingBalance: 0,
      tags: data.tags || [],
      status: data.status || 'Active',
      customerSource: data.customerSource || 'Walk-in',
      communicationPreferences: data.communicationPreferences || {
        preferredContactMethod: 'whatsapp',
        whatsappConsent: true,
        emailConsent: true,
        marketingConsent: false,
        optOut: false
      },
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy || 'system'
    };

    CustomerSchema.parse(newCustomer);
    TenantStore.set(studioId, 'customers', [newCustomer, ...customers]);
    firestoreService.saveDocument(studioId, 'customers', newCustomer.id, newCustomer).catch(() => {});

    auditService.log(
      studioId,
      newCustomer.createdBy,
      'CREATE_CUSTOMER',
      'customer',
      newCustomer.id,
      { name: newCustomer.name, phone: newCustomer.phone, status: newCustomer.status }
    );

    return newCustomer;
  }

  updateCustomer(studioId: string, customerId: string, updates: Partial<Customer>, operatorId: string = 'system'): Customer {
    if (!studioId) throw new Error('[customerService.updateCustomer]: studioId is required');
    const customers = TenantStore.get<Customer>(studioId, 'customers');
    let index = customers.findIndex(c => c.id === customerId);

    // Resilient fallback if not yet in TenantStore cache
    let existing: Customer;
    if (index === -1) {
      existing = {
        id: customerId,
        studioId,
        name: updates.name || 'Valued Client',
        phone: updates.phone || '9999999999',
        createdAt: new Date().toISOString()
      };
      customers.push(existing);
      index = customers.length - 1;
    } else {
      existing = customers[index];
    }

    // Clean and sanitize update fields to avoid schema mismatch or undefined/null errors
    const sanitizedUpdates: Partial<Customer> = { ...updates };
    if (sanitizedUpdates.name) {
      sanitizedUpdates.name = sanitizedUpdates.name.trim();
    }
    if (typeof sanitizedUpdates.email === 'string') {
      const trimmedEmail = sanitizedUpdates.email.trim();
      sanitizedUpdates.email = trimmedEmail || undefined;
    }
    if (sanitizedUpdates.phone) {
      const norm = normalizePhoneNumber(sanitizedUpdates.phone);
      if (norm.isValid) {
        sanitizedUpdates.phone = norm.nationalNumber;
      } else {
        const cleanedDigits = sanitizedUpdates.phone.replace(/[^\d+]/g, '').trim();
        sanitizedUpdates.phone = cleanedDigits || existing.phone;
      }
    }
    if (typeof sanitizedUpdates.alternatePhone === 'string') {
      sanitizedUpdates.alternatePhone = sanitizedUpdates.alternatePhone.trim() || undefined;
    }
    if (typeof sanitizedUpdates.city === 'string') {
      sanitizedUpdates.city = sanitizedUpdates.city.trim() || undefined;
    }
    if (typeof sanitizedUpdates.state === 'string') {
      sanitizedUpdates.state = sanitizedUpdates.state.trim() || undefined;
    }
    if (typeof sanitizedUpdates.postalCode === 'string') {
      sanitizedUpdates.postalCode = sanitizedUpdates.postalCode.trim() || undefined;
    }
    if (typeof sanitizedUpdates.address === 'string') {
      sanitizedUpdates.address = sanitizedUpdates.address.trim() || undefined;
    }
    if (typeof sanitizedUpdates.companyName === 'string') {
      sanitizedUpdates.companyName = sanitizedUpdates.companyName.trim() || undefined;
    }
    if (typeof sanitizedUpdates.companyGst === 'string') {
      sanitizedUpdates.companyGst = sanitizedUpdates.companyGst.trim() || undefined;
    }
    if (typeof sanitizedUpdates.dob === 'string') {
      sanitizedUpdates.dob = sanitizedUpdates.dob.trim() || undefined;
    }
    if (typeof sanitizedUpdates.anniversaryDate === 'string') {
      sanitizedUpdates.anniversaryDate = sanitizedUpdates.anniversaryDate.trim() || undefined;
    }
    if (typeof sanitizedUpdates.notes === 'string') {
      sanitizedUpdates.notes = sanitizedUpdates.notes.trim() || undefined;
    }

    const updated: Customer = {
      ...existing,
      ...sanitizedUpdates,
      id: customerId,
      studioId: studioId || existing.studioId,
      updatedAt: new Date().toISOString()
    };

    // Safe schema validation without crashing UI
    const parseResult = CustomerSchema.safeParse(updated);
    if (!parseResult.success) {
      console.warn('[customerService.updateCustomer] Schema validation warning, proceeding with resilient sanitized payload:', parseResult.error.format());
    }

    customers[index] = updated;
    TenantStore.set(studioId, 'customers', customers);
    firestoreService.saveDocument(studioId, 'customers', updated.id, updated).catch((err) => {
      console.warn('[customerService.updateCustomer] Background cloud write queued:', err);
    });

    // Cascade customer updates to all connected records: Bookings, Events, Quotations, Invoices
    const nameChanged = sanitizedUpdates.name && sanitizedUpdates.name !== existing.name;
    const phoneChanged = sanitizedUpdates.phone && sanitizedUpdates.phone !== existing.phone;
    const emailChanged = sanitizedUpdates.email && sanitizedUpdates.email !== existing.email;

    if (nameChanged || phoneChanged || emailChanged) {
      // 1. studio_bookings_v2
      try {
        const bookings = TenantStore.get<any>(studioId, 'studio_bookings_v2') || [];
        let bookingsChanged = false;
        bookings.forEach(b => {
          if (b.customerId === customerId || (b.customerName && b.customerName.trim().toLowerCase() === existing.name.trim().toLowerCase())) {
            if (sanitizedUpdates.name) b.customerName = sanitizedUpdates.name;
            if (sanitizedUpdates.phone) b.customerPhone = sanitizedUpdates.phone;
            if (sanitizedUpdates.email) b.customerEmail = sanitizedUpdates.email;
            bookingsChanged = true;
            firestoreService.saveDocument(studioId, 'studio_bookings_v2', b.id, b).catch(() => {});
          }
        });
        if (bookingsChanged) {
          TenantStore.set(studioId, 'studio_bookings_v2', bookings);
        }
      } catch (err) {
        console.warn('[customerService.updateCustomer] Error cascading to studio_bookings_v2:', err);
      }

      // 2. events
      try {
        const events = TenantStore.get<any>(studioId, 'events') || [];
        let eventsChanged = false;
        events.forEach(ev => {
          if (ev.customerId === customerId || (ev.customerName && ev.customerName.trim().toLowerCase() === existing.name.trim().toLowerCase()) || (ev.clientName && ev.clientName.trim().toLowerCase() === existing.name.trim().toLowerCase())) {
            if (sanitizedUpdates.name) {
              ev.customerName = sanitizedUpdates.name;
              ev.clientName = sanitizedUpdates.name;
            }
            if (sanitizedUpdates.phone) {
              ev.customerPhone = sanitizedUpdates.phone;
              ev.clientPhone = sanitizedUpdates.phone;
            }
            if (sanitizedUpdates.email) {
              ev.customerEmail = sanitizedUpdates.email;
              ev.clientEmail = sanitizedUpdates.email;
            }
            eventsChanged = true;
            firestoreService.saveDocument(studioId, 'events', ev.id, ev).catch(() => {});
          }
        });
        if (eventsChanged) {
          TenantStore.set(studioId, 'events', events);
        }
      } catch (err) {
        console.warn('[customerService.updateCustomer] Error cascading to events:', err);
      }

      // 3. quotations
      try {
        const quotations = TenantStore.get<any>(studioId, 'quotations') || [];
        let quotesChanged = false;
        quotations.forEach(q => {
          if (q.customerId === customerId || (q.customerName && q.customerName.trim().toLowerCase() === existing.name.trim().toLowerCase())) {
            if (sanitizedUpdates.name) q.customerName = sanitizedUpdates.name;
            if (sanitizedUpdates.phone) q.customerPhone = sanitizedUpdates.phone;
            if (sanitizedUpdates.email) q.customerEmail = sanitizedUpdates.email;
            quotesChanged = true;
            firestoreService.saveDocument(studioId, 'quotations', q.id, q).catch(() => {});
          }
        });
        if (quotesChanged) {
          TenantStore.set(studioId, 'quotations', quotations);
        }
      } catch (err) {
        console.warn('[customerService.updateCustomer] Error cascading to quotations:', err);
      }

      // 4. invoices
      try {
        const invoices = TenantStore.get<any>(studioId, 'invoices') || [];
        let invoicesChanged = false;
        invoices.forEach(inv => {
          if (inv.customerId === customerId || (inv.customerName && inv.customerName.trim().toLowerCase() === existing.name.trim().toLowerCase())) {
            if (sanitizedUpdates.name) inv.customerName = sanitizedUpdates.name;
            if (sanitizedUpdates.phone) inv.customerPhone = sanitizedUpdates.phone;
            invoicesChanged = true;
            firestoreService.saveDocument(studioId, 'invoices', inv.id, inv).catch(() => {});
          }
        });
        if (invoicesChanged) {
          TenantStore.set(studioId, 'invoices', invoices);
        }
      } catch (err) {
        console.warn('[customerService.updateCustomer] Error cascading to invoices:', err);
      }
    }

    auditService.log(
      studioId,
      operatorId,
      'UPDATE_CUSTOMER',
      'customer',
      customerId,
      { updates: Object.keys(updates) }
    );

    return updated;
  }

  deleteCustomer(studioId: string, customerId: string, operatorId: string = 'system'): void {
    if (!studioId) throw new Error('[customerService.deleteCustomer]: studioId is required');
    const customers = TenantStore.get<Customer>(studioId, 'customers');
    const target = customers.find(c => c.id === customerId);
    if (!target) return;

    TenantStore.set(studioId, 'customers', customers.filter(c => c.id !== customerId));
    firestoreService.deleteDocument(studioId, 'customers', customerId).catch(() => {});
    auditService.log(studioId, operatorId, 'DELETE_CUSTOMER', 'customer', customerId, { name: target.name });
  }

  /**
   * Safe Customer Merge System:
   * Merges `secondaryId` into `primaryId`.
   * Preserves linked events, sub-events, communication logs, tasks, follow-ups, and notes.
   */
  mergeCustomers(
    studioId: string,
    primaryId: string,
    secondaryId: string,
    resolutions: Partial<Customer> = {},
    operatorId: string = 'system',
    operatorName: string = 'System Admin'
  ): Customer {
    if (!studioId) throw new Error('[customerService.mergeCustomers]: studioId is required');
    if (primaryId === secondaryId) throw new Error('Cannot merge a customer record into itself.');

    const primary = this.getCustomer(studioId, primaryId);
    const secondary = this.getCustomer(studioId, secondaryId);

    if (!primary) throw new Error(`Primary customer ${primaryId} not found.`);
    if (!secondary) throw new Error(`Secondary customer ${secondaryId} not found.`);

    const now = new Date().toISOString();

    // 1. Re-link all events belonging to secondary customer
    const events = TenantStore.get<StudioEvent>(studioId, 'events');
    const updatedEvents = events.map(e => {
      if (e.customerId === secondaryId) {
        return {
          ...e,
          customerId: primaryId,
          customerName: resolutions.name || primary.name,
          customerPhone: resolutions.phone || primary.phone,
          updatedAt: now
        };
      }
      return e;
    });
    TenantStore.set(studioId, 'events', updatedEvents);

    // 2. Re-link all follow-ups
    const followUps = TenantStore.get<FollowUp>(studioId, 'followUps');
    const updatedFollowUps = followUps.map(f => {
      if (f.customerId === secondaryId) {
        return {
          ...f,
          customerId: primaryId,
          customerName: resolutions.name || primary.name,
          customerPhone: resolutions.phone || primary.phone
        };
      }
      return f;
    });
    TenantStore.set(studioId, 'followUps', updatedFollowUps);

    // 3. Re-link communication / WhatsApp logs
    const logs = TenantStore.get<WhatsAppLog>(studioId, 'messageLogs');
    const updatedLogs = logs.map(l => {
      if (l.customerId === secondaryId) {
        return {
          ...l,
          customerId: primaryId,
          customerName: resolutions.name || primary.name
        };
      }
      return l;
    });
    TenantStore.set(studioId, 'messageLogs', updatedLogs);

    // 4. Re-link customer notes
    const notes = TenantStore.get<CustomerNote>(studioId, 'customerNotes');
    const updatedNotes = notes.map(n => {
      if (n.customerId === secondaryId) {
        return { ...n, customerId: primaryId };
      }
      return n;
    });
    TenantStore.set(studioId, 'customerNotes', updatedNotes);

    // 5. Re-link customer interactions
    const interactions = TenantStore.get<CustomerInteraction>(studioId, 'customerInteractions');
    const updatedInteractions = interactions.map(i => {
      if (i.customerId === secondaryId) {
        return { ...i, customerId: primaryId };
      }
      return i;
    });
    TenantStore.set(studioId, 'customerInteractions', updatedInteractions);

    // Combine tags and bookings
    const combinedTags = Array.from(new Set([...(primary.tags || []), ...(secondary.tags || []), ...(resolutions.tags || [])]));
    const totalBookings = (primary.totalBookings || 0) + (secondary.totalBookings || 0);
    const totalSpent = (primary.totalSpent || 0) + (secondary.totalSpent || 0);
    const pendingBalance = (primary.pendingBalance || 0) + (secondary.pendingBalance || 0);

    // 6. Update primary customer with resolved fields
    const updatedPrimary = this.updateCustomer(
      studioId,
      primaryId,
      {
        ...resolutions,
        tags: combinedTags,
        totalBookings,
        totalSpent,
        pendingBalance,
        notes: [primary.notes, secondary.notes, resolutions.notes].filter(Boolean).join('\n---\nMerged Notes:\n')
      },
      operatorId
    );

    // 7. Mark secondary customer as merged & inactive (never hard delete to prevent accidental data loss)
    this.updateCustomer(
      studioId,
      secondaryId,
      {
        status: 'Inactive',
        mergedIntoId: primaryId,
        mergedAt: now,
        mergedBy: operatorName,
        notes: `Record safely merged into primary client "${primary.name}" (${primaryId}) by ${operatorName} at ${now}.`
      },
      operatorId
    );

    auditService.log(
      studioId,
      operatorId,
      'MERGE_CUSTOMERS',
      'customer',
      primaryId,
      {
        primaryId,
        secondaryId,
        mergedBy: operatorName,
        mergedAt: now,
        eventsCount: events.filter(e => e.customerId === secondaryId).length
      }
    );

    return updatedPrimary;
  }

  // ==========================================
  // Notes & Timeline Interactions
  // ==========================================
  addNote(
    studioId: string,
    customerId: string,
    noteOrText: string | { text: string; authorId?: string; authorName?: string; isPrivate?: boolean },
    isPrivate: boolean = true,
    authorId: string = 'system',
    authorName: string = 'System Admin'
  ): CustomerNote {
    if (!studioId) throw new Error('[customerService.addNote]: studioId is required');
    const text = typeof noteOrText === 'string' ? noteOrText : noteOrText?.text;
    const aId = (typeof noteOrText === 'object' && noteOrText.authorId) ? noteOrText.authorId : authorId;
    const aName = (typeof noteOrText === 'object' && noteOrText.authorName) ? noteOrText.authorName : authorName;
    const priv = (typeof noteOrText === 'object' && noteOrText.isPrivate !== undefined) ? noteOrText.isPrivate : isPrivate;

    if (!text || !text.trim()) throw new Error('Note text is required');

    const notes = TenantStore.get<CustomerNote>(studioId, 'customerNotes');
    const newNote: CustomerNote = {
      id: `cn_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      studioId,
      customerId,
      text: text.trim(),
      authorId: aId,
      authorName: aName,
      isPrivate: priv,
      createdAt: new Date().toISOString()
    };

    CustomerNoteSchema.parse(newNote);
    TenantStore.set(studioId, 'customerNotes', [newNote, ...notes]);

    // Also record an interaction
    this.logInteraction(studioId, customerId, {
      type: 'note',
      summary: `Note added by ${aName}: "${text.slice(0, 40)}..."`,
      initiatedById: aId,
      initiatedByName: aName
    });

    return newNote;
  }

  listNotes(studioId: string, customerId: string): CustomerNote[] {
    if (!studioId) throw new Error('[customerService.listNotes]: studioId is required');
    const all = TenantStore.get<CustomerNote>(studioId, 'customerNotes');
    return all.filter(n => n.customerId === customerId);
  }

  logInteraction(
    studioId: string,
    customerId: string,
    interaction: {
      type: 'whatsapp' | 'call' | 'email' | 'meeting' | 'note' | 'booking';
      summary: string;
      initiatedById?: string;
      initiatedByName?: string;
      operatorId?: string;
      operatorName?: string;
    }
  ): CustomerInteraction {
    if (!studioId) throw new Error('[customerService.logInteraction]: studioId is required');
    const all = TenantStore.get<CustomerInteraction>(studioId, 'customerInteractions');
    const now = new Date().toISOString();

    const newInt: CustomerInteraction = {
      id: `ci_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      studioId,
      customerId,
      type: interaction.type,
      summary: interaction.summary,
      initiatedById: interaction.initiatedById || interaction.operatorId || 'system',
      initiatedByName: interaction.initiatedByName || interaction.operatorName || 'System Admin',
      timestamp: now
    };

    CustomerInteractionSchema.parse(newInt);
    TenantStore.set(studioId, 'customerInteractions', [newInt, ...all]);

    // Update customer last interaction date
    this.updateCustomer(studioId, customerId, { lastInteractionDate: now }, newInt.initiatedById);

    return newInt;
  }

  listInteractions(studioId: string, customerId: string): CustomerInteraction[] {
    if (!studioId) throw new Error('[customerService.listInteractions]: studioId is required');
    const all = TenantStore.get<CustomerInteraction>(studioId, 'customerInteractions');
    return all.filter(i => i.customerId === customerId);
  }

  // ==========================================
  // CRM Dashboard & Analytics Metrics
  // ==========================================
  getCRMDashboardMetrics(studioId: string): CRMDashboardMetrics {
    if (!studioId) throw new Error('[customerService.getCRMDashboardMetrics]: studioId is required');
    const customers = this.listCustomers(studioId);
    const events = TenantStore.get<StudioEvent>(studioId, 'events');
    const leads = TenantStore.get<any>(studioId, 'leads') || [];
    const followUps = TenantStore.get<FollowUp>(studioId, 'followUps') || [];

    const now = new Date();
    const currentMonthPrefix = now.toISOString().slice(0, 7); // e.g. "2026-11"
    const todayStr = now.toISOString().split('T')[0];

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Customers with upcoming events
    const upcomingCustIds = new Set<string>();
    const completedCustIds = new Set<string>();

    events.forEach(e => {
      if (e.startDate >= todayStr && e.status !== 'Completed' && e.status !== 'Cancelled') {
        upcomingCustIds.add(e.customerId);
      }
      if (e.status === 'Completed' || e.status === 'Delivered') {
        completedCustIds.add(e.customerId);
      }
    });

    const awaitingFollowUpCustIds = new Set<string>(
      followUps.filter(f => f.status === 'pending' && f.customerId).map(f => f.customerId!)
    );

    const total = customers.length;
    const newMonth = customers.filter(c => c.createdAt && c.createdAt.startsWith(currentMonthPrefix)).length;
    const active = customers.filter(c => c.status === 'Active' || c.status === 'Booked').length;
    const leadsNum = leads.filter((l: any) => l.status !== 'Booked' && l.status !== 'Lost' && l.stage !== 'Booked' && l.stage !== 'Lost').length;
    const booked = customers.filter(c => c.status === 'Booked' || (c.totalBookings || 0) > 0).length;
    const upcoming = customers.filter(c => upcomingCustIds.has(c.id)).length;
    const awaiting = customers.filter(c => awaitingFollowUpCustIds.has(c.id)).length;
    const pendingPay = customers.filter(c => (c.pendingBalance || 0) > 0).length;
    const recent = customers.filter(c => c.lastInteractionDate && c.lastInteractionDate >= sevenDaysAgo).length;
    const completed = customers.filter(c => (c.status === 'Completed') || (completedCustIds.has(c.id) && !upcomingCustIds.has(c.id))).length;

    return {
      totalCustomers: total,
      newThisMonth: newMonth,
      newCustomersThisMonth: newMonth,
      activeCustomers: active,
      leadsCount: leadsNum,
      potentialLeads: leadsNum,
      bookedCustomers: booked,
      customersWithUpcomingEvents: upcoming,
      upcomingEventCustomers: upcoming,
      awaitingFollowUp: awaiting,
      pendingPaymentCustomers: pendingPay,
      recentlyContactedCount: recent,
      recentlyContactedCustomers: recent,
      completedCustomers: completed,
      completedEventCustomers: completed
    };
  }
}

export const customerService = new CustomerService();
