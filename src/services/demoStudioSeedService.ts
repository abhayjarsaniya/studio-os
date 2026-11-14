import { TenantStore } from './tenantStore';
import { 
  Studio, 
  Branch, 
  Employee, 
  Customer, 
  StudioEvent, 
  SubEvent, 
  Supplier, 
  SupplierMember, 
  SupplierAssignment, 
  SupplierCategory 
} from '../types/schema';
import { employeeAuthService } from './employeeAuthService';
import { supplierService } from './supplierService';
import { eventService } from './eventService';
import { subEventService } from './subEventService';
import { employeeService } from './employeeService';
import { roleService } from './roleService';

export interface DemoStudioConfig {
  id: string;
  name: string;
  city: string;
  tagline: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  address: string;
  gstNumber: string;
  categories: string[];
  branches: Array<{ name: string; code: string; address: string; isMain: boolean }>;
}

export const DEMO_STUDIOS_CONFIG: DemoStudioConfig[] = [
  {
    id: 'studio_royal_frames_001',
    name: 'Royal Frames Photography',
    city: 'Ahmedabad',
    tagline: 'Luxury Weddings & Heritage Visuals Across Gujarat',
    ownerName: 'Aarav Patel',
    ownerEmail: 'aarav@royalframes.in',
    phone: '+91 98250 11223',
    address: '301, Titanium One, SG Highway, Bodakdev, Ahmedabad - 380054',
    gstNumber: '24AAACR1122D1Z4',
    categories: ['Wedding', 'Pre-Wedding', 'Engagement', 'Reception', 'Haldi', 'Sangeet', 'Custom Event'],
    branches: [
      { name: 'SG Highway Flagship', code: 'AHM-01', address: 'Titanium One, SG Highway, Ahmedabad', isMain: true },
      { name: 'Sindhu Bhavan Executive Desk', code: 'AHM-02', address: 'Sindhu Bhavan Road, Bodakdev, Ahmedabad', isMain: false }
    ]
  },
  {
    id: 'studio_moments_002',
    name: 'Moments Studio',
    city: 'Surat',
    tagline: 'Cherishing Every Emotion – Weddings & Family Portraits',
    ownerName: 'Krunal Shah',
    ownerEmail: 'krunal@momentsstudio.in',
    phone: '+91 98241 33445',
    address: '204, Regent Square, Ghod Dod Road, Surat - 395007',
    gstNumber: '24BBBCS3344E1Z7',
    categories: ['Wedding', 'Family Photoshoot', 'Maternity', 'Baby Shower', 'Newborn', 'Anniversary'],
    branches: [
      { name: 'Ghod Dod Road Studio', code: 'SUR-01', address: 'Regent Square, Ghod Dod Road, Surat', isMain: true },
      { name: 'Vesu Creative Hub', code: 'SUR-02', address: 'VIP Road, Vesu, Surat', isMain: false }
    ]
  },
  {
    id: 'studio_pixelcraft_003',
    name: 'PixelCraft Photography',
    city: 'Vadodara',
    tagline: 'High-Impact Commercial, Fashion & Architectural Imagery',
    ownerName: 'Rohan Desai',
    ownerEmail: 'rohan@pixelcraft.in',
    phone: '+91 98252 55667',
    address: '4th Floor, Atlantis Heights, Sarabhai Campus, Alkapuri, Vadodara - 390007',
    gstNumber: '24CCCDP5566F1Z1',
    categories: ['Commercial Event', 'Product Photography', 'Fashion Photography', 'Portfolio Shoot', 'Corporate Event'],
    branches: [
      { name: 'Alkapuri Creative Lab', code: 'BRD-01', address: 'Atlantis Heights, Sarabhai Campus, Vadodara', isMain: true }
    ]
  },
  {
    id: 'studio_shutter_stories_004',
    name: 'Shutter Stories',
    city: 'Rajkot',
    tagline: 'Authentic Saurashtra Cultural Weddings & Celebrations',
    ownerName: 'Meet Joshi',
    ownerEmail: 'meet@shutterstories.in',
    phone: '+91 98253 77889',
    address: '101, Crystal Mall Commercial Complex, Kalawad Road, Rajkot - 360005',
    gstNumber: '24DDDJS7788G1Z3',
    categories: ['Wedding', 'Engagement', 'Haldi', 'Mehndi', 'Sangeet', 'Religious Event'],
    branches: [
      { name: 'Kalawad Road Studio', code: 'RAJ-01', address: 'Crystal Mall Complex, Kalawad Road, Rajkot', isMain: true }
    ]
  },
  {
    id: 'studio_golden_hour_005',
    name: 'Golden Hour Studio',
    city: 'Gandhinagar',
    tagline: 'Destination Weddings & Corporate Conclaves in the Capital',
    ownerName: 'Dhruv Trivedi',
    ownerEmail: 'dhruv@goldenhour.in',
    phone: '+91 98254 99001',
    address: '505, Pramukh Orbit, Near Infocity & Kudasan, Gandhinagar - 382421',
    gstNumber: '24EEETG9900H1Z8',
    categories: ['Wedding', 'Pre-Wedding', 'Corporate Event', 'Conference', 'Drone Photography'],
    branches: [
      { name: 'Kudasan Flagship', code: 'GNR-01', address: 'Pramukh Orbit, Kudasan, Gandhinagar', isMain: true },
      { name: 'GIFT City Desk', code: 'GNR-02', address: 'Tower 1, GIFT City, Gandhinagar', isMain: false }
    ]
  }
];

// Sample venues per city
const GUJARAT_VENUES: Record<string, string[]> = {
  Ahmedabad: [
    'YMCA Club, SG Highway, Ahmedabad',
    'The Grand Bhagwati, Bodakdev, Ahmedabad',
    'Club Babylon, Science City Road, Ahmedabad',
    'Courtyard by Marriott, Ramdevnagar, Ahmedabad',
    'Taj Skyline, Sindhu Bhavan Road, Ahmedabad',
    'Karnavati Club, SG Highway, Ahmedabad'
  ],
  Surat: [
    'Surat Marriott Hotel, Athwalines, Surat',
    'The Grand Bhagwati, Dumas Road, Surat',
    'Rajhans Belliza, Hazira Road, Surat',
    'Avadh Utopia, Dumas, Surat',
    'Meridien Banquets, Vesu, Surat'
  ],
  Vadodara: [
    'Laxmi Vilas Palace Banquets, J.N. Marg, Vadodara',
    'Sayaji Hotel, Near Bhimnath Bridge, Vadodara',
    'Grand Mercure Surya Palace, Sayajigunj, Vadodara',
    'Kabir Hotel & Nature Park, Sevasi, Vadodara',
    'The Fern Residency, Alkapuri, Vadodara'
  ],
  Rajkot: [
    'The Imperial Palace, Dr. Yagnik Road, Rajkot',
    'Seasons Hotel, Kalawad Road, Rajkot',
    'Sayaji Rajkot, Kalawad Road, Rajkot',
    'Regency Lagoon Resort, Nyari Dam Road, Rajkot',
    'Heritage Khirasara Palace, Rajkot'
  ],
  Gandhinagar: [
    'The Leela Gandhinagar, Airspace Sector 14, Gandhinagar',
    'GIFT City Club & Resort, GIFT City, Gandhinagar',
    'Cambay Sapphire, Sector 25, Gandhinagar',
    'Infocity Convention Grounds, Gandhinagar',
    'Belvedere Golf & Country Club, Adani Shantigram, Gandhinagar'
  ]
};

export class DemoStudioSeedService {
  private readonly SEED_KEY = 'demo_studios_seeded_v12';

  isSeeded(): boolean {
    return !!TenantStore.getSingle<boolean>('platform_system', this.SEED_KEY);
  }

  seedAllDemoStudios(force = false): { studiosSeeded: number; eventsSeeded: number } {
    if (this.isSeeded() && !force) {
      return { studiosSeeded: 5, eventsSeeded: 120 };
    }

    let totalEvents = 0;

    DEMO_STUDIOS_CONFIG.forEach(cfg => {
      this.seedSingleStudio(cfg);
      const eventsCount = this.seedEventsForStudio(cfg);
      totalEvents += eventsCount;
    });

    TenantStore.set('platform_system', this.SEED_KEY, true);
    return { studiosSeeded: DEMO_STUDIOS_CONFIG.length, eventsSeeded: totalEvents };
  }

  seedSingleStudio(cfg: DemoStudioConfig): void {
    // 1. Studio Profile
    const profile: Studio = {
      id: cfg.id,
      tenantId: `tenant_${cfg.id}`,
      name: cfg.name,
      title: cfg.ownerName,
      tagline: cfg.tagline,
      logoUrl: `https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=160&auto=format&fit=crop&q=80`,
      phone: cfg.phone,
      email: cfg.ownerEmail,
      address: cfg.address,
      city: cfg.city,
      state: 'Gujarat',
      pincode: '380001',
      gstNumber: cfg.gstNumber,
      lifecycleStatus: 'active',
      isHidden: false,
      subscription: {
        planId: 'studio_os_monthly',
        planName: 'Studio OS Monthly',
        pricePerMonth: 500,
        currency: 'INR',
        status: 'active',
        validUntil: '2027-12-31',
        autoRenew: true
      },
      settings: {
        defaultCurrency: 'INR',
        timezone: 'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        allowDirectWhatsApp: true,
        watermarkEnabled: true,
        invoicePrefix: `${cfg.id.slice(7, 10).toUpperCase()}-INV`,
        eventPrefix: `${cfg.id.slice(7, 10).toUpperCase()}-EV`
      },
      storageUsageMb: 1250,
      storageQuotaMb: 15360,
      createdAt: '2026-01-01T09:00:00Z',
      updatedAt: new Date().toISOString(),
      createdBy: 'admin_sys'
    };
    TenantStore.set(cfg.id, 'profile', profile);

    // 2. Branches
    const branches: Branch[] = cfg.branches.map((b, i) => ({
      id: `br_${cfg.id}_${i + 1}`,
      studioId: cfg.id,
      name: b.name,
      code: b.code,
      address: b.address,
      city: cfg.city,
      phone: cfg.phone,
      isMainBranch: b.isMain,
      isActive: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01'
    }));
    TenantStore.set(cfg.id, 'branches', branches);

    // 3. Employees & Credentials
    const staffDefinitions = [
      { name: cfg.ownerName, email: cfg.ownerEmail, role: 'owner', desig: 'Studio Owner & Creative Director', dept: 'Executive' },
      { name: `Pooja Sharma (${cfg.city})`, email: `pooja.${cfg.city.toLowerCase()}@example.com`, role: 'lead_photographer', desig: 'Lead Candid Photographer', dept: 'Photography' },
      { name: `Vikram Patel (${cfg.city})`, email: `vikram.${cfg.city.toLowerCase()}@example.com`, role: 'cinematographer', desig: 'Cinematographer & Aerial Pilot', dept: 'Cinematography' },
      { name: `Neha Mehta (${cfg.city})`, email: `neha.${cfg.city.toLowerCase()}@example.com`, role: 'editor', desig: 'Senior Colorist & Video Editor', dept: 'Post-Production' },
      { name: `Amit Shah (${cfg.city})`, email: `amit.${cfg.city.toLowerCase()}@example.com`, role: 'manager', desig: 'Studio Manager & Client Head', dept: 'Operations' }
    ];

    const employees: Employee[] = staffDefinitions.map((s, idx) => {
      const empId = `emp_${cfg.id}_${idx + 1}`;
      
      // Provision employee login
      const username = s.name.split(' ')[0].toLowerCase() + '_' + cfg.city.toLowerCase().slice(0, 3);
      employeeAuthService.provisionAccount(cfg.id, empId, username, s.email, 'StudioOS@2026');

      return {
        id: empId,
        studioId: cfg.id,
        employeeNumber: `EMP-${cfg.id.slice(7, 10).toUpperCase()}-${idx + 1}`,
        fullName: s.name,
        name: s.name,
        email: s.email,
        phone: '+91 98000 ' + String(10000 + idx * 1111).slice(1),
        designation: s.desig,
        department: s.dept,
        roleName: s.role === 'owner' ? 'Studio Owner' : s.desig,
        roleId: s.role,
        roleIds: [s.role],
        branchId: branches[0].id,
        employmentStatus: 'active' as any,
        joiningDate: '2026-01-15',
        dateOfJoining: '2026-01-15',
        createdAt: '2026-01-15',
        updatedAt: '2026-01-15'
      };
    });
    TenantStore.set(cfg.id, 'employees', employees);

    // 4. External Suppliers (across diverse categories)
    const supplierDefs: Array<{
      businessName: string;
      contactPerson: string;
      category: SupplierCategory;
      city: string;
      phone: string;
      rate: number;
    }> = [
      { businessName: `${cfg.city} Aerial Drones`, contactPerson: 'Harshil Soni', category: 'drone_pilots', city: cfg.city, phone: '+91 98251 10001', rate: 12000 },
      { businessName: 'Saraswati Album Craft', contactPerson: 'Dharmesh Panchal', category: 'album_printers_bookbinders', city: cfg.city, phone: '+91 98251 10002', rate: 18000 },
      { businessName: 'Acoustic Waves Pro', contactPerson: 'Jayesh Dave', category: 'sound_audio_engineers', city: cfg.city, phone: '+91 98251 10003', rate: 8500 },
      { businessName: 'Lumina Grand LED Walls', contactPerson: 'Ketan Mistry', category: 'led_wall_live_screening', city: cfg.city, phone: '+91 98251 10004', rate: 25000 },
      { businessName: 'Sunbeam Traditional Lens', contactPerson: 'Ramesh Vaghela', category: 'traditional_photographers', city: cfg.city, phone: '+91 98251 10005', rate: 7000 },
      { businessName: 'Prism Colorworks Studio', contactPerson: 'Bhavin Bhatt', category: 'video_editors_external', city: cfg.city, phone: '+91 98251 10006', rate: 15000 }
    ];

    supplierDefs.forEach(sd => {
      const sup = supplierService.createSupplier(cfg.id, {
        businessName: sd.businessName,
        contactPerson: sd.contactPerson,
        category: sd.category,
        phone: sd.phone,
        email: `${sd.contactPerson.toLowerCase().replace(/\s+/g, '')}@supplier.in`,
        city: sd.city,
        address: `Ring Road Industrial Hub, ${sd.city}`,
        rating: 4.8,
        baseDayRate: sd.rate,
        paymentTerms: '50% Advance, 50% on Delivery',
        isActive: true,
        hasPortalAccess: true
      });

      // Add a technician under this supplier
      supplierService.addSupplierMember(cfg.id, {
        supplierId: sup.id,
        name: `${sd.contactPerson} (Lead Tech)`,
        phone: sd.phone,
        roleTitle: sd.category.replace(/_/g, ' ').toUpperCase(),
        isAvailable: true
      });
    });

    // 5. Customers
    const customerNames = [
      { name: 'Dr. Hardik & Dr. Riddhi Shah', phone: '+91 98250 88101', city: cfg.city },
      { name: 'Chirag & Priyanka Trivedi', phone: '+91 98250 88102', city: cfg.city },
      { name: 'Nilesh & Shweta Parekh', phone: '+91 98250 88103', city: cfg.city },
      { name: 'Biren & Khushboo Merchant', phone: '+91 98250 88104', city: cfg.city },
      { name: 'Kishan & Urvashi Raval', phone: '+91 98250 88105', city: cfg.city },
      { name: 'Zaveri Jewellers (Mr. Rajiv Zaveri)', phone: '+91 98250 88106', city: cfg.city },
      { name: 'Adani Logistics Corporate (Desk)', phone: '+91 98250 88107', city: cfg.city },
      { name: 'Pranav & Tanvi Barot', phone: '+91 98250 88108', city: cfg.city }
    ];

    const customers: Customer[] = customerNames.map((c, i) => ({
      id: `cust_${cfg.id}_${i + 1}`,
      studioId: cfg.id,
      name: c.name,
      phone: c.phone,
      email: `client.${cfg.id.slice(7, 10)}.${i + 1}@example.com`,
      address: `Vasant Vihar Society, Near Ring Road, ${c.city}`,
      city: c.city,
      status: 'Active',
      vipTier: i === 0 || i === 5 ? 'vip' : 'standard',
      totalBookings: 2,
      totalSpend: 150000 + i * 25000,
      createdAt: '2026-01-20',
      updatedAt: '2026-01-20'
    }));
    TenantStore.set(cfg.id, 'customers', customers);
  }

  seedEventsForStudio(cfg: DemoStudioConfig): number {
    const venues = GUJARAT_VENUES[cfg.city] || GUJARAT_VENUES['Ahmedabad'];
    const employees = TenantStore.get<Employee>(cfg.id, 'employees') || [];
    const customers = TenantStore.get<Customer>(cfg.id, 'customers') || [];
    const suppliers = supplierService.listSuppliers(cfg.id);

    const eventThemes = [
      { title: 'Grand Royal Wedding', cat: 'Wedding', subEvents: ['Mehndi Ceremony', 'Haldi & Mandvo', 'Sangeet Sandhya', 'Wedding & Varmala', 'Grand Reception'] },
      { title: 'Intimate Destination Wedding', cat: 'Wedding', subEvents: ['Welcome Dinner', 'Ganesh Sthapana', 'Pithi Rasam', 'Phere & Vivah', 'Afterparty'] },
      { title: 'Romantic Palace Pre-Wedding', cat: 'Pre-Wedding', subEvents: ['Sunrise Heritage Walk', 'Golden Hour Lake Shoot', 'Night Silhouette Session'] },
      { title: 'Engagement Ring Ceremony', cat: 'Engagement', subEvents: ['Family Puja', 'Ring Exchange & Speeches', 'Celebration Banquet'] },
      { title: 'Sangeet Sandhya & Musical Night', cat: 'Sangeet', subEvents: ['Soundcheck & Rehearsals', 'Choreographed Performances', 'Open DJ & Garba'] },
      { title: 'Traditional Haldi & Mandvo', cat: 'Haldi', subEvents: ['Phoolon Ki Haldi', 'Rituals & Pithi', 'Family Feast'] },
      { title: 'Celebrity Fashion Showcase', cat: 'Fashion Photography', subEvents: ['Ramp Walk Session', 'Backstage Portfolio', 'Designer Lookbook'] },
      { title: 'Jewellery Festive Lookbook', cat: 'Product Photography', subEvents: ['Macro Gold & Diamond Shoot', 'Model Styled Shots', 'Catalog Exports'] },
      { title: 'Annual Corporate Global Conclave', cat: 'Corporate Event', subEvents: ['Keynote Sessions', 'Panel Discussions', 'Gala Dinner & Awards'] },
      { title: 'Luxury Villa Architectural Shoot', cat: 'Custom Event', subEvents: ['Exterior Aerial Drone Shots', 'Interior Daylight Ambient', 'Twilight Mood Session'] },
      { title: 'Blessings Baby Shower (Godh Bharai)', cat: 'Baby Shower', subEvents: ['Traditional Srimant Puja', 'Family Blessing Portraits', 'Candid Guest Moments'] },
      { title: 'Golden 50th Anniversary Gala', cat: 'Anniversary', subEvents: ['Vow Renewal Ceremony', 'Memory Retrospective Reel', 'Banquet Celebration'] }
    ];

    // Generate 24 events per studio (2 batches of 12 distinct themes spanning dates)
    const totalToGenerate = 24;
    const events: StudioEvent[] = [];
    const allSubEvents: SubEvent[] = [];

    for (let i = 0; i < totalToGenerate; i++) {
      const theme = eventThemes[i % eventThemes.length];
      const venue = venues[i % venues.length];
      const customer = customers[i % customers.length];
      const eventId = `ev_${cfg.id}_${String(i + 1).padStart(3, '0')}`;

      // Date calculations (some past, some this month, some upcoming)
      const dayOffset = (i - 10) * 4;
      const d = new Date(2026, 10, 15); // Nov 15 2026 baseline
      d.setDate(d.getDate() + dayOffset);
      const startDateStr = d.toISOString().split('T')[0];
      const endD = new Date(d);
      endD.setDate(endD.getDate() + 2);
      const endDateStr = endD.toISOString().split('T')[0];

      const status = dayOffset < -4 ? 'completed' : dayOffset <= 2 ? 'in_progress' : 'confirmed';

      const leadPhotographer = employees.find(e => e.roleId === 'lead_photographer') || employees[0];
      const cinematographer = employees.find(e => e.roleId === 'cinematographer') || employees[1];

      const event: StudioEvent = {
        id: eventId,
        studioId: cfg.id,
        eventNumber: `${cfg.id.slice(7, 10).toUpperCase()}-EVT-${String(i + 1).padStart(3, '0')}`,
        name: `${customer.name.split('&')[0].trim()} • ${theme.title}`,
        title: theme.title,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerContact: customer.phone,
        category: theme.cat,
        startDate: startDateStr,
        startTime: '09:00',
        endDate: endDateStr,
        endTime: '22:00',
        totalStartDate: startDateStr,
        totalEndDate: endDateStr,
        venue: venue,
        venueCity: cfg.city,
        overallVenue: venue,
        priority: 'High' as any,
        status: (status === 'completed' ? 'Completed' : status === 'in_progress' ? 'In Progress' : 'Confirmed') as any,
        description: `High-priority ${theme.cat} assignment captured by ${cfg.name} team.`,
        budget: 150000 + (i * 12500),
        totalAmount: 150000 + (i * 12500),
        paidAmount: status === 'completed' ? (150000 + (i * 12500)) : 50000,
        assignedMemberIds: [leadPhotographer.id, cinematographer.id],
        tasksCount: { total: 4, completed: status === 'completed' ? 4 : 1 },
        createdBy: 'admin_sys',
        createdAt: '2026-02-01',
        updatedAt: '2026-02-01'
      };

      events.push(event);

      // Seed Sub-Events
      theme.subEvents.forEach((seName, seIdx) => {
        const subEventId = `sub_${eventId}_${seIdx + 1}`;
        const subDate = new Date(d);
        subDate.setDate(subDate.getDate() + (seIdx % 3));
        const subDateStr = subDate.toISOString().split('T')[0];

        const subEvent: SubEvent = {
          id: subEventId,
          parentEventId: eventId,
          studioId: cfg.id,
          subEventNumber: `SE-${eventId}-${seIdx + 1}`,
          name: seName,
          customCategory: theme.cat,
          date: subDateStr,
          startTime: seIdx % 2 === 0 ? '09:00 AM' : '05:00 PM',
          endTime: seIdx % 2 === 0 ? '01:00 PM' : '10:00 PM',
          venue: venue,
          address: venue,
          assignedMemberIds: [leadPhotographer.id, cinematographer.id],
          requiredTeamSize: 2,
          priority: 'High' as any,
          sortOrder: seIdx,
          status: (status === 'completed' ? 'Completed' : 'Confirmed') as any,
          notes: `Call time 30 mins before start. Full equipment check at ${venue}.`,
          createdAt: '2026-02-01',
          updatedAt: '2026-02-01'
        };

        allSubEvents.push(subEvent);

        // Assign a supplier to selected sub-events (e.g. Drone pilot or LED Wall)
        if (suppliers.length > 0 && seIdx === 0) {
          const sup = suppliers[i % suppliers.length];
          supplierService.assignSupplier(cfg.id, {
            supplierId: sup.id,
            supplierName: sup.businessName,
            category: sup.category,
            eventId: eventId,
            eventTitle: event.name,
            subEventId: subEventId,
            subEventTitle: seName,
            date: subDateStr,
            callTime: '08:30 AM',
            venue: venue,
            agreedFee: sup.baseDayRate || 10000,
            paidAmount: status === 'completed' ? (sup.baseDayRate || 10000) : 0,
            paymentStatus: status === 'completed' ? 'paid' : 'pending',
            status: 'confirmed',
            instructions: `Arrive at ${venue} with full battery backups.`
          });
        }
      });
    }

    TenantStore.set(cfg.id, 'subEvents', allSubEvents);
    TenantStore.set(cfg.id, 'sub_events', allSubEvents);
    TenantStore.set(cfg.id, 'events', events);
    return events.length;
  }
}

export const demoStudioSeedService = new DemoStudioSeedService();
