import { TenantStore } from './tenantStore';
import { firestoreService } from './firestoreService';
import { StudioEvent, Customer, SubEvent, Quotation, Invoice, Payment } from '../types/schema';
import { BookingRecord, FunctionPlan, DeliverableSpecification } from '../types/bookingProduction';
import { generateDeliverablesForCategory } from './deliverablesPresetService';

export const CALENDAR_TEST_FLAG = 'shreeji_calendar_test_bookings_v1';

export interface CalendarDemoBookingDef {
  id: string;
  bkgNum: string;
  eventName: string;
  category: string;
  customerName: string;
  phone: string;
  email: string;
  city: string;
  venue: string;
  date: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  status: 'Confirmed' | 'Shooting' | 'Post-Production' | 'Delivered' | 'Completed';
  bookingStatus: 'deal_confirmed' | 'advance_received' | 'in_production' | 'fully_delivered' | 'completed';
  quotedPrice: number;
  discount: number;
  finalAgreedAmount: number;
  paymentReceived: number;
  paymentMethod: 'UPI' | 'Bank Transfer' | 'Cash' | 'Card';
  leadPhotographerId: string;
  crewIds: string[];
  subEvents: Array<{
    name: string;
    category: string;
    date: string;
    startTime: string;
    endTime: string;
    venue: string;
  }>;
}

export const CALENDAR_DEMO_BOOKINGS: CalendarDemoBookingDef[] = [
  // 1. 18 Nov 2026: Pre-Wedding Shoot, Ahmedabad
  {
    id: 'bkg_shr_cal_01',
    bkgNum: 'SHR-CAL-2026-001',
    eventName: 'Kavish & Ananya Sunset Pre-Wedding Shoot',
    category: 'Pre-Wedding',
    customerName: 'Kavish Shah',
    phone: '+91 98251 30001',
    email: 'kavish.shah@client.in',
    city: 'Ahmedabad',
    venue: 'Sabarmati Riverfront & Adalaj Stepwell',
    date: '2026-11-18',
    startTime: '06:00',
    endTime: '19:00',
    status: 'Confirmed',
    bookingStatus: 'advance_received',
    quotedPrice: 65000,
    discount: 5000,
    finalAgreedAmount: 60000,
    paymentReceived: 30000,
    paymentMethod: 'UPI',
    leadPhotographerId: 'emp_shr_rahul',
    crewIds: ['emp_shr_rahul', 'emp_shr_karan', 'emp_shr_meet'],
    subEvents: [
      { name: 'Sunrise Heritage Portraits', category: 'Pre-Wedding', date: '2026-11-18', startTime: '06:00', endTime: '11:00', venue: 'Adalaj Stepwell' },
      { name: 'Golden Hour Cinematic Drone Session', category: 'Pre-Wedding', date: '2026-11-18', startTime: '15:30', endTime: '19:00', venue: 'Sabarmati Riverfront Walkway' }
    ]
  },

  // 2. 20 Nov 2026: Wedding, Gandhinagar (First event on 20 Nov)
  {
    id: 'bkg_shr_cal_02',
    bkgNum: 'SHR-CAL-2026-002',
    eventName: 'Parth & Ritu Grand Royal Wedding',
    category: 'Wedding',
    customerName: 'Parth Trivedi',
    phone: '+91 98251 30002',
    email: 'parth.trivedi@client.in',
    city: 'Gandhinagar',
    venue: 'The Leela Palace Gandhinagar',
    date: '2026-11-20',
    endDate: '2026-11-20',
    startTime: '09:00',
    endTime: '23:30',
    status: 'Confirmed',
    bookingStatus: 'advance_received',
    quotedPrice: 195000,
    discount: 15000,
    finalAgreedAmount: 180000,
    paymentReceived: 90000,
    paymentMethod: 'Bank Transfer',
    leadPhotographerId: 'emp_shr_rahul',
    crewIds: ['emp_shr_rahul', 'emp_shr_karan', 'emp_shr_vishal', 'emp_shr_meet', 'emp_shr_jay'],
    subEvents: [
      { name: 'Baraat & Swagat', category: 'Wedding', date: '2026-11-20', startTime: '09:00', endTime: '12:00', venue: 'The Leela Palace Grand Porch' },
      { name: 'Hasta Melap & Varmala', category: 'Wedding', date: '2026-11-20', startTime: '12:30', endTime: '16:00', venue: 'The Leela Palace Royal Lawn' },
      { name: 'Evening Reception Gala', category: 'Reception', date: '2026-11-20', startTime: '19:30', endTime: '23:30', venue: 'The Leela Palace Banquet Hall' }
    ]
  },

  // 3. 20 Nov 2026: Birthday Shoot, Ahmedabad (Second event on 20 Nov — MULTIPLE SAME DAY!)
  {
    id: 'bkg_shr_cal_03',
    bkgNum: 'SHR-CAL-2026-003',
    eventName: 'Samarth 5th Birthday Jubilee Extravaganza',
    category: 'Birthday',
    customerName: 'Bhavin Patel',
    phone: '+91 98251 30003',
    email: 'bhavin.patel@client.in',
    city: 'Ahmedabad',
    venue: 'Gulmohar Greens Golf & Country Club, Sanand Road',
    date: '2026-11-20',
    startTime: '16:00',
    endTime: '21:00',
    status: 'Confirmed',
    bookingStatus: 'advance_received',
    quotedPrice: 35000,
    discount: 3000,
    finalAgreedAmount: 32000,
    paymentReceived: 16000,
    paymentMethod: 'UPI',
    leadPhotographerId: 'emp_shr_dhruv',
    crewIds: ['emp_shr_dhruv', 'emp_shr_aman'],
    subEvents: [
      { name: 'Birthday Cake Cutting & Carnival Games', category: 'Birthday', date: '2026-11-20', startTime: '16:30', endTime: '20:30', venue: 'Gulmohar Greens Poolside Lawn' }
    ]
  },

  // 4. 24 Nov 2026: Corporate Photography, Surat
  {
    id: 'bkg_shr_cal_04',
    bkgNum: 'SHR-CAL-2026-004',
    eventName: 'Zydus Healthcare Annual Leadership Conclave',
    category: 'Corporate',
    customerName: 'Dr. Alok Verma',
    phone: '+91 98251 30004',
    email: 'alok.verma@zydusconclave.in',
    city: 'Surat',
    venue: 'Surat Marriott Hotel, Dumas Road',
    date: '2026-11-24',
    startTime: '08:30',
    endTime: '19:30',
    status: 'Confirmed',
    bookingStatus: 'deal_confirmed',
    quotedPrice: 75000,
    discount: 5000,
    finalAgreedAmount: 70000,
    paymentReceived: 35000,
    paymentMethod: 'Bank Transfer',
    leadPhotographerId: 'emp_shr_meet',
    crewIds: ['emp_shr_meet', 'emp_shr_vishal', 'emp_shr_riya'],
    subEvents: [
      { name: 'Executive Keynotes & Product Launches', category: 'Corporate', date: '2026-11-24', startTime: '09:00', endTime: '14:00', venue: 'Crystal Ballroom' },
      { name: 'Awards Ceremony & Networking Dinner', category: 'Corporate', date: '2026-11-24', startTime: '16:00', endTime: '19:30', venue: 'Marriott Terrace' }
    ]
  },

  // 5. 29 Nov 2026: Engagement, Vadodara
  {
    id: 'bkg_shr_cal_05',
    bkgNum: 'SHR-CAL-2026-005',
    eventName: 'Dev & Radhika Royal Ring Ceremony',
    category: 'Engagement',
    customerName: 'Devang Joshi',
    phone: '+91 98251 30005',
    email: 'devang.joshi@client.in',
    city: 'Vadodara',
    venue: 'Lukshmi Villas Palace Grounds, Vadodara',
    date: '2026-11-29',
    startTime: '17:00',
    endTime: '23:00',
    status: 'Confirmed',
    bookingStatus: 'advance_received',
    quotedPrice: 85000,
    discount: 7000,
    finalAgreedAmount: 78000,
    paymentReceived: 40000,
    paymentMethod: 'UPI',
    leadPhotographerId: 'emp_shr_rahul',
    crewIds: ['emp_shr_rahul', 'emp_shr_karan', 'emp_shr_priya'],
    subEvents: [
      { name: 'Sagai Ritual & Ring Exchange', category: 'Engagement', date: '2026-11-29', startTime: '17:30', endTime: '20:30', venue: 'Palace Durbar Hall' },
      { name: 'Celebration Banquet & Music', category: 'Engagement', date: '2026-11-29', startTime: '20:30', endTime: '23:00', venue: 'Palace Royal Lawn' }
    ]
  },

  // 6. 05 Dec 2026: Wedding, Rajkot
  {
    id: 'bkg_shr_cal_06',
    bkgNum: 'SHR-CAL-2026-006',
    eventName: 'Ketan & Pooja Saurashtra Heritage Wedding',
    category: 'Wedding',
    customerName: 'Ketan Jadeja',
    phone: '+91 98251 30006',
    email: 'ketan.jadeja@client.in',
    city: 'Rajkot',
    venue: 'Regency Lagoon Resort, Kalawad Road, Rajkot',
    date: '2026-12-05',
    startTime: '10:00',
    endTime: '22:00',
    status: 'Confirmed',
    bookingStatus: 'advance_received',
    quotedPrice: 160000,
    discount: 10000,
    finalAgreedAmount: 150000,
    paymentReceived: 75000,
    paymentMethod: 'Bank Transfer',
    leadPhotographerId: 'emp_shr_rahul',
    crewIds: ['emp_shr_rahul', 'emp_shr_vishal', 'emp_shr_jay', 'emp_shr_neel'],
    subEvents: [
      { name: 'Lagna Vidhi & Saat Phere', category: 'Wedding', date: '2026-12-05', startTime: '10:30', endTime: '15:00', venue: 'Lagoon Heritage Mandap' }
    ]
  },

  // 7. 12 Dec 2026: Haldi & Mehndi, Anand
  {
    id: 'bkg_shr_cal_07',
    bkgNum: 'SHR-CAL-2026-007',
    eventName: 'Meera Haldi & Floral Mehndi Fiesta',
    category: 'Haldi',
    customerName: 'Meera Patel',
    phone: '+91 98251 30007',
    email: 'meera.patel@client.in',
    city: 'Anand',
    venue: 'Madhuban Resort & Spa, Anand',
    date: '2026-12-12',
    startTime: '09:30',
    endTime: '18:00',
    status: 'Confirmed',
    bookingStatus: 'advance_received',
    quotedPrice: 55000,
    discount: 5000,
    finalAgreedAmount: 50000,
    paymentReceived: 25000,
    paymentMethod: 'UPI',
    leadPhotographerId: 'emp_shr_karan',
    crewIds: ['emp_shr_karan', 'emp_shr_priya', 'emp_shr_aman'],
    subEvents: [
      { name: 'Sunlit Haldi & Flower Shower', category: 'Haldi', date: '2026-12-12', startTime: '10:00', endTime: '13:00', venue: 'Banyan Tree Lawn' },
      { name: 'Traditional Henna & Dhol Night', category: 'Mehndi', date: '2026-12-12', startTime: '14:30', endTime: '18:00', venue: 'Courtyard Mandap' }
    ]
  },

  // 8. 20 Dec 2026: Reception, Ahmedabad
  {
    id: 'bkg_shr_cal_08',
    bkgNum: 'SHR-CAL-2026-008',
    eventName: 'Sanjay & Tanvi Grand Palace Reception',
    category: 'Reception',
    customerName: 'Sanjay Shah',
    phone: '+91 98251 30008',
    email: 'sanjay.shah@client.in',
    city: 'Ahmedabad',
    venue: 'Crowne Plaza Ahmedabad City Centre',
    date: '2026-12-20',
    startTime: '19:00',
    endTime: '23:30',
    status: 'Confirmed',
    bookingStatus: 'advance_received',
    quotedPrice: 70000,
    discount: 5000,
    finalAgreedAmount: 65000,
    paymentReceived: 35000,
    paymentMethod: 'Card',
    leadPhotographerId: 'emp_shr_rahul',
    crewIds: ['emp_shr_rahul', 'emp_shr_meet', 'emp_shr_kavya'],
    subEvents: [
      { name: 'Red Carpet Welcoming & Stage Portraits', category: 'Reception', date: '2026-12-20', startTime: '19:30', endTime: '23:00', venue: 'Grand Ballroom' }
    ]
  },

  // 9. 10 Jan 2027: Product Photography, Ahmedabad
  {
    id: 'bkg_shr_cal_09',
    bkgNum: 'SHR-CAL-2027-009',
    eventName: 'Kala Cotton Luxury Apparel Lookbook',
    category: 'Product Photography',
    customerName: 'Nandini Mehta',
    phone: '+91 98251 30009',
    email: 'nandini.mehta@kalacotton.in',
    city: 'Ahmedabad',
    venue: 'Shreeji Studio Ambient Floor, Bodakdev',
    date: '2027-01-10',
    startTime: '10:00',
    endTime: '17:00',
    status: 'Confirmed',
    bookingStatus: 'deal_confirmed',
    quotedPrice: 45000,
    discount: 3000,
    finalAgreedAmount: 42000,
    paymentReceived: 21000,
    paymentMethod: 'UPI',
    leadPhotographerId: 'emp_shr_dhruv',
    crewIds: ['emp_shr_dhruv', 'emp_shr_priya'],
    subEvents: [
      { name: 'Studio Editorial Lookbook Shoot', category: 'Product Photography', date: '2027-01-10', startTime: '10:00', endTime: '16:30', venue: 'Studio Stage A' }
    ]
  },

  // 10. 24 Jan 2027: Wedding, Junagadh
  {
    id: 'bkg_shr_cal_10',
    bkgNum: 'SHR-CAL-2027-010',
    eventName: 'Harsh & Mansi Gir Heritage Wedding',
    category: 'Wedding',
    customerName: 'Harshwardhan Vala',
    phone: '+91 98251 30010',
    email: 'harsh.vala@client.in',
    city: 'Junagadh',
    venue: 'The Fern Leo Resort, Junagadh Foothills',
    date: '2027-01-24',
    startTime: '09:00',
    endTime: '21:00',
    status: 'Confirmed',
    bookingStatus: 'advance_received',
    quotedPrice: 175000,
    discount: 15000,
    finalAgreedAmount: 160000,
    paymentReceived: 80000,
    paymentMethod: 'Bank Transfer',
    leadPhotographerId: 'emp_shr_rahul',
    crewIds: ['emp_shr_rahul', 'emp_shr_jay', 'emp_shr_vishal', 'emp_shr_harsh'],
    subEvents: [
      { name: 'Gir Sunset Wedding Ceremony', category: 'Wedding', date: '2027-01-24', startTime: '15:00', endTime: '20:30', venue: 'Foothills Meadow Mandap' }
    ]
  },

  // 11. 14 Feb 2027: Pre-Wedding, Gandhinagar
  {
    id: 'bkg_shr_cal_11',
    bkgNum: 'SHR-CAL-2027-011',
    eventName: 'Valentine Romantic Pre-Wedding Feature',
    category: 'Pre-Wedding',
    customerName: 'Rohan Bhatt',
    phone: '+91 98251 30011',
    email: 'rohan.bhatt@client.in',
    city: 'Gandhinagar',
    venue: 'Punit Van & Dandi Kutir Memorial Plaza',
    date: '2027-02-14',
    startTime: '06:30',
    endTime: '18:30',
    status: 'Confirmed',
    bookingStatus: 'deal_confirmed',
    quotedPrice: 60000,
    discount: 4000,
    finalAgreedAmount: 56000,
    paymentReceived: 28000,
    paymentMethod: 'UPI',
    leadPhotographerId: 'emp_shr_karan',
    crewIds: ['emp_shr_karan', 'emp_shr_meet'],
    subEvents: [
      { name: 'Valentine Sunrise Lakeside Portraits', category: 'Pre-Wedding', date: '2027-02-14', startTime: '06:30', endTime: '11:00', venue: 'Punit Van Botanical Park' }
    ]
  },

  // 12. 20 Mar 2027: Family Photoshoot, Mehsana
  {
    id: 'bkg_shr_cal_12',
    bkgNum: 'SHR-CAL-2027-012',
    eventName: 'Patel Family Golden Jubilee Celebration',
    category: 'Family Photoshoot',
    customerName: 'Dhirubhai Patel',
    phone: '+91 98251 30012',
    email: 'dhirubhai.patel@client.in',
    city: 'Mehsana',
    venue: 'Shankus Water Park & Natural Health Resort',
    date: '2027-03-20',
    startTime: '10:00',
    endTime: '17:00',
    status: 'Confirmed',
    bookingStatus: 'advance_received',
    quotedPrice: 40000,
    discount: 2000,
    finalAgreedAmount: 38000,
    paymentReceived: 19000,
    paymentMethod: 'Cash',
    leadPhotographerId: 'emp_shr_dhruv',
    crewIds: ['emp_shr_dhruv', 'emp_shr_harsh'],
    subEvents: [
      { name: '4-Generation Family Portrait Sessions', category: 'Family Photoshoot', date: '2027-03-20', startTime: '10:30', endTime: '16:00', venue: 'Resort Heritage Garden' }
    ]
  }
];

/**
 * Idempotently seed the 12 calendar test bookings into TenantStore and Cloud Firestore
 */
export async function seedCalendarTestBookings(studioId: string = 'studio_shreeji_films'): Promise<number> {
  const targetStudios = Array.from(new Set([studioId, 'studio_shreeji_films', 'std_demo_royal']));
  let primaryStudioAdded = 0;

  for (const sId of targetStudios) {
    const existingBookings = TenantStore.get<BookingRecord>(sId, 'studio_bookings_v2') || [];
    const existingEvents = TenantStore.get<StudioEvent>(sId, 'events') || [];
    const existingCustomers = TenantStore.get<Customer>(sId, 'customers') || [];

  let addedCount = 0;
  const newBookings: BookingRecord[] = [...existingBookings];
  const newEvents: StudioEvent[] = [...existingEvents];
  const newCustomers: Customer[] = [...existingCustomers];

  for (const def of CALENDAR_DEMO_BOOKINGS) {
    // Idempotency check: skip if booking already exists
    if (newBookings.some(b => b.id === def.id)) {
      continue;
    }

    addedCount++;

    // 1. Customer
    const customerId = `cust_${def.id}`;
    if (!newCustomers.some(c => c.id === customerId)) {
      newCustomers.push({
        id: customerId,
        studioId: sId,
        name: def.customerName,
        phone: def.phone,
        email: def.email,
        city: def.city,
        fullAddress: `${def.venue}, ${def.city}`,
        status: 'Booked',
        preferences: { preferredContactMethod: 'whatsapp', whatsappConsent: true, emailConsent: true, marketingConsent: true, optOut: false },
        tags: [def.category, def.city, 'Calendar Demo'],
        notes: `Customer for ${def.eventName}`,
        totalBookings: 1,
        totalRevenue: def.finalAgreedAmount,
        createdAt: '2026-11-14T00:00:00Z',
        updatedAt: '2026-11-15T00:00:00Z',
        demoSeed: true,
        isDemoData: true
      } as any);
    }

    // 2. Deliverables specific to this booking
    const bookingDeliverables = generateDeliverablesForCategory(
      def.category,
      def.id,
      def.date,
      `fn_${def.id}_1`,
      def.subEvents[0]?.name || def.eventName
    );

    // 3. Functions
    const functions: FunctionPlan[] = def.subEvents.map((sub, sIdx) => ({
      id: `fn_${def.id}_${sIdx + 1}`,
      bookingId: def.id,
      name: sub.name,
      category: sub.category,
      date: sub.date,
      startTime: sub.startTime,
      endTime: sub.endTime,
      venue: sub.venue,
      city: def.city,
      assignedPhotographerIds: def.crewIds.slice(0, 2),
      assignedVideographerIds: def.crewIds.slice(2, 4),
      assignedDroneOperatorIds: def.crewIds.filter(id => id === 'emp_shr_jay'),
      assignedEditorIds: def.crewIds.filter(id => id === 'emp_shr_priya' || id === 'emp_shr_riya'),
      assignedSupplierIds: [],
      assignedCrew: def.crewIds.map(empId => ({
        employeeId: empId,
        employeeName: empId === 'emp_shr_rahul' ? 'Rahul Sharma' : empId === 'emp_shr_karan' ? 'Karan Patel' : empId === 'emp_shr_meet' ? 'Meet Shah' : empId === 'emp_shr_vishal' ? 'Vishal Desai' : empId === 'emp_shr_jay' ? 'Jay Mehta' : empId === 'emp_shr_dhruv' ? 'Dhruv Patel' : 'Crew Member',
        role: empId === 'emp_shr_rahul' ? 'Lead Photographer' : empId === 'emp_shr_karan' ? 'Candid Photographer' : empId === 'emp_shr_meet' ? 'Cinematographer' : 'Crew',
        contact: '+91 98251 10000'
      })),
      deliverables: sIdx === 0 ? bookingDeliverables : [],
      priority: 'normal',
      status: 'scheduled'
    }));

    // 4. Booking Record
    const bookingRecord: BookingRecord = {
      id: def.id,
      studioId: sId,
      bookingNumber: def.bkgNum,
      status: def.bookingStatus,
      customerId,
      customerName: def.customerName,
      customerPhone: def.phone,
      customerWhatsApp: def.phone,
      customerEmail: def.email,
      eventName: def.eventName,
      category: def.category,
      mainEventDate: def.date,
      startDate: def.date,
      venue: def.venue,
      city: def.city,
      description: `${def.category} shoot for ${def.customerName} at ${def.venue}`,
      numberOfDays: 1,
      numberOfFunctions: def.subEvents.length,
      functions,
      deliverables: bookingDeliverables,
      financials: {
        originalQuotation: def.quotedPrice,
        negotiatedDiscount: def.discount,
        finalAgreedAmount: def.finalAgreedAmount,
        verifiedPaymentsReceived: def.paymentReceived,
        remainingBalance: Math.max(0, def.finalAgreedAmount - def.paymentReceived),
        advanceRequired: Math.round(def.finalAgreedAmount * 0.5),
        advanceReceived: def.paymentReceived,
        advanceReceivedDate: def.paymentReceived > 0 ? def.date : undefined,
        isAdvanceConfirmed: def.paymentReceived > 0,
        paymentMilestones: []
      },
      billingVersions: [],
      notes: `Calendar test booking: ${def.eventName}`,
      createdAt: '2026-11-14T00:00:00Z',
      updatedAt: '2026-11-15T00:00:00Z',
      isDemoData: true
    } as any;

    newBookings.push(bookingRecord);

    // 5. Studio Event (for Calendar & Events Page)
    const eventRecord: StudioEvent = {
      id: def.id,
      studioId: sId,
      eventNumber: `EVT-${def.bkgNum}`,
      name: def.eventName,
      title: def.eventName,
      customerId,
      customerName: def.customerName,
      customerPhone: def.phone,
      category: def.category as any,
      startDate: def.date,
      startTime: def.startTime,
      endDate: def.endDate || def.date,
      endTime: def.endTime,
      venue: def.venue,
      venueCity: def.city,
      fullAddress: `${def.venue}, ${def.city}`,
      priority: 'High',
      status: def.status as any,
      leadPhotographerId: def.leadPhotographerId,
      assignedTeamIds: def.crewIds,
      detailedAssignments: def.crewIds.map(empId => ({
        memberId: empId,
        memberName: empId === 'emp_shr_rahul' ? 'Rahul Sharma' : empId === 'emp_shr_karan' ? 'Karan Patel' : empId === 'emp_shr_meet' ? 'Meet Shah' : empId === 'emp_shr_vishal' ? 'Vishal Desai' : empId === 'emp_shr_jay' ? 'Jay Mehta' : empId === 'emp_shr_dhruv' ? 'Dhruv Patel' : 'Crew Member',
        role: empId === 'emp_shr_rahul' ? 'Lead Photographer' : empId === 'emp_shr_karan' ? 'Candid Photographer' : 'Crew',
        status: 'Confirmed'
      })),
      description: `${def.category} assignment at ${def.venue}`,
      deliverables: bookingDeliverables.map(d => d.name),
      tasksCount: { total: bookingDeliverables.length, completed: 0 },
      invoiceIds: [`inv_${def.id}`],
      estimatedBudget: def.finalAgreedAmount,
      advancePaid: def.paymentReceived,
      notes: `Calendar demo shoot`,
      createdAt: '2026-11-14T00:00:00Z',
      updatedAt: '2026-11-15T00:00:00Z',
      isDemoData: true
    } as any;

    newEvents.push(eventRecord);
  }

  // Save to TenantStore
  if (addedCount > 0) {
    TenantStore.set(sId, 'studio_bookings_v2', newBookings);
    TenantStore.set(sId, 'events', newEvents);
    TenantStore.set(sId, 'customers', newCustomers);
    TenantStore.set(sId, CALENDAR_TEST_FLAG, true);
    if (sId === studioId) {
      primaryStudioAdded = addedCount;
    }
  }
}

  return primaryStudioAdded;
}
