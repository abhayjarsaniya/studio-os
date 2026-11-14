import { 
  Studio, 
  Branch, 
  Membership, 
  Customer, 
  StudioEvent, 
  Task, 
  Invoice, 
  StudioNotification, 
  EventCategoryItem 
} from '../types/schema';

// =========================================================================
// STUDIO A: "Royal Photography" (Mumbai & Udaipur Heritage)
// =========================================================================
export const studioA: Studio = {
  id: 'studio_royal_001',
  tenantId: 'tenant_royal_mumbai_001',
  name: 'Royal Photography',
  tagline: 'Luxury Heritage & Palace Destination Visual Storytelling',
  logoUrl: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=160&auto=format&fit=crop&q=80',
  phone: '+91 98201 44552',
  email: 'concierge@royalphotography.in',
  address: 'Royal House 402, Signature Art Avenue, Bandra West',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400050',
  gstNumber: '27AADCR1234F1Z9',
  subscription: {
    planId: 'studio_os_monthly',
    planName: 'Studio OS Monthly',
    pricePerMonth: 500,
    currency: 'INR',
    status: 'active',
    validUntil: '2027-02-28',
    autoRenew: true
  },
  settings: {
    defaultCurrency: 'INR',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    allowDirectWhatsApp: true,
    watermarkEnabled: true,
    invoicePrefix: 'ROYAL-INV',
    eventPrefix: 'ROYAL-EV'
  },
  storageUsageMb: 2450,
  storageQuotaMb: 15360,
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-11-13T10:00:00Z',
  createdBy: 'usr_kabir'
};

export const branchesA: Branch[] = [
  {
    id: 'branch_royal_mum',
    studioId: 'studio_royal_001',
    name: 'Bandra Flagship Studio',
    code: 'MUM-01',
    address: 'Studio 402, Signature Art Avenue, Bandra West',
    city: 'Mumbai',
    phone: '+91 98201 44552',
    email: 'mumbai@royalphotography.in',
    isMainBranch: true,
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-11-01'
  },
  {
    id: 'branch_royal_udr',
    studioId: 'studio_royal_001',
    name: 'Udaipur Heritage Desk',
    code: 'UDR-01',
    address: 'Near Lake Pichola, Palace Road',
    city: 'Udaipur',
    phone: '+91 98290 88771',
    email: 'udaipur@royalphotography.in',
    isMainBranch: false,
    isActive: true,
    createdAt: '2026-04-15',
    updatedAt: '2026-11-01'
  }
];

export const membersA: Membership[] = [
  {
    id: 'mem_royal_1',
    userId: 'usr_kabir',
    studioId: 'studio_royal_001',
    displayName: 'Kabir Sharma',
    email: 'kabir@royalphotography.in',
    phone: '+91 98201 44552',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    role: 'owner',
    roleTitle: 'Studio Founder & Creative Director',
    roleIds: ['owner'],
    department: 'Creative Direction',
    branchAssignments: ['branch_royal_mum', 'branch_royal_udr'],
    status: 'active',
    specialization: ['Creative Direction', 'Palace Weddings', 'Client Experience'],
    joinedDate: '2026-01-01',
    createdAt: '2026-01-01',
    updatedAt: '2026-11-01'
  },
  {
    id: 'mem_royal_2',
    userId: 'usr_aditi',
    studioId: 'studio_royal_001',
    displayName: 'Aditi Rao',
    email: 'aditi@royalphotography.in',
    phone: '+91 98202 77112',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
    role: 'manager',
    roleTitle: 'Studio Operations Manager',
    roleIds: ['manager'],
    department: 'Operations',
    branchAssignments: ['branch_royal_mum'],
    status: 'active',
    specialization: ['Production Logistics', 'Budgeting', 'Timeline Scheduling'],
    joinedDate: '2026-01-05',
    createdAt: '2026-01-05',
    updatedAt: '2026-11-01'
  },
  {
    id: 'mem_royal_3',
    userId: 'usr_vikram',
    studioId: 'studio_royal_001',
    displayName: 'Vikramaditya Verma',
    email: 'vikram@royalphotography.in',
    phone: '+91 98203 11890',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    role: 'lead_photographer',
    roleTitle: 'Senior Lead Photographer',
    roleIds: ['lead_photographer'],
    department: 'Photography',
    branchAssignments: ['branch_royal_mum', 'branch_royal_udr'],
    status: 'active',
    specialization: ['Candid Photography', 'Portraiture', 'Prime Lenses'],
    joinedDate: '2026-02-01',
    createdAt: '2026-02-01',
    updatedAt: '2026-11-01'
  }
];

export const customersA: Customer[] = [
  {
    id: 'cust_royal_1',
    studioId: 'studio_royal_001',
    branchId: 'branch_royal_mum',
    name: 'Priyanka Singhania & Arjun Kapoor',
    phone: '+91 98210 12345',
    email: 'priyanka.singhania@gmail.com',
    city: 'Mumbai',
    notes: 'Premium 3-day royal destination wedding package at Taj Lands End.',
    totalBookings: 2,
    totalSpent: 450000,
    pendingBalance: 75000,
    tags: ['VIP', 'Destination', 'Royal'],
    createdAt: '2026-09-12',
    updatedAt: '2026-11-13',
    createdBy: 'usr_kabir'
  },
  {
    id: 'cust_royal_2',
    studioId: 'studio_royal_001',
    branchId: 'branch_royal_mum',
    name: 'Dr. Meera & Siddharth Deshmukh',
    phone: '+91 98331 87654',
    email: 'meera.deshmukh@healthplus.org',
    city: 'Pune',
    notes: 'Pre-wedding sunset shoot at Lonavala, followed by traditional Maharashtrian wedding.',
    totalBookings: 1,
    totalSpent: 95000,
    pendingBalance: 0,
    tags: ['Pre-Wedding', 'Candid'],
    createdAt: '2026-10-04',
    updatedAt: '2026-11-10',
    createdBy: 'usr_kabir'
  },
  {
    id: 'cust_royal_3',
    studioId: 'studio_royal_001',
    branchId: 'branch_royal_mum',
    name: 'FabIndia Lifestyle Brand (Divya Shah)',
    phone: '+91 99200 65432',
    email: 'divya.shah@fabindiamarketing.in',
    city: 'Mumbai',
    notes: 'Spring/Summer ethnic wear catalog shoot.',
    totalBookings: 2,
    totalSpent: 320000,
    pendingBalance: 80000,
    tags: ['Commercial', 'Catalog'],
    createdAt: '2026-08-05',
    updatedAt: '2026-11-12',
    createdBy: 'usr_aditi'
  }
];

export const eventsA: StudioEvent[] = [
  {
    id: 'ev_royal_1',
    studioId: 'studio_royal_001',
    branchId: 'branch_royal_mum',
    eventNumber: 'ROYAL-EV-101',
    name: 'Singhania & Kapoor Royal Grand Wedding',
    customerId: 'cust_royal_1',
    customerName: 'Priyanka Singhania & Arjun Kapoor',
    customerPhone: '+91 98210 12345',
    category: 'Wedding',
    startDate: '2026-11-13',
    startTime: '16:00',
    endDate: '2026-11-13',
    endTime: '23:30',
    venue: 'Taj Lands End, Sea View Ballroom',
    venueCity: 'Bandra West, Mumbai',
    assignedTeamIds: ['mem_royal_1', 'mem_royal_3'],
    leadPhotographerId: 'mem_royal_3',
    priority: 'Urgent',
    status: 'Shooting',
    notes: 'Main Varmala at 7:30 PM sharp. Setup wireless live feeds.',
    estimatedBudget: 350000,
    advancePaid: 275000,
    deliverables: ['1 Extended 4K Film (25 min)', '1 Cinematic Teaser (3 min)', '450 Edited Photos'],
    tasksCount: { total: 4, completed: 2 },
    createdAt: '2026-09-15',
    updatedAt: '2026-11-13',
    createdBy: 'usr_kabir'
  },
  {
    id: 'ev_royal_2',
    studioId: 'studio_royal_001',
    branchId: 'branch_royal_mum',
    eventNumber: 'ROYAL-EV-102',
    name: 'Singhania & Kapoor Traditional Haldi',
    customerId: 'cust_royal_1',
    customerName: 'Priyanka Singhania & Arjun Kapoor',
    customerPhone: '+91 98210 12345',
    category: 'Haldi',
    startDate: '2026-11-12',
    startTime: '10:00',
    endDate: '2026-11-12',
    endTime: '14:00',
    venue: 'Sea Princess Poolside Lawn',
    venueCity: 'Juhu, Mumbai',
    assignedTeamIds: ['mem_royal_3'],
    leadPhotographerId: 'mem_royal_3',
    priority: 'High',
    status: 'Post-Production',
    notes: 'Yellow color dust and flower petal shower captured in 120fps slow motion.',
    estimatedBudget: 100000,
    advancePaid: 100000,
    deliverables: ['Haldi Highlight Video', '150 Processed Stills'],
    tasksCount: { total: 2, completed: 1 },
    createdAt: '2026-09-18',
    updatedAt: '2026-11-13',
    createdBy: 'usr_kabir'
  },
  {
    id: 'ev_royal_3',
    studioId: 'studio_royal_001',
    branchId: 'branch_royal_mum',
    eventNumber: 'ROYAL-EV-103',
    name: 'FabIndia SS27 Heritage Lookbook',
    customerId: 'cust_royal_3',
    customerName: 'FabIndia Lifestyle Brand (Divya Shah)',
    customerPhone: '+91 99200 65432',
    category: 'Fashion Shoot',
    startDate: '2026-11-10',
    startTime: '09:00',
    endDate: '2026-11-11',
    endTime: '19:00',
    venue: 'Mehboob Studios, Floor 2',
    venueCity: 'Bandra, Mumbai',
    assignedTeamIds: ['mem_royal_1', 'mem_royal_3'],
    leadPhotographerId: 'mem_royal_1',
    priority: 'High',
    status: 'Post-Production',
    notes: 'Color grading silks & khadi textures.',
    estimatedBudget: 220000,
    advancePaid: 140000,
    deliverables: ['120 E-commerce Retouched Cutouts', '40 Campaign Hero Shots'],
    tasksCount: { total: 3, completed: 2 },
    createdAt: '2026-10-28',
    updatedAt: '2026-11-12',
    createdBy: 'usr_aditi'
  }
];

export const tasksA: Task[] = [
  {
    id: 'tsk_royal_1',
    studioId: 'studio_royal_001',
    branchId: 'branch_royal_mum',
    title: 'Dual SD Card Backup & SSD Raid Ingestion',
    description: 'Offload footage from Singhania Haldi into edit server.',
    eventId: 'ev_royal_2',
    eventName: 'Singhania & Kapoor Traditional Haldi',
    assignedToId: 'mem_royal_3',
    assignedToName: 'Vikramaditya Verma',
    priority: 'Urgent',
    status: 'In Progress',
    dueDate: '2026-11-13',
    createdAt: '2026-11-12',
    updatedAt: '2026-11-13',
    createdBy: 'usr_aditi'
  },
  {
    id: 'tsk_royal_2',
    studioId: 'studio_royal_001',
    branchId: 'branch_royal_mum',
    title: 'Match Royal LUTs with Pantone Swatches',
    description: 'Color grade terracotta fabrics for FabIndia catalog.',
    eventId: 'ev_royal_3',
    eventName: 'FabIndia SS27 Heritage Lookbook',
    assignedToId: 'mem_royal_1',
    assignedToName: 'Kabir Sharma',
    priority: 'High',
    status: 'Todo',
    dueDate: '2026-11-15',
    createdAt: '2026-11-11',
    updatedAt: '2026-11-11',
    createdBy: 'usr_aditi'
  }
];

export const notificationsA: StudioNotification[] = [
  {
    id: 'notif_royal_1',
    studioId: 'studio_royal_001',
    title: 'Live Shoot in Progress: Singhania Royal Wedding',
    message: 'Vikramaditya Verma checked in at Taj Lands End.',
    type: 'event',
    timestamp: '16:15 Today',
    read: false,
    linkTab: 'events',
    linkId: 'ev_royal_1',
    createdAt: '2026-11-13T16:15:00Z'
  },
  {
    id: 'notif_royal_2',
    studioId: 'studio_royal_001',
    title: 'Advance Received: ₹2,75,000',
    message: 'Bank transfer confirmed for Singhania wedding milestone.',
    type: 'payment',
    timestamp: '11:00 AM Today',
    read: true,
    linkTab: 'events',
    linkId: 'ev_royal_1',
    createdAt: '2026-11-13T11:00:00Z'
  }
];

// =========================================================================
// STUDIO B: "Creative Wedding Studio" (Goa Beachside & Bangalore Tech Hub)
// =========================================================================
export const studioB: Studio = {
  id: 'studio_creative_002',
  tenantId: 'tenant_creative_goa_002',
  name: 'Creative Wedding Studio',
  tagline: 'Modern Cinematic, Editorial & Candid Beach Weddings',
  logoUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=160&auto=format&fit=crop&q=80',
  phone: '+91 98221 99884',
  email: 'hello@creativeweddingstudio.com',
  address: 'Beachside Villa 7, Morjim Beach Road',
  city: 'Morjim',
  state: 'Goa',
  pincode: '403512',
  gstNumber: '30AACCS4567D1Z3',
  subscription: {
    planId: 'studio_os_monthly',
    planName: 'Studio OS Monthly',
    pricePerMonth: 500,
    currency: 'INR',
    status: 'active',
    validUntil: '2027-04-30',
    autoRenew: true
  },
  settings: {
    defaultCurrency: 'INR',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    allowDirectWhatsApp: true,
    watermarkEnabled: false,
    invoicePrefix: 'CREATIVE-INV',
    eventPrefix: 'CREATIVE-EV'
  },
  storageUsageMb: 1180,
  storageQuotaMb: 15360,
  createdAt: '2026-02-15T09:00:00Z',
  updatedAt: '2026-11-13T12:00:00Z',
  createdBy: 'usr_siddharth'
};

export const branchesB: Branch[] = [
  {
    id: 'branch_creative_goa',
    studioId: 'studio_creative_002',
    name: 'Goa Beachside Hub',
    code: 'GOA-01',
    address: 'Beachside Villa 7, Morjim Beach Road',
    city: 'Goa',
    phone: '+91 98221 99884',
    email: 'goa@creativeweddingstudio.com',
    isMainBranch: true,
    isActive: true,
    createdAt: '2026-02-15',
    updatedAt: '2026-11-01'
  },
  {
    id: 'branch_creative_blr',
    studioId: 'studio_creative_002',
    name: 'Bangalore Indiranagar Studio',
    code: 'BLR-01',
    address: '100 Feet Road, Indiranagar',
    city: 'Bangalore',
    phone: '+91 98450 33221',
    email: 'blr@creativeweddingstudio.com',
    isMainBranch: false,
    isActive: true,
    createdAt: '2026-06-01',
    updatedAt: '2026-11-01'
  }
];

export const membersB: Membership[] = [
  {
    id: 'mem_creative_1',
    userId: 'usr_siddharth',
    studioId: 'studio_creative_002',
    displayName: 'Siddharth Roy',
    email: 'siddharth@creativeweddingstudio.com',
    phone: '+91 98221 99884',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    role: 'owner',
    roleTitle: 'Founder & Executive Director',
    roleIds: ['owner'],
    department: 'Direction',
    branchAssignments: ['branch_creative_goa', 'branch_creative_blr'],
    status: 'active',
    specialization: ['Cinematic Storytelling', 'Beach Sunset Aesthetics', 'FPV Drone Directing'],
    joinedDate: '2026-02-15',
    createdAt: '2026-02-15',
    updatedAt: '2026-11-01'
  },
  {
    id: 'mem_creative_2',
    userId: 'usr_natasha',
    studioId: 'studio_creative_002',
    displayName: 'Natasha Fernandez',
    email: 'natasha@creativeweddingstudio.com',
    phone: '+91 98222 34567',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
    role: 'manager',
    roleTitle: 'Head of Studio Operations (Goa)',
    roleIds: ['manager'],
    department: 'Operations',
    branchAssignments: ['branch_creative_goa'],
    status: 'active',
    specialization: ['Beach Permits', 'Destination Logistics', 'Client Handover'],
    joinedDate: '2026-02-20',
    createdAt: '2026-02-20',
    updatedAt: '2026-11-01'
  },
  {
    id: 'mem_creative_3',
    userId: 'usr_devansh',
    studioId: 'studio_creative_002',
    displayName: 'Devansh Hegde',
    email: 'devansh@creativeweddingstudio.com',
    phone: '+91 98455 11223',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    role: 'cinematographer',
    roleTitle: 'Lead Drone Pilot & Cinematographer',
    roleIds: ['cinematographer'],
    department: 'Video Production',
    branchAssignments: ['branch_creative_blr', 'branch_creative_goa'],
    status: 'active',
    specialization: ['DJI Inspire 3', 'FPV Acro Drone', 'Sony FX6 Multi-cam'],
    joinedDate: '2026-03-01',
    createdAt: '2026-03-01',
    updatedAt: '2026-11-01'
  }
];

export const customersB: Customer[] = [
  {
    id: 'cust_creative_1',
    studioId: 'studio_creative_002',
    branchId: 'branch_creative_goa',
    name: 'Karan Mehra & Sanjana Bhatia',
    phone: '+91 97112 34567',
    email: 'karan.mehra@delhitechnologies.io',
    city: 'Goa',
    notes: 'Morjim beachside sangeet & cocktail. High emphasis on evening reel cuts.',
    totalBookings: 1,
    totalSpent: 180000,
    pendingBalance: 50000,
    tags: ['Destination', 'Beach', 'Reels'],
    createdAt: '2026-10-22',
    updatedAt: '2026-11-10',
    createdBy: 'usr_siddharth'
  },
  {
    id: 'cust_creative_2',
    studioId: 'studio_creative_002',
    branchId: 'branch_creative_blr',
    name: 'Tara Alva & Nikhil Kamath',
    phone: '+91 98450 99887',
    email: 'tara.alva@venturehub.in',
    city: 'Bangalore',
    notes: 'Lawn eco-chic wedding at The Tamarind Tree. Vintage film grading preferred.',
    totalBookings: 2,
    totalSpent: 380000,
    pendingBalance: 0,
    tags: ['Editorial', 'Vintage', 'Indiranagar'],
    createdAt: '2026-09-01',
    updatedAt: '2026-11-05',
    createdBy: 'usr_siddharth'
  }
];

export const eventsB: StudioEvent[] = [
  {
    id: 'ev_creative_1',
    studioId: 'studio_creative_002',
    branchId: 'branch_creative_goa',
    eventNumber: 'CREATIVE-EV-201',
    name: 'Karan & Sanjana Sunset Beach Sangeet',
    customerId: 'cust_creative_1',
    customerName: 'Karan Mehra & Sanjana Bhatia',
    customerPhone: '+91 97112 34567',
    category: 'Sangeet',
    startDate: '2026-11-14',
    startTime: '18:00',
    endDate: '2026-11-15',
    endTime: '01:00',
    venue: 'Marbela Beach Resort',
    venueCity: 'Morjim, Goa',
    assignedTeamIds: ['mem_creative_1', 'mem_creative_3'],
    leadPhotographerId: 'mem_creative_1',
    priority: 'High',
    status: 'Confirmed',
    notes: 'Low light dance floor coverage. High ISO capable Sony bodies ready.',
    estimatedBudget: 180000,
    advancePaid: 130000,
    deliverables: ['Sangeet Highlight Reel', '250 Candid Photos', '5 Vertical Reels'],
    tasksCount: { total: 3, completed: 1 },
    createdAt: '2026-10-23',
    updatedAt: '2026-11-10',
    createdBy: 'usr_siddharth'
  },
  {
    id: 'ev_creative_2',
    studioId: 'studio_creative_002',
    branchId: 'branch_creative_blr',
    eventNumber: 'CREATIVE-EV-202',
    name: 'Tara & Nikhil Eco-Chic Lawn Wedding',
    customerId: 'cust_creative_2',
    customerName: 'Tara Alva & Nikhil Kamath',
    customerPhone: '+91 98450 99887',
    category: 'Wedding',
    startDate: '2026-11-20',
    startTime: '11:00',
    endDate: '2026-11-20',
    endTime: '22:00',
    venue: 'The Tamarind Tree Heritage Villa',
    venueCity: 'Bangalore, Karnataka',
    assignedTeamIds: ['mem_creative_1', 'mem_creative_3'],
    leadPhotographerId: 'mem_creative_1',
    priority: 'Urgent',
    status: 'Confirmed',
    notes: 'Natural daylight tree canopy shoot. 35mm film simulation requested.',
    estimatedBudget: 280000,
    advancePaid: 200000,
    deliverables: ['Full Feature 30min Film', '500 Curated Analog Grade Photos'],
    tasksCount: { total: 2, completed: 0 },
    createdAt: '2026-10-15',
    updatedAt: '2026-11-08',
    createdBy: 'usr_siddharth'
  }
];

export const tasksB: Task[] = [
  {
    id: 'tsk_creative_1',
    studioId: 'studio_creative_002',
    branchId: 'branch_creative_goa',
    title: 'Confirm Coastal DGCA Drone Clearance with Morjim Police',
    description: 'Ensure sunset drone flight is permitted along beach perimeter.',
    eventId: 'ev_creative_1',
    eventName: 'Karan & Sanjana Sunset Beach Sangeet',
    assignedToId: 'mem_creative_2',
    assignedToName: 'Natasha Fernandez',
    priority: 'High',
    status: 'In Progress',
    dueDate: '2026-11-14',
    createdAt: '2026-11-11',
    updatedAt: '2026-11-13',
    createdBy: 'usr_siddharth'
  }
];

export const notificationsB: StudioNotification[] = [
  {
    id: 'notif_creative_1',
    studioId: 'studio_creative_002',
    title: 'New Booking Confirmed: Tara & Nikhil Bangalore',
    message: 'The Tamarind Tree shoot locked for Nov 20.',
    type: 'event',
    timestamp: '2 hours ago',
    read: false,
    linkTab: 'events',
    linkId: 'ev_creative_2',
    createdAt: '2026-11-13T15:00:00Z'
  }
];

// =========================================================================
// PHASE 4 DEMO DATA: SUB-EVENTS, EMPLOYEES, SALARY PROFILES, LEAVE REQUESTS
// =========================================================================

// Sub-events for Studio A
export const subEventsA = [
  {
    id: 'sub_royal_1',
    studioId: 'studio_royal_001',
    parentEventId: 'ev_royal_1',
    subEventNumber: 'ROYAL-EV-101-S01',
    name: 'Engagement & Ring Exchange',
    customCategory: 'Engagement',
    date: '2026-11-10',
    startTime: '18:00',
    endTime: '22:00',
    venue: 'Taj Lands End Crystal Lounge',
    address: 'BJ Road, Bandra West, Mumbai',
    assignedMemberIds: ['mem_royal_3'],
    assignedMembers: [
      { memberId: 'mem_royal_3', memberName: 'Vikramaditya Verma', roleTitle: 'Senior Lead Photographer', department: 'Photography' }
    ],
    requiredTeamSize: 2,
    priority: 'High' as const,
    status: 'Completed' as const,
    instructions: 'Capture couple entrance, ring lighting and grandparent toasts.',
    sortOrder: 0,
    createdAt: '2026-09-15T10:00:00Z',
    updatedAt: '2026-11-10T23:00:00Z'
  },
  {
    id: 'sub_royal_2',
    studioId: 'studio_royal_001',
    parentEventId: 'ev_royal_1',
    subEventNumber: 'ROYAL-EV-101-S02',
    name: 'Ganesh Sthapana & Mandvo',
    customCategory: 'Mandvo',
    date: '2026-11-11',
    startTime: '09:00',
    endTime: '12:30',
    venue: 'Singhania Villa Courtyard',
    address: 'Pali Hill, Bandra West, Mumbai',
    assignedMemberIds: ['mem_royal_1'],
    assignedMembers: [
      { memberId: 'mem_royal_1', memberName: 'Kabir Sharma', roleTitle: 'Studio Founder', department: 'Creative Direction' }
    ],
    requiredTeamSize: 1,
    priority: 'Medium' as const,
    status: 'Completed' as const,
    instructions: 'Traditional rituals, Vedic havan closeups and family portraits.',
    sortOrder: 1,
    createdAt: '2026-09-15T10:00:00Z',
    updatedAt: '2026-11-11T13:00:00Z'
  },
  {
    id: 'sub_royal_3',
    studioId: 'studio_royal_001',
    parentEventId: 'ev_royal_1',
    subEventNumber: 'ROYAL-EV-101-S03',
    name: 'Haldi & Pithi Ritual',
    customCategory: 'Pithi',
    date: '2026-11-11',
    startTime: '14:00',
    endTime: '17:30',
    venue: 'Singhania Garden Lawn',
    address: 'Pali Hill, Bandra West, Mumbai',
    assignedMemberIds: ['mem_royal_3'],
    assignedMembers: [
      { memberId: 'mem_royal_3', memberName: 'Vikramaditya Verma', roleTitle: 'Lead Photographer', department: 'Photography' }
    ],
    requiredTeamSize: 2,
    priority: 'High' as const,
    status: 'Completed' as const,
    instructions: '120fps slow-motion water splash and marigold petal throw.',
    sortOrder: 2,
    createdAt: '2026-09-15T10:00:00Z',
    updatedAt: '2026-11-11T18:00:00Z'
  },
  {
    id: 'sub_royal_4',
    studioId: 'studio_royal_001',
    parentEventId: 'ev_royal_1',
    subEventNumber: 'ROYAL-EV-101-S04',
    name: 'Intimate Bridal Mehndi',
    customCategory: 'Mehndi',
    date: '2026-11-12',
    startTime: '11:00',
    endTime: '15:00',
    venue: 'Sea Princess Poolside Cabana',
    address: 'Juhu Beach, Mumbai',
    assignedMemberIds: ['mem_royal_3'],
    assignedMembers: [
      { memberId: 'mem_royal_3', memberName: 'Vikramaditya Verma', roleTitle: 'Lead Photographer', department: 'Photography' }
    ],
    requiredTeamSize: 2,
    priority: 'Medium' as const,
    status: 'Completed' as const,
    instructions: 'Macro detail of bridal henna art, hidden groom initials.',
    sortOrder: 3,
    createdAt: '2026-09-15T10:00:00Z',
    updatedAt: '2026-11-12T16:00:00Z'
  },
  {
    id: 'sub_royal_5',
    studioId: 'studio_royal_001',
    parentEventId: 'ev_royal_1',
    subEventNumber: 'ROYAL-EV-101-S05',
    name: 'Sanji & Grand Bollywood Sangeet',
    customCategory: 'Sanji',
    date: '2026-11-12',
    startTime: '19:00',
    endTime: '01:00',
    venue: 'Taj Lands End Sea View Ballroom',
    address: 'BJ Road, Bandra West, Mumbai',
    assignedMemberIds: ['mem_royal_1', 'mem_royal_3'],
    assignedMembers: [
      { memberId: 'mem_royal_1', memberName: 'Kabir Sharma', roleTitle: 'Studio Founder', department: 'Creative Direction' },
      { memberId: 'mem_royal_3', memberName: 'Vikramaditya Verma', roleTitle: 'Lead Photographer', department: 'Photography' }
    ],
    requiredTeamSize: 4,
    priority: 'Urgent' as const,
    status: 'Completed' as const,
    instructions: '3-camera dance floor setup with wireless gimbal stabilizer.',
    sortOrder: 4,
    createdAt: '2026-09-15T10:00:00Z',
    updatedAt: '2026-11-13T01:30:00Z'
  },
  {
    id: 'sub_royal_6',
    studioId: 'studio_royal_001',
    parentEventId: 'ev_royal_1',
    subEventNumber: 'ROYAL-EV-101-S06',
    name: 'Baraat, Varmala & Vedic Wedding Ceremony',
    customCategory: 'Wedding Ceremony',
    date: '2026-11-13',
    startTime: '16:00',
    endTime: '22:00',
    venue: 'Taj Lands End Seaside Amphitheatre',
    address: 'BJ Road, Bandra West, Mumbai',
    assignedMemberIds: ['mem_royal_1', 'mem_royal_3'],
    assignedMembers: [
      { memberId: 'mem_royal_1', memberName: 'Kabir Sharma', roleTitle: 'Studio Founder', department: 'Creative Direction' },
      { memberId: 'mem_royal_3', memberName: 'Vikramaditya Verma', roleTitle: 'Lead Photographer', department: 'Photography' }
    ],
    requiredTeamSize: 5,
    priority: 'Urgent' as const,
    status: 'In Progress' as const,
    instructions: 'Drone fly-over on Baraat arrival. Direct audio feed from Panditji mic.',
    sortOrder: 5,
    createdAt: '2026-09-15T10:00:00Z',
    updatedAt: '2026-11-13T16:00:00Z'
  },
  {
    id: 'sub_royal_7',
    studioId: 'studio_royal_001',
    parentEventId: 'ev_royal_1',
    subEventNumber: 'ROYAL-EV-101-S07',
    name: 'Royal Black Tie Reception',
    customCategory: 'Reception',
    date: '2026-11-14',
    startTime: '19:30',
    endTime: '23:45',
    venue: 'Taj Lands End Grand Ballroom',
    address: 'BJ Road, Bandra West, Mumbai',
    assignedMemberIds: ['mem_royal_3'],
    assignedMembers: [
      { memberId: 'mem_royal_3', memberName: 'Vikramaditya Verma', roleTitle: 'Lead Photographer', department: 'Photography' }
    ],
    requiredTeamSize: 3,
    priority: 'High' as const,
    status: 'Confirmed' as const,
    instructions: 'VIP stage portraits, cake cutting and evening jazz performance.',
    sortOrder: 6,
    createdAt: '2026-09-15T10:00:00Z',
    updatedAt: '2026-11-13T10:00:00Z'
  },
  {
    id: 'sub_royal_8',
    studioId: 'studio_royal_001',
    parentEventId: 'ev_royal_1',
    subEventNumber: 'ROYAL-EV-101-S08',
    name: 'Emotional Vidaai & Departure',
    customCategory: 'Vidaai',
    date: '2026-11-14',
    startTime: '23:45',
    endTime: '01:00',
    venue: 'Taj Lands End Royal Porch',
    address: 'BJ Road, Bandra West, Mumbai',
    assignedMemberIds: ['mem_royal_3'],
    assignedMembers: [
      { memberId: 'mem_royal_3', memberName: 'Vikramaditya Verma', roleTitle: 'Lead Photographer', department: 'Photography' }
    ],
    requiredTeamSize: 2,
    priority: 'High' as const,
    status: 'Tentative' as const,
    instructions: 'Sensitive prime lens candid shots, ambient low-light mood.',
    sortOrder: 7,
    createdAt: '2026-09-15T10:00:00Z',
    updatedAt: '2026-11-13T10:00:00Z'
  }
];

export const subEventsB = [
  {
    id: 'sub_creative_1',
    studioId: 'studio_creative_002',
    parentEventId: 'ev_creative_1',
    subEventNumber: 'CRT-EV-201-S01',
    name: 'Sunset Beachfront Sangeet & Sundowner',
    customCategory: 'Sangeet',
    date: '2026-11-14',
    startTime: '16:30',
    endTime: '22:00',
    venue: 'W Goa Rockpool Lawn',
    address: 'Vagator Beach, Goa',
    assignedMemberIds: ['mem_creative_1', 'mem_creative_2'],
    assignedMembers: [
      { memberId: 'mem_creative_1', memberName: 'Siddharth Rao', roleTitle: 'Creative Director', department: 'Direction' },
      { memberId: 'mem_creative_2', memberName: 'Natasha Fernandez', roleTitle: 'Cinematographer', department: 'Cinematography' }
    ],
    requiredTeamSize: 3,
    priority: 'High' as const,
    status: 'Confirmed' as const,
    instructions: 'Golden hour drone shots and fire dance performances.',
    sortOrder: 0,
    createdAt: '2026-10-02T10:00:00Z',
    updatedAt: '2026-11-12T10:00:00Z'
  }
];

// Employees for Studio A
export const employeesA = [
  {
    id: 'emp_royal_1',
    studioId: 'studio_royal_001',
    userId: 'usr_kabir',
    employeeNumber: 'EMP-001',
    fullName: 'Kabir Sharma',
    profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    phone: '+91 98201 44552',
    email: 'kabir@royalphotography.in',
    address: 'Bandra West, Mumbai',
    joiningDate: '2026-01-01',
    department: 'Creative Direction',
    designation: 'Studio Founder & Creative Director',
    assignedBranchId: 'branch_royal_mum',
    assignedBranchName: 'Bandra Flagship Studio',
    roleId: 'role_studio_royal_001_1',
    roleName: 'Studio Owner',
    employmentStatus: 'active' as const,
    emergencyContact: { name: 'Sunita Sharma', relationship: 'Mother', phone: '+91 98201 99887' },
    notes: 'Studio founder with executive signoff rights.',
    loginCredentials: { loginId: 'kabir@royalphotography.in', hasAccess: true, lastPasswordReset: '2026-01-01T10:00:00Z' },
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-11-01T10:00:00Z'
  },
  {
    id: 'emp_royal_2',
    studioId: 'studio_royal_001',
    userId: 'usr_aditi',
    employeeNumber: 'EMP-002',
    fullName: 'Aditi Rao',
    profilePhoto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
    phone: '+91 98202 77112',
    email: 'aditi@royalphotography.in',
    address: 'Khar West, Mumbai',
    joiningDate: '2026-01-05',
    department: 'Operations',
    designation: 'Studio Operations Manager',
    assignedBranchId: 'branch_royal_mum',
    assignedBranchName: 'Bandra Flagship Studio',
    roleId: 'role_studio_royal_001_3',
    roleName: 'Manager',
    employmentStatus: 'active' as const,
    emergencyContact: { name: 'Kunal Rao', relationship: 'Spouse', phone: '+91 98202 33441' },
    notes: 'Oversees crew scheduling and client coordination.',
    loginCredentials: { loginId: 'aditi@royalphotography.in', hasAccess: true, lastPasswordReset: '2026-01-05T10:00:00Z' },
    createdAt: '2026-01-05T10:00:00Z',
    updatedAt: '2026-11-01T10:00:00Z'
  },
  {
    id: 'emp_royal_3',
    studioId: 'studio_royal_001',
    userId: 'usr_vikram',
    employeeNumber: 'EMP-003',
    fullName: 'Vikramaditya Verma',
    profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    phone: '+91 98203 11890',
    email: 'vikram@royalphotography.in',
    address: 'Andheri West, Mumbai',
    joiningDate: '2026-02-01',
    department: 'Photography',
    designation: 'Senior Lead Photographer',
    assignedBranchId: 'branch_royal_mum',
    assignedBranchName: 'Bandra Flagship Studio',
    roleId: 'role_studio_royal_001_4',
    roleName: 'Photographer',
    employmentStatus: 'active' as const,
    emergencyContact: { name: 'Pooja Verma', relationship: 'Sister', phone: '+91 98203 88990' },
    notes: 'Prime specialist for bridal portraits.',
    loginCredentials: { loginId: 'vikram@royalphotography.in', hasAccess: true, lastPasswordReset: '2026-02-01T10:00:00Z' },
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-11-01T10:00:00Z'
  },
  {
    id: 'emp_royal_4',
    studioId: 'studio_royal_001',
    userId: 'usr_neha',
    employeeNumber: 'EMP-004',
    fullName: 'Neha Kapoor',
    profilePhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
    phone: '+91 98204 55667',
    email: 'neha@royalphotography.in',
    address: 'Santacruz West, Mumbai',
    joiningDate: '2026-03-01',
    department: 'Post-Production',
    designation: 'Senior Colorist & Video Editor',
    assignedBranchId: 'branch_royal_mum',
    assignedBranchName: 'Bandra Flagship Studio',
    roleId: 'role_studio_royal_001_7',
    roleName: 'Video Editor',
    employmentStatus: 'active' as const,
    emergencyContact: { name: 'Rajesh Kapoor', relationship: 'Father', phone: '+91 98204 11223' },
    notes: 'Apple certified video editor.',
    loginCredentials: { loginId: 'neha@royalphotography.in', hasAccess: true, lastPasswordReset: '2026-03-01T10:00:00Z' },
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-11-01T10:00:00Z'
  }
];

export const employeesB = [
  {
    id: 'emp_creative_1',
    studioId: 'studio_creative_002',
    userId: 'usr_siddharth',
    employeeNumber: 'EMP-001',
    fullName: 'Siddharth Rao',
    phone: '+91 98860 33441',
    email: 'siddharth@creativewedding.in',
    joiningDate: '2026-01-10',
    department: 'Creative Direction',
    designation: 'Studio Owner & Lead Cinematographer',
    roleId: 'role_studio_creative_002_1',
    roleName: 'Studio Owner',
    employmentStatus: 'active' as const,
    emergencyContact: { name: 'Aarti Rao', relationship: 'Spouse', phone: '+91 98860 11223' },
    notes: 'Creative lead for Goa destination shoots.',
    loginCredentials: { loginId: 'siddharth@creativewedding.in', hasAccess: true },
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-11-01T10:00:00Z'
  }
];

// Salary Profiles (Restricted)
export const salaryProfilesA = [
  {
    id: 'sal_royal_1',
    studioId: 'studio_royal_001',
    employeeId: 'emp_royal_1',
    employeeName: 'Kabir Sharma',
    salaryType: 'monthly' as const,
    monthlySalary: 150000,
    dailySalary: 5000,
    paymentMethod: 'bank_transfer' as const,
    salaryStartDate: '2026-01-01',
    allowances: [{ id: 'al_1', name: 'Director Allowance', amount: 25000 }],
    bonuses: [{ id: 'bn_1', name: 'Quarterly Profit Share', amount: 35000 }],
    deductions: [{ id: 'dd_1', name: 'TDS Deduction', amount: 15000 }],
    advanceSalary: 0,
    leaveAdjustments: 0,
    netPayableSalary: 195000,
    paymentStatus: 'paid' as const,
    paymentDate: '2026-11-01',
    notes: 'Executive director payroll profile.',
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-11-01T10:00:00Z'
  },
  {
    id: 'sal_royal_2',
    studioId: 'studio_royal_001',
    employeeId: 'emp_royal_2',
    employeeName: 'Aditi Rao',
    salaryType: 'monthly' as const,
    monthlySalary: 75000,
    dailySalary: 2500,
    paymentMethod: 'bank_transfer' as const,
    salaryStartDate: '2026-01-05',
    allowances: [{ id: 'al_2', name: 'Operations Travel', amount: 8000 }],
    bonuses: [],
    deductions: [{ id: 'dd_2', name: 'TDS Deduction', amount: 5000 }],
    advanceSalary: 0,
    leaveAdjustments: 0,
    netPayableSalary: 78000,
    paymentStatus: 'paid' as const,
    paymentDate: '2026-11-01',
    notes: 'Operations manager payroll.',
    createdAt: '2026-01-05T10:00:00Z',
    updatedAt: '2026-11-01T10:00:00Z'
  },
  {
    id: 'sal_royal_3',
    studioId: 'studio_royal_001',
    employeeId: 'emp_royal_3',
    employeeName: 'Vikramaditya Verma',
    salaryType: 'monthly' as const,
    monthlySalary: 60000,
    dailySalary: 2000,
    paymentMethod: 'bank_transfer' as const,
    salaryStartDate: '2026-02-01',
    allowances: [{ id: 'al_3', name: 'Camera Gear Maintenance', amount: 6000 }],
    bonuses: [{ id: 'bn_3', name: 'Diwali Shoot Bonus', amount: 10000 }],
    deductions: [{ id: 'dd_3', name: 'Professional Tax', amount: 200 }],
    advanceSalary: 5000,
    leaveAdjustments: 0,
    netPayableSalary: 70800,
    paymentStatus: 'paid' as const,
    paymentDate: '2026-11-01',
    notes: 'Senior lead photographer base.',
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-11-01T10:00:00Z'
  },
  {
    id: 'sal_royal_4',
    studioId: 'studio_royal_001',
    employeeId: 'emp_royal_4',
    employeeName: 'Neha Kapoor',
    salaryType: 'monthly' as const,
    monthlySalary: 45000,
    dailySalary: 1500,
    paymentMethod: 'upi' as const,
    salaryStartDate: '2026-03-01',
    allowances: [{ id: 'al_4', name: 'High-Speed Editing Cloud Allowance', amount: 3500 }],
    bonuses: [],
    deductions: [{ id: 'dd_4', name: 'Professional Tax', amount: 200 }],
    advanceSalary: 0,
    leaveAdjustments: 0,
    netPayableSalary: 48300,
    paymentStatus: 'paid' as const,
    paymentDate: '2026-11-01',
    notes: 'Video editor base salary.',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-11-01T10:00:00Z'
  }
];

export const salaryProfilesB = [
  {
    id: 'sal_creative_1',
    studioId: 'studio_creative_002',
    employeeId: 'emp_creative_1',
    employeeName: 'Siddharth Rao',
    salaryType: 'monthly' as const,
    monthlySalary: 120000,
    dailySalary: 4000,
    paymentMethod: 'bank_transfer' as const,
    salaryStartDate: '2026-01-10',
    allowances: [],
    bonuses: [],
    deductions: [],
    advanceSalary: 0,
    leaveAdjustments: 0,
    netPayableSalary: 120000,
    paymentStatus: 'pending' as const,
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-11-01T10:00:00Z'
  }
];

// Leave Requests
export const leaveRequestsA = [
  {
    id: 'lvr_royal_1',
    studioId: 'studio_royal_001',
    employeeId: 'emp_royal_3',
    employeeName: 'Vikramaditya Verma',
    leaveTypeId: 'lt_studio_royal_001_1',
    leaveTypeName: 'Casual Leave',
    startDate: '2026-11-18',
    endDate: '2026-11-19',
    totalDays: 2,
    reason: 'Family function in Pune after Singhania wedding completion.',
    status: 'pending' as const,
    appliedAt: '2026-11-12T11:00:00Z'
  },
  {
    id: 'lvr_royal_2',
    studioId: 'studio_royal_001',
    employeeId: 'emp_royal_4',
    employeeName: 'Neha Kapoor',
    leaveTypeId: 'lt_studio_royal_001_2',
    leaveTypeName: 'Sick Leave',
    startDate: '2026-11-13',
    endDate: '2026-11-13',
    totalDays: 1,
    reason: 'Severe eye strain from 4K color grade session; physician advised one day rest.',
    status: 'approved' as const,
    appliedAt: '2026-11-12T18:00:00Z',
    reviewedBy: 'usr_aditi',
    reviewedByName: 'Aditi Rao',
    reviewedAt: '2026-11-12T19:00:00Z'
  }
];

export const leaveRequestsB = [
  {
    id: 'lvr_creative_1',
    studioId: 'studio_creative_002',
    employeeId: 'emp_creative_1',
    employeeName: 'Siddharth Rao',
    leaveTypeId: 'lt_studio_creative_002_1',
    leaveTypeName: 'Personal Leave',
    startDate: '2026-11-25',
    endDate: '2026-11-26',
    totalDays: 2,
    reason: 'Attending Mumbai photo expo.',
    status: 'pending' as const,
    appliedAt: '2026-11-11T10:00:00Z'
  }
];

