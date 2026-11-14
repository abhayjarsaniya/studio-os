import { TenantStore } from './tenantStore';
import { 
  Supplier, 
  SupplierSchema, 
  SupplierMember, 
  SupplierMemberSchema, 
  SupplierAssignment, 
  SupplierAssignmentSchema, 
  SupplierCategory,
  SupplierAssignmentStatus,
  SupplierPaymentStatus
} from '../types/schema';

export interface SupplierFilters {
  category?: SupplierCategory;
  city?: string;
  search?: string;
  isActive?: boolean;
}

export interface AssignmentFilters {
  eventId?: string;
  subEventId?: string;
  supplierId?: string;
  category?: SupplierCategory;
  status?: SupplierAssignmentStatus;
  paymentStatus?: SupplierPaymentStatus;
  date?: string;
}

export class SupplierService {
  private readonly SUPPLIERS_STORE = 'suppliers';
  private readonly MEMBERS_STORE = 'supplier_members';
  private readonly ASSIGNMENTS_STORE = 'supplier_assignments';

  // ----------------------------------------------------
  // Supplier CRUD
  // ----------------------------------------------------

  listSuppliers(studioId: string, filters?: SupplierFilters): Supplier[] {
    let items = TenantStore.get<Supplier>(studioId, this.SUPPLIERS_STORE) || [];

    if (filters?.category) {
      items = items.filter(s => s.category === filters.category);
    }
    if (filters?.city) {
      items = items.filter(s => s.city.toLowerCase() === filters.city!.toLowerCase());
    }
    if (filters?.isActive !== undefined) {
      items = items.filter(s => s.isActive === filters.isActive);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(s => 
        s.businessName.toLowerCase().includes(q) ||
        s.contactPerson.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        (s.email && s.email.toLowerCase().includes(q))
      );
    }

    return items;
  }

  getSupplier(studioId: string, supplierId: string): Supplier | null {
    const items = TenantStore.get<Supplier>(studioId, this.SUPPLIERS_STORE) || [];
    return items.find(s => s.id === supplierId) || null;
  }

  createSupplier(studioId: string, data: Omit<Supplier, 'id' | 'studioId' | 'createdAt'>): Supplier {
    const id = `supp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newSupplier: Supplier = SupplierSchema.parse({
      ...data,
      id,
      studioId,
      createdAt: new Date().toISOString()
    });

    const items = TenantStore.get<Supplier>(studioId, this.SUPPLIERS_STORE) || [];
    items.push(newSupplier);
    TenantStore.set(studioId, this.SUPPLIERS_STORE, items);
    return newSupplier;
  }

  updateSupplier(studioId: string, supplierId: string, updates: Partial<Supplier>): Supplier {
    const items = TenantStore.get<Supplier>(studioId, this.SUPPLIERS_STORE) || [];
    const index = items.findIndex(s => s.id === supplierId);
    if (index === -1) throw new Error(`Supplier "${supplierId}" not found`);

    const updated: Supplier = SupplierSchema.parse({
      ...items[index],
      ...updates,
      updatedAt: new Date().toISOString()
    });

    items[index] = updated;
    TenantStore.set(studioId, this.SUPPLIERS_STORE, items);
    return updated;
  }

  deleteSupplier(studioId: string, supplierId: string): void {
    let items = TenantStore.get<Supplier>(studioId, this.SUPPLIERS_STORE) || [];
    items = items.filter(s => s.id !== supplierId);
    TenantStore.set(studioId, this.SUPPLIERS_STORE, items);

    // Also remove supplier members
    let members = TenantStore.get<SupplierMember>(studioId, this.MEMBERS_STORE) || [];
    members = members.filter(m => m.supplierId !== supplierId);
    TenantStore.set(studioId, this.MEMBERS_STORE, members);
  }

  // ----------------------------------------------------
  // Supplier Team Members (Roster)
  // ----------------------------------------------------

  listSupplierMembers(studioId: string, supplierId?: string): SupplierMember[] {
    const members = TenantStore.get<SupplierMember>(studioId, this.MEMBERS_STORE) || [];
    if (supplierId) {
      return members.filter(m => m.supplierId === supplierId);
    }
    return members;
  }

  addSupplierMember(studioId: string, data: Omit<SupplierMember, 'id' | 'studioId' | 'createdAt'>): SupplierMember {
    const id = `supmem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newMember: SupplierMember = SupplierMemberSchema.parse({
      ...data,
      id,
      studioId,
      createdAt: new Date().toISOString()
    });

    const members = TenantStore.get<SupplierMember>(studioId, this.MEMBERS_STORE) || [];
    members.push(newMember);
    TenantStore.set(studioId, this.MEMBERS_STORE, members);
    return newMember;
  }

  removeSupplierMember(studioId: string, memberId: string): void {
    let members = TenantStore.get<SupplierMember>(studioId, this.MEMBERS_STORE) || [];
    members = members.filter(m => m.id !== memberId);
    TenantStore.set(studioId, this.MEMBERS_STORE, members);
  }

  // ----------------------------------------------------
  // Supplier Assignments
  // ----------------------------------------------------

  listAssignments(studioId: string, filters?: AssignmentFilters): SupplierAssignment[] {
    let items = TenantStore.get<SupplierAssignment>(studioId, this.ASSIGNMENTS_STORE) || [];

    if (filters?.eventId) {
      items = items.filter(a => a.eventId === filters.eventId);
    }
    if (filters?.subEventId) {
      items = items.filter(a => a.subEventId === filters.subEventId);
    }
    if (filters?.supplierId) {
      items = items.filter(a => a.supplierId === filters.supplierId);
    }
    if (filters?.category) {
      items = items.filter(a => a.category === filters.category);
    }
    if (filters?.status) {
      items = items.filter(a => a.status === filters.status);
    }
    if (filters?.paymentStatus) {
      items = items.filter(a => a.paymentStatus === filters.paymentStatus);
    }
    if (filters?.date) {
      items = items.filter(a => a.date === filters.date);
    }

    return items;
  }

  assignSupplier(studioId: string, data: Omit<SupplierAssignment, 'id' | 'studioId' | 'createdAt'>): SupplierAssignment {
    const id = `supasgn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const assignment: SupplierAssignment = SupplierAssignmentSchema.parse({
      ...data,
      id,
      studioId,
      createdAt: new Date().toISOString()
    });

    const items = TenantStore.get<SupplierAssignment>(studioId, this.ASSIGNMENTS_STORE) || [];
    items.push(assignment);
    TenantStore.set(studioId, this.ASSIGNMENTS_STORE, items);
    return assignment;
  }

  updateAssignmentStatus(studioId: string, assignmentId: string, status: SupplierAssignmentStatus): SupplierAssignment {
    const items = TenantStore.get<SupplierAssignment>(studioId, this.ASSIGNMENTS_STORE) || [];
    const index = items.findIndex(a => a.id === assignmentId);
    if (index === -1) throw new Error(`Supplier assignment "${assignmentId}" not found`);

    items[index].status = status;
    items[index].updatedAt = new Date().toISOString();
    TenantStore.set(studioId, this.ASSIGNMENTS_STORE, items);
    return items[index];
  }

  updateAssignmentPayment(
    studioId: string, 
    assignmentId: string, 
    paidAmount: number, 
    paymentStatus: SupplierPaymentStatus
  ): SupplierAssignment {
    const items = TenantStore.get<SupplierAssignment>(studioId, this.ASSIGNMENTS_STORE) || [];
    const index = items.findIndex(a => a.id === assignmentId);
    if (index === -1) throw new Error(`Supplier assignment "${assignmentId}" not found`);

    items[index].paidAmount = paidAmount;
    items[index].paymentStatus = paymentStatus;
    items[index].updatedAt = new Date().toISOString();
    TenantStore.set(studioId, this.ASSIGNMENTS_STORE, items);
    return items[index];
  }

  removeAssignment(studioId: string, assignmentId: string): void {
    let items = TenantStore.get<SupplierAssignment>(studioId, this.ASSIGNMENTS_STORE) || [];
    items = items.filter(a => a.id !== assignmentId);
    TenantStore.set(studioId, this.ASSIGNMENTS_STORE, items);
  }

  // ----------------------------------------------------
  // Role-Aware Projections (Financial Privacy)
  // ----------------------------------------------------

  /**
   * Returns assignments with fees and payments scrubbed for non-owners/non-accountants.
   */
  getAssignmentsForUser(studioId: string, userRole: string, filters?: AssignmentFilters): SupplierAssignment[] {
    const assignments = this.listAssignments(studioId, filters);
    const canSeeFinances = userRole === 'owner' || userRole === 'accountant' || userRole === 'Studio Owner';

    if (canSeeFinances) {
      return assignments;
    }

    // Mask financial amounts
    return assignments.map(a => ({
      ...a,
      agreedFee: 0,
      paidAmount: 0,
      paymentStatus: 'pending' as SupplierPaymentStatus
    }));
  }

  /**
   * Limited external supplier portal view:
   * Strictly NO customer names, NO customer phone numbers, NO customer address, NO studio financial margins.
   */
  getSupplierPortalView(studioId: string, supplierId: string) {
    const supplier = this.getSupplier(studioId, supplierId);
    if (!supplier) throw new Error('Supplier not found');

    const assignments = this.listAssignments(studioId, { supplierId });
    
    return {
      supplier: {
        id: supplier.id,
        businessName: supplier.businessName,
        contactPerson: supplier.contactPerson,
        category: supplier.category,
        rating: supplier.rating
      },
      assignedJobs: assignments.map(a => ({
        id: a.id,
        eventId: a.eventId,
        eventTitle: a.eventTitle, // Event generic title (e.g. "Ahmedabad Royal Wedding")
        subEventTitle: a.subEventTitle,
        date: a.date,
        callTime: a.callTime,
        venue: a.venue,
        roleDescription: a.roleDescription,
        instructions: a.instructions,
        status: a.status,
        agreedFee: a.agreedFee, // Visible to supplier (their own payout)
        paymentStatus: a.paymentStatus
        // Customer personal details & phone numbers deliberately omitted
      }))
    };
  }
}

export const supplierService = new SupplierService();
