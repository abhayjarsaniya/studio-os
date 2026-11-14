import { TenantStore } from './tenantStore';
import { firestoreService } from './firestoreService';
import { Customer, StudioEvent, Quotation, Invoice, Payment, Employee, SubEvent, Task } from '../types/schema';
import { BookingRecord, FunctionPlan, DeliverableSpecification, BookingVersionRecord } from '../types/bookingProduction';

export const SEED_BATCH_ID = 'shreeji_firebase_seed_v2026';
export const CREATED_BY_SEED = 'system_seed_admin';
export const SEED_FLAG_KEY = 'shreeji_firebase_seeded_v2026';

export interface ShreejiSetupSummary {
  totalEmployees: number;
  totalBookings: number;
  totalSubEvents: number;
  totalCustomers: number;
  totalQuotations: number;
  totalInvoices: number;
  totalPayments: number;
  totalTasks: number;
  statusDistribution: Record<string, number>;
  revenueBreakdown: {
    totalQuotedValue: number;
    totalAgreedValue: number;
    totalReceived: number;
    totalPendingBalance: number;
    totalDiscounts: number;
  };
  firestoreCollectionsPopulated: string[];
}

// 1. EXACT 14 EMPLOYEES ROSTER AS SPECIFIED
export const SHREEJI_EMPLOYEES_DEF = [
  {
    id: 'emp_shr_rahul',
    employeeNumber: 'EMP-SHR-001',
    fullName: 'Rahul Sharma',
    designation: 'Lead Photographer',
    department: 'Photography',
    phone: '+91 98251 10001',
    email: 'rahul.sharma@shreejifilms.in',
    joiningDate: '2022-04-15',
    employmentStatus: 'active' as const,
    roleId: 'lead_photographer',
    roleName: 'Lead Photographer',
    skills: ['Traditional Photography', 'Candid Photography', 'Portraiture', 'Lighting Design', 'Client Posing'],
    monthlySalary: 45000,
    dailyRate: 4000
  },
  {
    id: 'emp_shr_karan',
    employeeNumber: 'EMP-SHR-002',
    fullName: 'Karan Patel',
    designation: 'Candid Photographer',
    department: 'Photography',
    phone: '+91 98251 10002',
    email: 'karan.patel@shreejifilms.in',
    joiningDate: '2023-01-10',
    employmentStatus: 'active' as const,
    roleId: 'photographer',
    roleName: 'Candid Photographer',
    skills: ['Candid Moments', 'Low-light Photography', 'Sony Alpha Series', 'Street Portraiture'],
    monthlySalary: 38000,
    dailyRate: 3200
  },
  {
    id: 'emp_shr_vishal',
    employeeNumber: 'EMP-SHR-003',
    fullName: 'Vishal Desai',
    designation: 'Videographer',
    department: 'Videography',
    phone: '+91 98251 10003',
    email: 'vishal.desai@shreejifilms.in',
    joiningDate: '2022-08-01',
    employmentStatus: 'active' as const,
    roleId: 'videographer',
    roleName: 'Senior Videographer',
    skills: ['Wedding Videography', 'Multi-Cam Setup', 'Live Audio Recording', 'Gimbal Stabilization'],
    monthlySalary: 40000,
    dailyRate: 3500
  },
  {
    id: 'emp_shr_meet',
    employeeNumber: 'EMP-SHR-004',
    fullName: 'Meet Shah',
    designation: 'Cinematographer',
    department: 'Cinematography',
    phone: '+91 98251 10004',
    email: 'meet.shah@shreejifilms.in',
    joiningDate: '2023-03-20',
    employmentStatus: 'active' as const,
    roleId: 'cinematographer',
    roleName: 'Cinematographer',
    skills: ['Cinematic Visuals', 'Color Grading (DaVinci)', '4K 120fps Slow-mo', 'Creative Storyboarding'],
    monthlySalary: 48000,
    dailyRate: 4200
  },
  {
    id: 'emp_shr_jay',
    employeeNumber: 'EMP-SHR-005',
    fullName: 'Jay Mehta',
    designation: 'Drone Operator',
    department: 'Drone',
    phone: '+91 98251 10005',
    email: 'jay.mehta@shreejifilms.in',
    joiningDate: '2023-06-15',
    employmentStatus: 'active' as const,
    roleId: 'drone_operator',
    roleName: 'Drone Operator',
    skills: ['DGCA Certified Pilot', 'DJI Mavic 3 Cine', 'FPV Dynamic Flights', 'Night Aerial Operations'],
    monthlySalary: 35000,
    dailyRate: 3000
  },
  {
    id: 'emp_shr_priya',
    employeeNumber: 'EMP-SHR-006',
    fullName: 'Priya Joshi',
    designation: 'Photo Editor',
    department: 'Photo Editing',
    phone: '+91 98251 10006',
    email: 'priya.joshi@shreejifilms.in',
    joiningDate: '2022-11-05',
    employmentStatus: 'active' as const,
    roleId: 'editor',
    roleName: 'Photo Editor',
    skills: ['Adobe Lightroom Classic', 'Photoshop Retouching', 'Batch Processing', 'Skin Tone Color Grading'],
    monthlySalary: 32000,
    dailyRate: 2500
  },
  {
    id: 'emp_shr_riya',
    employeeNumber: 'EMP-SHR-007',
    fullName: 'Riya Trivedi',
    designation: 'Video Editor',
    department: 'Video Editing',
    phone: '+91 98251 10007',
    email: 'riya.trivedi@shreejifilms.in',
    joiningDate: '2023-04-12',
    employmentStatus: 'active' as const,
    roleId: 'editor',
    roleName: 'Video Editor',
    skills: ['Premiere Pro', 'DaVinci Resolve', 'Instagram Reels & Shorts', 'Audio Synchronization'],
    monthlySalary: 34000,
    dailyRate: 2600
  },
  {
    id: 'emp_shr_neel',
    employeeNumber: 'EMP-SHR-008',
    fullName: 'Neel Vyas',
    designation: 'Album Designer',
    department: 'Album Designing',
    phone: '+91 98251 10008',
    email: 'neel.vyas@shreejifilms.in',
    joiningDate: '2022-09-18',
    employmentStatus: 'active' as const,
    roleId: 'album_designer',
    roleName: 'Album Designer',
    skills: ['Adobe InDesign', 'Canvera Print Layouts', 'Typography', 'Leather Embossing Prep'],
    monthlySalary: 36000,
    dailyRate: 2800
  },
  {
    id: 'emp_shr_aman',
    employeeNumber: 'EMP-SHR-009',
    fullName: 'Aman Parmar',
    designation: 'Photography Assistant',
    department: 'Photography',
    phone: '+91 98251 10009',
    email: 'aman.parmar@shreejifilms.in',
    joiningDate: '2024-02-01',
    employmentStatus: 'active' as const,
    roleId: 'assistant',
    roleName: 'Photography Assistant',
    skills: ['Light Modifier Handling', 'Reflector Angles', 'Battery & SD Management', 'Data Ingestion'],
    monthlySalary: 22000,
    dailyRate: 1800
  },
  {
    id: 'emp_shr_krunal',
    employeeNumber: 'EMP-SHR-010',
    fullName: 'Krunal Dave',
    designation: 'Production Manager',
    department: 'Production',
    phone: '+91 98251 10010',
    email: 'krunal.dave@shreejifilms.in',
    joiningDate: '2021-07-01',
    employmentStatus: 'active' as const,
    roleId: 'manager',
    roleName: 'Production Manager',
    skills: ['Crew Scheduling', 'Equipment Logistics', 'Client Timeline Coordination', 'Crisis Management'],
    monthlySalary: 50000,
    dailyRate: 4500
  },
  {
    id: 'emp_shr_dhruv',
    employeeNumber: 'EMP-SHR-011',
    fullName: 'Dhruv Patel',
    designation: 'Photographer',
    department: 'Photography',
    phone: '+91 98251 10011',
    email: 'dhruv.patel@shreejifilms.in',
    joiningDate: '2023-09-01',
    employmentStatus: 'active' as const,
    roleId: 'photographer',
    roleName: 'Photographer',
    skills: ['Stage Photography', 'Guest Group Photos', 'Speedlight Off-Camera Flash', 'Speed Edits'],
    monthlySalary: 30000,
    dailyRate: 2500
  },
  {
    id: 'emp_shr_kavya',
    employeeNumber: 'EMP-SHR-012',
    fullName: 'Kavya Shah',
    designation: 'Editing Assistant',
    department: 'Video Editing',
    phone: '+91 98251 10012',
    email: 'kavya.shah@shreejifilms.in',
    joiningDate: '2024-05-15',
    employmentStatus: 'active' as const,
    roleId: 'editor',
    roleName: 'Editing Assistant',
    skills: ['Rough Cut Assembly', 'Subtitle Transcription', 'Proxy File Generation', 'Asset Archiving'],
    monthlySalary: 24000,
    dailyRate: 2000
  },
  {
    id: 'emp_shr_harsh',
    employeeNumber: 'EMP-SHR-013',
    fullName: 'Harsh Modi',
    designation: 'Photography Assistant',
    department: 'Photography',
    phone: '+91 98251 10013',
    email: 'harsh.modi@shreejifilms.in',
    joiningDate: '2024-03-10',
    employmentStatus: 'active' as const,
    roleId: 'assistant',
    roleName: 'Photography Assistant',
    skills: ['Gear Transportation', 'Light Stands Rigging', 'On-Field Client Assistance', 'Lens Cleaning'],
    monthlySalary: 20000,
    dailyRate: 1700
  },
  {
    id: 'emp_shr_nisha',
    employeeNumber: 'EMP-SHR-014',
    fullName: 'Nisha Desai',
    designation: 'Album Designer',
    department: 'Album Designing',
    phone: '+91 98251 10014',
    email: 'nisha.desai@shreejifilms.in',
    joiningDate: '2023-10-01',
    employmentStatus: 'active' as const,
    roleId: 'album_designer',
    roleName: 'Album Designer',
    skills: ['Photobook Narrative Flow', 'Custom Foil Stamping', 'Proofing Collaboration', 'Print Vendor QC'],
    monthlySalary: 33000,
    dailyRate: 2700
  }
];

// 2. 26 BOOKINGS COVERING ALL 25 SUGGESTED CATEGORIES & EXACT STATUS DISTRIBUTION
export const SHREEJI_BOOKINGS_DEF = [
  // --- 6 COMPLETED ---
  {
    id: 'bkg_shr_001',
    bkgNum: 'SHR-BKG-2026-001',
    customerName: 'Aarav Patel',
    phone: '+91 98250 20001',
    email: 'aarav.patel.client@example.com',
    city: 'Ahmedabad',
    address: 'Satellite, SG Highway, Ahmedabad',
    eventName: 'Aarav & Meera Grand Palace Wedding',
    category: 'Wedding', // Cat 1
    date: '2026-02-14',
    endDate: '2026-02-15',
    venue: 'The Ummed Palace, Ahmedabad',
    status: 'completed' as const,
    leadPhotographerId: 'emp_shr_rahul',
    crew: [
      { id: 'emp_shr_rahul', name: 'Rahul Sharma', role: 'Lead Photographer' },
      { id: 'emp_shr_karan', name: 'Karan Patel', role: 'Candid Photographer' },
      { id: 'emp_shr_vishal', name: 'Vishal Desai', role: 'Videographer' },
      { id: 'emp_shr_meet', name: 'Meet Shah', role: 'Cinematographer' },
      { id: 'emp_shr_jay', name: 'Jay Mehta', role: 'Drone Operator' },
      { id: 'emp_shr_priya', name: 'Priya Joshi', role: 'Photo Editor' },
      { id: 'emp_shr_neel', name: 'Neel Vyas', role: 'Album Designer' }
    ],
    quotedPrice: 180000,
    packageAmount: 180000,
    discount: 20000,
    discountReason: 'Palace destination multi-function full package concession',
    finalAgreedAmount: 160000,
    paymentReceived: 160000,
    paymentMethod: 'Bank Transfer' as const,
    paymentRef: 'NEFT-HDFC-20260214-001',
    rawPhotos: 2400,
    editedPhotos: 480,
    videos: 2,
    reels: 5,
    albumsCount: 2,
    albumStatus: 'Delivered' as const,
    deliveryStatus: 'Delivered' as const,
    isMultiEvent: true
  },
  {
    id: 'bkg_shr_008',
    bkgNum: 'SHR-BKG-2026-008',
    customerName: 'Diya Desai',
    phone: '+91 98250 20008',
    email: 'diya.desai.client@example.com',
    city: 'Surat',
    address: 'Vesu Main Road, Surat',
    eventName: 'Diya Sweet 16 Princess Birthday Gala',
    category: 'Birthday', // Cat 8
    date: '2026-03-15',
    endDate: '2026-03-15',
    venue: 'Avadh Utopia Club, Surat',
    status: 'completed' as const,
    leadPhotographerId: 'emp_shr_karan',
    crew: [
      { id: 'emp_shr_karan', name: 'Karan Patel', role: 'Photographer' },
      { id: 'emp_shr_aman', name: 'Aman Parmar', role: 'Photography Assistant' }
    ],
    quotedPrice: 40000,
    packageAmount: 40000,
    discount: 3000,
    discountReason: 'Single session birthday special package offer',
    finalAgreedAmount: 37000,
    paymentReceived: 37000,
    paymentMethod: 'Cash' as const,
    paymentRef: 'CASH-REC-20260315-008',
    rawPhotos: 600,
    editedPhotos: 90,
    videos: 1,
    reels: 2,
    albumsCount: 0,
    albumStatus: 'None' as const,
    deliveryStatus: 'Delivered' as const,
    isMultiEvent: false
  },
  {
    id: 'bkg_shr_011',
    bkgNum: 'SHR-BKG-2026-011',
    customerName: 'Aadit Vora',
    phone: '+91 98250 20011',
    email: 'aadit.vora.client@example.com',
    city: 'Ahmedabad',
    address: 'Sindhu Bhavan Road, Bodakdev',
    eventName: 'Baby Aadit 14-Day Newborn Studio Portraits',
    category: 'Newborn', // Cat 11
    date: '2026-04-05',
    endDate: '2026-04-05',
    venue: 'Shreeji Studio Ambient Bay, Bodakdev',
    status: 'completed' as const,
    leadPhotographerId: 'emp_shr_priya',
    crew: [
      { id: 'emp_shr_priya', name: 'Priya Joshi', role: 'Lead Photo Artist' },
      { id: 'emp_shr_harsh', name: 'Harsh Modi', role: 'Styling Assistant' }
    ],
    quotedPrice: 28000,
    packageAmount: 28000,
    discount: 2000,
    discountReason: 'Hospital discharge partner coupon',
    finalAgreedAmount: 26000,
    paymentReceived: 26000,
    paymentMethod: 'UPI' as const,
    paymentRef: 'UPI-GPAY-9825020011-011',
    rawPhotos: 400,
    editedPhotos: 45,
    videos: 0,
    reels: 1,
    albumsCount: 1,
    albumStatus: 'Delivered' as const,
    deliveryStatus: 'Delivered' as const,
    isMultiEvent: false
  },
  {
    id: 'bkg_shr_015',
    bkgNum: 'SHR-BKG-2026-015',
    customerName: 'Sanjay Rathod',
    phone: '+91 98250 20015',
    email: 'sanjay.rathod.client@example.com',
    city: 'Rajkot',
    address: 'Kalawad Road, Rajkot',
    eventName: 'Sanjay & Neeta 25th Silver Jubilee Anniversary',
    category: 'Anniversary', // Cat 15
    date: '2026-04-20',
    endDate: '2026-04-20',
    venue: 'The Grand Regency, Kalawad Road, Rajkot',
    status: 'completed' as const,
    leadPhotographerId: 'emp_shr_rahul',
    crew: [
      { id: 'emp_shr_rahul', name: 'Rahul Sharma', role: 'Lead Photographer' },
      { id: 'emp_shr_vishal', name: 'Vishal Desai', role: 'Videographer' }
    ],
    quotedPrice: 55000,
    packageAmount: 55000,
    discount: 5000,
    discountReason: '25th Silver wedding anniversary milestone loyalty concession',
    finalAgreedAmount: 50000,
    paymentReceived: 50000,
    paymentMethod: 'Bank Transfer' as const,
    paymentRef: 'NEFT-SBI-20260420-015',
    rawPhotos: 800,
    editedPhotos: 120,
    videos: 1,
    reels: 2,
    albumsCount: 1,
    albumStatus: 'Delivered' as const,
    deliveryStatus: 'Delivered' as const,
    isMultiEvent: false
  },
  {
    id: 'bkg_shr_017',
    bkgNum: 'SHR-BKG-2026-017',
    customerName: 'Principal M. K. Sharma',
    phone: '+91 98250 20017',
    email: 'dps.bopal.events@example.com',
    city: 'Ahmedabad',
    address: 'Bopal, Ahmedabad',
    eventName: 'Delhi Public School Annual Day & Cultural Night',
    category: 'School Function', // Cat 17
    date: '2026-05-02',
    endDate: '2026-05-02',
    venue: 'DPS Auditorium, Bopal, Ahmedabad',
    status: 'completed' as const,
    leadPhotographerId: 'emp_shr_dhruv',
    crew: [
      { id: 'emp_shr_dhruv', name: 'Dhruv Patel', role: 'Stage Photographer' },
      { id: 'emp_shr_vishal', name: 'Vishal Desai', role: 'Auditorium Videographer' },
      { id: 'emp_shr_aman', name: 'Aman Parmar', role: 'Assistant' }
    ],
    quotedPrice: 50000,
    packageAmount: 50000,
    discount: 5000,
    discountReason: 'Educational institution non-profit trust concession',
    finalAgreedAmount: 45000,
    paymentReceived: 45000,
    paymentMethod: 'Cheque' as const,
    paymentRef: 'CHQ-AXIS-091244-017',
    rawPhotos: 1200,
    editedPhotos: 180,
    videos: 2,
    reels: 3,
    albumsCount: 0,
    albumStatus: 'None' as const,
    deliveryStatus: 'Delivered' as const,
    isMultiEvent: false
  },
  {
    id: 'bkg_shr_023',
    bkgNum: 'SHR-BKG-2026-023',
    customerName: 'Harishbhai Trivedi',
    phone: '+91 98250 20023',
    email: 'harish.trivedi.client@example.com',
    city: 'Bhavnagar',
    address: 'Kalanala, Bhavnagar',
    eventName: 'Shrimad Bhagwat Saptah Mahotsav & Purnahuti Havan',
    category: 'Religious Function', // Cat 23
    date: '2026-05-18',
    endDate: '2026-05-20',
    venue: 'Gopinathji Mandir Hall, Bhavnagar',
    status: 'completed' as const,
    leadPhotographerId: 'emp_shr_karan',
    crew: [
      { id: 'emp_shr_karan', name: 'Karan Patel', role: 'Lead Photographer' },
      { id: 'emp_shr_vishal', name: 'Vishal Desai', role: 'Videographer' }
    ],
    quotedPrice: 60000,
    packageAmount: 60000,
    discount: 5000,
    discountReason: 'Temple Trust religious service discount',
    finalAgreedAmount: 55000,
    paymentReceived: 55000,
    paymentMethod: 'Bank Transfer' as const,
    paymentRef: 'NEFT-BOB-20260520-023',
    rawPhotos: 1400,
    editedPhotos: 220,
    videos: 3,
    reels: 2,
    albumsCount: 1,
    albumStatus: 'Delivered' as const,
    deliveryStatus: 'Delivered' as const,
    isMultiEvent: false
  },

  // --- 6 CONFIRMED / UPCOMING ---
  {
    id: 'bkg_shr_004',
    bkgNum: 'SHR-BKG-2026-004',
    customerName: 'Bhavin Vaghela',
    phone: '+91 98250 20004',
    email: 'bhavin.vaghela.client@example.com',
    city: 'Ahmedabad',
    address: 'Bodakdev, Ahmedabad',
    eventName: 'Bhavin & Krupa Grand Evening Reception',
    category: 'Reception', // Cat 4
    date: '2026-11-28',
    endDate: '2026-11-28',
    venue: 'YMCA International Centre Lawn, SG Highway',
    status: 'deal_confirmed' as const,
    leadPhotographerId: 'emp_shr_rahul',
    crew: [
      { id: 'emp_shr_rahul', name: 'Rahul Sharma', role: 'Lead Photographer' },
      { id: 'emp_shr_meet', name: 'Meet Shah', role: 'Cinematographer' },
      { id: 'emp_shr_dhruv', name: 'Dhruv Patel', role: 'Guest Photographer' },
      { id: 'emp_shr_aman', name: 'Aman Parmar', role: 'Assistant' }
    ],
    quotedPrice: 95000,
    packageAmount: 95000,
    discount: 10000,
    discountReason: 'Winter peak season advance booking discount',
    finalAgreedAmount: 85000,
    paymentReceived: 45000,
    paymentMethod: 'UPI' as const,
    paymentRef: 'UPI-PHONEPE-9825020004-004',
    rawPhotos: 0,
    editedPhotos: 0,
    videos: 0,
    reels: 0,
    albumsCount: 1,
    albumStatus: 'In Design' as const,
    deliveryStatus: 'Pending' as const,
    isMultiEvent: false
  },
  {
    id: 'bkg_shr_012',
    bkgNum: 'SHR-BKG-2026-012',
    customerName: 'Adani Solar Infrastructure',
    phone: '+91 98250 20012',
    email: 'corporate.events@adanisolar.internal',
    city: 'Ahmedabad',
    address: 'SG Highway, Bodakdev, Ahmedabad',
    eventName: 'Adani Solar Annual Global Partners Conclave 2026',
    category: 'Corporate Event', // Cat 12
    date: '2026-12-05',
    endDate: '2026-12-06',
    venue: 'Courtyard by Marriott Grand Ballroom, Ramdevnagar',
    status: 'deal_confirmed' as const,
    leadPhotographerId: 'emp_shr_rahul',
    crew: [
      { id: 'emp_shr_rahul', name: 'Rahul Sharma', role: 'Corporate Photographer' },
      { id: 'emp_shr_vishal', name: 'Vishal Desai', role: 'Multi-Cam Lead' },
      { id: 'emp_shr_jay', name: 'Jay Mehta', role: 'Indoor Tech / Drone' },
      { id: 'emp_shr_harsh', name: 'Harsh Modi', role: 'Logistics Assistant' }
    ],
    quotedPrice: 120000,
    packageAmount: 120000,
    discount: 10000,
    discountReason: 'Enterprise corporate contract volume pricing',
    finalAgreedAmount: 110000,
    paymentReceived: 55000,
    paymentMethod: 'Bank Transfer' as const,
    paymentRef: 'RTGS-ICICI-20261205-012',
    rawPhotos: 0,
    editedPhotos: 0,
    videos: 0,
    reels: 0,
    albumsCount: 0,
    albumStatus: 'None' as const,
    deliveryStatus: 'Pending' as const,
    isMultiEvent: false
  },
  {
    id: 'bkg_shr_018',
    bkgNum: 'SHR-BKG-2026-018',
    customerName: 'Nirma Cultural Committee',
    phone: '+91 98250 20018',
    email: 'cultural.chair@nirmauni.ac.in',
    city: 'Ahmedabad',
    address: 'SG Highway, Chharodi, Ahmedabad',
    eventName: 'Nirma University Vibrant Horizon Cultural Fest 2026',
    category: 'College Fest', // Cat 18
    date: '2026-12-12',
    endDate: '2026-12-14',
    venue: 'Nirma University Open Air Theatre, SG Highway',
    status: 'deal_confirmed' as const,
    leadPhotographerId: 'emp_shr_karan',
    crew: [
      { id: 'emp_shr_karan', name: 'Karan Patel', role: 'Candid Action Lead' },
      { id: 'emp_shr_meet', name: 'Meet Shah', role: 'Concert Cinematographer' },
      { id: 'emp_shr_riya', name: 'Riya Trivedi', role: 'Same-Day Reels Editor' },
      { id: 'emp_shr_aman', name: 'Aman Parmar', role: 'Assistant' }
    ],
    quotedPrice: 85000,
    packageAmount: 85000,
    discount: 10000,
    discountReason: 'Youth campus cultural festival promotional rate',
    finalAgreedAmount: 75000,
    paymentReceived: 35000,
    paymentMethod: 'Bank Transfer' as const,
    paymentRef: 'NEFT-PNB-20261212-018',
    rawPhotos: 0,
    editedPhotos: 0,
    videos: 0,
    reels: 0,
    albumsCount: 0,
    albumStatus: 'None' as const,
    deliveryStatus: 'Pending' as const,
    isMultiEvent: false
  },
  {
    id: 'bkg_shr_019',
    bkgNum: 'SHR-BKG-2026-019',
    customerName: 'Dholera Industrial Infra Developers',
    phone: '+91 98250 20019',
    email: 'dholera.media@infraproject.internal',
    city: 'Ahmedabad',
    address: 'Dholera Special Investment Region',
    eventName: 'Dholera SIR Mega Smart City 4K Aerial Survey & Promo',
    category: 'Drone Shoot', // Cat 19
    date: '2026-12-18',
    endDate: '2026-12-18',
    venue: 'Dholera SIR Activation Area, Dholera',
    status: 'deal_confirmed' as const,
    leadPhotographerId: 'emp_shr_jay',
    crew: [
      { id: 'emp_shr_jay', name: 'Jay Mehta', role: 'Licensed Drone Pilot' },
      { id: 'emp_shr_harsh', name: 'Harsh Modi', role: 'Battery Safety Assistant' }
    ],
    quotedPrice: 70000,
    packageAmount: 70000,
    discount: 5000,
    discountReason: 'Full-day site mapping combined package',
    finalAgreedAmount: 65000,
    paymentReceived: 35000,
    paymentMethod: 'Bank Transfer' as const,
    paymentRef: 'NEFT-AXIS-20261218-019',
    rawPhotos: 0,
    editedPhotos: 0,
    videos: 0,
    reels: 0,
    albumsCount: 0,
    albumStatus: 'None' as const,
    deliveryStatus: 'Pending' as const,
    isMultiEvent: false
  },
  {
    id: 'bkg_shr_024',
    bkgNum: 'SHR-BKG-2026-024',
    customerName: 'Sameer Singhania',
    phone: '+91 98250 20024',
    email: 'sameer.singhania.client@example.com',
    city: 'Ahmedabad',
    address: 'Bodakdev, Ahmedabad',
    eventName: 'Sameer & Ananya Coastal Destination Wedding Diu',
    category: 'Destination Wedding', // Cat 24
    date: '2026-11-20',
    endDate: '2026-11-21',
    venue: 'Radhika Beach Resort & Nagao Beach, Diu',
    status: 'deal_confirmed' as const,
    leadPhotographerId: 'emp_shr_rahul',
    crew: [
      { id: 'emp_shr_rahul', name: 'Rahul Sharma', role: 'Lead Destination Photographer' },
      { id: 'emp_shr_karan', name: 'Karan Patel', role: 'Candid Beach Specialist' },
      { id: 'emp_shr_meet', name: 'Meet Shah', role: 'Lead Cinematographer' },
      { id: 'emp_shr_jay', name: 'Jay Mehta', role: 'Coastal Drone Pilot' },
      { id: 'emp_shr_krunal', name: 'Krunal Dave', role: 'Destination Production Manager' },
      { id: 'emp_shr_aman', name: 'Aman Parmar', role: 'Equipment Tech' }
    ],
    quotedPrice: 240000,
    packageAmount: 240000,
    discount: 25000,
    discountReason: 'Beachfront destination package early booking discount',
    finalAgreedAmount: 215000,
    paymentReceived: 100000,
    paymentMethod: 'Bank Transfer' as const,
    paymentRef: 'RTGS-HDFC-20261120-024',
    rawPhotos: 0,
    editedPhotos: 0,
    videos: 0,
    reels: 0,
    albumsCount: 2,
    albumStatus: 'In Design' as const,
    deliveryStatus: 'Pending' as const,
    isMultiEvent: true
  },
  {
    id: 'bkg_shr_006',
    bkgNum: 'SHR-BKG-2026-006',
    customerName: 'Tanvi Parekh',
    phone: '+91 98250 20006',
    email: 'tanvi.parekh.client@example.com',
    city: 'Vadodara',
    address: 'Gotri Road, Vadodara',
    eventName: 'Tanvi Parekh Designer Mehndi & Sangeet Gala',
    category: 'Mehndi', // Cat 6
    date: '2026-12-22',
    endDate: '2026-12-22',
    venue: 'Sayaji Hotel Crystal Lawn, Kalaghoda, Vadodara',
    status: 'deal_confirmed' as const,
    leadPhotographerId: 'emp_shr_karan',
    crew: [
      { id: 'emp_shr_karan', name: 'Karan Patel', role: 'Lead Candid Artist' },
      { id: 'emp_shr_meet', name: 'Meet Shah', role: 'Cinematographer' },
      { id: 'emp_shr_aman', name: 'Aman Parmar', role: 'Lighting Tech' }
    ],
    quotedPrice: 65000,
    packageAmount: 65000,
    discount: 5000,
    discountReason: 'Festive single-day function package',
    finalAgreedAmount: 60000,
    paymentReceived: 30000,
    paymentMethod: 'UPI' as const,
    paymentRef: 'UPI-GPAY-9825020006-006',
    rawPhotos: 0,
    editedPhotos: 0,
    videos: 0,
    reels: 0,
    albumsCount: 1,
    albumStatus: 'In Design' as const,
    deliveryStatus: 'Pending' as const,
    isMultiEvent: false
  },

  // --- 3 IN PRODUCTION ---
  {
    id: 'bkg_shr_005',
    bkgNum: 'SHR-BKG-2026-005',
    customerName: 'Rohan Shah',
    phone: '+91 98250 20005',
    email: 'rohan.shah.client@example.com',
    city: 'Ahmedabad',
    address: 'Bodakdev, Ahmedabad',
    eventName: 'Rohan & Jhanvi Vibrant Phoolon Ki Haldi',
    category: 'Haldi', // Cat 5
    date: '2026-11-13',
    endDate: '2026-11-13',
    venue: 'Gulmohar Greens Club Lawn, Sanand Highway',
    status: 'in_production' as const,
    leadPhotographerId: 'emp_shr_karan',
    crew: [
      { id: 'emp_shr_karan', name: 'Karan Patel', role: 'Candid Color Lead' },
      { id: 'emp_shr_meet', name: 'Meet Shah', role: 'Slow-Motion Videographer' },
      { id: 'emp_shr_harsh', name: 'Harsh Modi', role: 'Gear Assistant' }
    ],
    quotedPrice: 55000,
    packageAmount: 55000,
    discount: 5000,
    discountReason: 'Weekday daytime flower Haldi special rate',
    finalAgreedAmount: 50000,
    paymentReceived: 35000,
    paymentMethod: 'UPI' as const,
    paymentRef: 'UPI-PHONEPE-9825020005-005',
    rawPhotos: 950,
    editedPhotos: 0,
    videos: 1,
    reels: 2,
    albumsCount: 1,
    albumStatus: 'In Design' as const,
    deliveryStatus: 'In Progress' as const,
    isMultiEvent: false
  },
  {
    id: 'bkg_shr_007',
    bkgNum: 'SHR-BKG-2026-007',
    customerName: 'Kishan Barot',
    phone: '+91 98250 20007',
    email: 'kishan.barot.client@example.com',
    city: 'Jamnagar',
    address: 'Digvijay Plot, Jamnagar',
    eventName: 'Kishan & Radhika Auspicious Mandvo & Ganesh Puja',
    category: 'Mandvo', // Cat 7
    date: '2026-11-14',
    endDate: '2026-11-14',
    venue: 'Heritage Ancestral Haveli, Jamnagar',
    status: 'in_production' as const,
    leadPhotographerId: 'emp_shr_dhruv',
    crew: [
      { id: 'emp_shr_dhruv', name: 'Dhruv Patel', role: 'Ritual Photographer' },
      { id: 'emp_shr_vishal', name: 'Vishal Desai', role: 'Traditional Videographer' }
    ],
    quotedPrice: 45000,
    packageAmount: 45000,
    discount: 4000,
    discountReason: 'Traditional family ritual heritage booking concession',
    finalAgreedAmount: 41000,
    paymentReceived: 25000,
    paymentMethod: 'Cash' as const,
    paymentRef: 'CASH-REC-20261114-007',
    rawPhotos: 720,
    editedPhotos: 0,
    videos: 1,
    reels: 1,
    albumsCount: 1,
    albumStatus: 'In Design' as const,
    deliveryStatus: 'In Progress' as const,
    isMultiEvent: false
  },
  {
    id: 'bkg_shr_020',
    bkgNum: 'SHR-BKG-2026-020',
    customerName: 'Kavita Dave',
    phone: '+91 98250 20020',
    email: 'kavita.dave.client@example.com',
    city: 'Gandhinagar',
    address: 'Infocity, Gandhinagar',
    eventName: 'Kavita & Parth Cinema-Scope 4K Wedding Story Film',
    category: 'Cinematic Film', // Cat 20
    date: '2026-11-12',
    endDate: '2026-11-14',
    venue: 'Gift City Grand Club, Gandhinagar',
    status: 'in_production' as const,
    leadPhotographerId: 'emp_shr_meet',
    crew: [
      { id: 'emp_shr_meet', name: 'Meet Shah', role: 'Director of Photography' },
      { id: 'emp_shr_vishal', name: 'Vishal Desai', role: 'Gimbal Operator' },
      { id: 'emp_shr_jay', name: 'Jay Mehta', role: 'Cinema Drone Pilot' },
      { id: 'emp_shr_kavya', name: 'Kavya Shah', role: 'Production Ingest Assistant' }
    ],
    quotedPrice: 110000,
    packageAmount: 110000,
    discount: 10000,
    discountReason: 'Cinematic film teaser bundle booking concession',
    finalAgreedAmount: 100000,
    paymentReceived: 60000,
    paymentMethod: 'UPI' as const,
    paymentRef: 'UPI-GPAY-9825020020-020',
    rawPhotos: 0,
    editedPhotos: 0,
    videos: 2,
    reels: 4,
    albumsCount: 0,
    albumStatus: 'None' as const,
    deliveryStatus: 'In Progress' as const,
    isMultiEvent: false
  },

  // --- 3 IN EDITING ---
  {
    id: 'bkg_shr_003',
    bkgNum: 'SHR-BKG-2026-003',
    customerName: 'Krish Mehta',
    phone: '+91 98250 20003',
    email: 'krish.mehta.client@example.com',
    city: 'Vadodara',
    address: 'Alkapuri, Vadodara',
    eventName: 'Krish & Pooja Royal Ring Ceremony & Engagement',
    category: 'Engagement', // Cat 3
    date: '2026-11-05',
    endDate: '2026-11-05',
    venue: 'Laxmi Vilas Palace Banquet Hall, Vadodara',
    status: 'editing' as const,
    leadPhotographerId: 'emp_shr_rahul',
    crew: [
      { id: 'emp_shr_rahul', name: 'Rahul Sharma', role: 'Lead Photographer' },
      { id: 'emp_shr_vishal', name: 'Vishal Desai', role: 'Videographer' },
      { id: 'emp_shr_priya', name: 'Priya Joshi', role: 'Photo Editor' }
    ],
    quotedPrice: 85000,
    packageAmount: 85000,
    discount: 10000,
    discountReason: 'Family reference concession from Mr. Arvind Mehta',
    finalAgreedAmount: 75000,
    paymentReceived: 50000,
    paymentMethod: 'UPI' as const,
    paymentRef: 'UPI-PHONEPE-9825020003-003',
    rawPhotos: 1500,
    editedPhotos: 180,
    videos: 1,
    reels: 2,
    albumsCount: 1,
    albumStatus: 'In Design' as const,
    deliveryStatus: 'In Progress' as const,
    isMultiEvent: false
  },
  {
    id: 'bkg_shr_010',
    bkgNum: 'SHR-BKG-2026-010',
    customerName: 'Dr. Kinjal Patel',
    phone: '+91 98250 20010',
    email: 'dr.kinjal.patel@example.com',
    city: 'Gandhinagar',
    address: 'Sector 8, Gandhinagar',
    eventName: 'Dr. Kinjal & Ankit Golden Sunset Maternity Session',
    category: 'Maternity', // Cat 10
    date: '2026-11-08',
    endDate: '2026-11-08',
    venue: 'Polo Forest & Sabarmati Riverfront Greenery',
    status: 'editing' as const,
    leadPhotographerId: 'emp_shr_karan',
    crew: [
      { id: 'emp_shr_karan', name: 'Karan Patel', role: 'Candid Artist' },
      { id: 'emp_shr_priya', name: 'Priya Joshi', role: 'Photo Retoucher' }
    ],
    quotedPrice: 35000,
    packageAmount: 35000,
    discount: 3000,
    discountReason: 'Doctor professional referral privilege offer',
    finalAgreedAmount: 32000,
    paymentReceived: 22000,
    paymentMethod: 'UPI' as const,
    paymentRef: 'UPI-GPAY-9825020010-010',
    rawPhotos: 620,
    editedPhotos: 75,
    videos: 0,
    reels: 2,
    albumsCount: 1,
    albumStatus: 'In Design' as const,
    deliveryStatus: 'In Progress' as const,
    isMultiEvent: false
  },
  {
    id: 'bkg_shr_013',
    bkgNum: 'SHR-BKG-2026-013',
    customerName: 'Zydus Healthcare Brands',
    phone: '+91 98250 20013',
    email: 'brand.media@zyduslife.internal',
    city: 'Ahmedabad',
    address: 'Changodar Industrial Estate, Ahmedabad',
    eventName: 'Zydus Premium Wellness Product Catalog Shoot',
    category: 'Product Shoot', // Cat 13
    date: '2026-11-09',
    endDate: '2026-11-10',
    venue: 'Shreeji Studio Bay 1 Commercial Studio, Bodakdev',
    status: 'editing' as const,
    leadPhotographerId: 'emp_shr_rahul',
    crew: [
      { id: 'emp_shr_rahul', name: 'Rahul Sharma', role: 'Commercial Lighting Master' },
      { id: 'emp_shr_priya', name: 'Priya Joshi', role: 'High-End Product Retoucher' },
      { id: 'emp_shr_harsh', name: 'Harsh Modi', role: 'Product Stylist Assistant' }
    ],
    quotedPrice: 75000,
    packageAmount: 75000,
    discount: 5000,
    discountReason: 'Commercial brand product launch introductory discount',
    finalAgreedAmount: 70000,
    paymentReceived: 45000,
    paymentMethod: 'Bank Transfer' as const,
    paymentRef: 'NEFT-HDFC-20261110-013',
    rawPhotos: 450,
    editedPhotos: 60,
    videos: 0,
    reels: 3,
    albumsCount: 0,
    albumStatus: 'None' as const,
    deliveryStatus: 'In Progress' as const,
    isMultiEvent: false
  },

  // --- 2 PARTIALLY DELIVERED ---
  {
    id: 'bkg_shr_002',
    bkgNum: 'SHR-BKG-2026-002',
    customerName: 'Riya Shah',
    phone: '+91 98250 20002',
    email: 'riya.shah.client@example.com',
    city: 'Gandhinagar',
    address: 'Sector 8, Gandhinagar',
    eventName: 'Riya & Harsh Romantic Heritage Pre-Wedding',
    category: 'Pre-Wedding', // Cat 2
    date: '2026-10-25',
    endDate: '2026-10-25',
    venue: 'Adalaj Stepwell & Polo Forest Nature Reserve',
    status: 'partially_delivered' as const,
    leadPhotographerId: 'emp_shr_karan',
    crew: [
      { id: 'emp_shr_karan', name: 'Karan Patel', role: 'Candid Artist' },
      { id: 'emp_shr_meet', name: 'Meet Shah', role: 'Cinematographer' },
      { id: 'emp_shr_riya', name: 'Riya Trivedi', role: 'Reels Editor' }
    ],
    quotedPrice: 65000,
    packageAmount: 65000,
    discount: 5000,
    discountReason: 'Social media reel tagging promotional concession',
    finalAgreedAmount: 60000,
    paymentReceived: 50000,
    paymentMethod: 'UPI' as const,
    paymentRef: 'UPI-GPAY-9825020002-002',
    rawPhotos: 850,
    editedPhotos: 120,
    videos: 1,
    reels: 4,
    albumsCount: 0,
    albumStatus: 'None' as const,
    deliveryStatus: 'Partially Delivered' as const,
    isMultiEvent: false
  },
  {
    id: 'bkg_shr_021',
    bkgNum: 'SHR-BKG-2026-021',
    customerName: 'Vikramsinh Chauhan',
    phone: '+91 98250 20021',
    email: 'vikram.chauhan.client@example.com',
    city: 'Anand',
    address: 'Vidyanagar Road, Anand',
    eventName: 'Chauhan Family Legacy 4K Traditional Video Chronicle',
    category: 'Traditional Video', // Cat 21
    date: '2026-10-28',
    endDate: '2026-10-29',
    venue: 'Heritage Banquet Hall, Anand',
    status: 'partially_delivered' as const,
    leadPhotographerId: 'emp_shr_vishal',
    crew: [
      { id: 'emp_shr_vishal', name: 'Vishal Desai', role: 'Senior Videographer' },
      { id: 'emp_shr_dhruv', name: 'Dhruv Patel', role: 'Traditional Camera' },
      { id: 'emp_shr_kavya', name: 'Kavya Shah', role: 'Editing Assistant' }
    ],
    quotedPrice: 55000,
    packageAmount: 55000,
    discount: 5000,
    discountReason: 'Extended family traditional coverage bundle',
    finalAgreedAmount: 50000,
    paymentReceived: 40000,
    paymentMethod: 'UPI' as const,
    paymentRef: 'UPI-PHONEPE-9825020021-021',
    rawPhotos: 0,
    editedPhotos: 0,
    videos: 2,
    reels: 2,
    albumsCount: 0,
    albumStatus: 'None' as const,
    deliveryStatus: 'Partially Delivered' as const,
    isMultiEvent: false
  },

  // --- 2 PENDING CONFIRMATION ---
  {
    id: 'bkg_shr_009',
    bkgNum: 'SHR-BKG-2026-009',
    customerName: 'Pooja Shah',
    phone: '+91 98250 20009',
    email: 'pooja.shah.client@example.com',
    city: 'Surat',
    address: 'Piplod, Surat',
    eventName: 'Pooja Shah Traditional Godh Bharai Celebration',
    category: 'Baby Shower', // Cat 9
    date: '2026-12-28',
    endDate: '2026-12-28',
    venue: 'Surat Marriott Hotel Banquet, Dumas Road',
    status: 'advance_pending' as const,
    leadPhotographerId: 'emp_shr_karan',
    crew: [
      { id: 'emp_shr_karan', name: 'Karan Patel', role: 'Lead Candid Artist' },
      { id: 'emp_shr_aman', name: 'Aman Parmar', role: 'Assistant' }
    ],
    quotedPrice: 42000,
    packageAmount: 42000,
    discount: 4000,
    discountReason: 'Intimate ceremony family package offer',
    finalAgreedAmount: 38000,
    paymentReceived: 10000,
    paymentMethod: 'UPI' as const,
    paymentRef: 'UPI-GPAY-9825020009-009',
    rawPhotos: 0,
    editedPhotos: 0,
    videos: 0,
    reels: 0,
    albumsCount: 1,
    albumStatus: 'In Design' as const,
    deliveryStatus: 'Pending' as const,
    isMultiEvent: false
  },
  {
    id: 'bkg_shr_016',
    bkgNum: 'SHR-BKG-2026-016',
    customerName: 'Mahesh Trivedi',
    phone: '+91 98250 20016',
    email: 'mahesh.trivedi.client@example.com',
    city: 'Junagadh',
    address: 'Girnar Taleti Road, Junagadh',
    eventName: 'The Trivedi Clan 3-Generation Family Portrait',
    category: 'Family Shoot', // Cat 16
    date: '2027-01-05',
    endDate: '2027-01-05',
    venue: 'Ancestral Farm Orchard, Junagadh',
    status: 'advance_pending' as const,
    leadPhotographerId: 'emp_shr_dhruv',
    crew: [
      { id: 'emp_shr_dhruv', name: 'Dhruv Patel', role: 'Family Portrait Lead' },
      { id: 'emp_shr_harsh', name: 'Harsh Modi', role: 'Lighting Assistant' }
    ],
    quotedPrice: 38000,
    packageAmount: 38000,
    discount: 3000,
    discountReason: 'Ancestral home generation celebration rate',
    finalAgreedAmount: 35000,
    paymentReceived: 10000,
    paymentMethod: 'Cash' as const,
    paymentRef: 'CASH-ADV-20270105-016',
    rawPhotos: 0,
    editedPhotos: 0,
    videos: 0,
    reels: 0,
    albumsCount: 1,
    albumStatus: 'In Design' as const,
    deliveryStatus: 'Pending' as const,
    isMultiEvent: false
  },

  // --- 2 QUOTATION / NEGOTIATION ---
  {
    id: 'bkg_shr_014',
    bkgNum: 'SHR-BKG-2026-014',
    customerName: 'FabIndia Gujarat Region',
    phone: '+91 98250 20014',
    email: 'marketing.gujarat@fabindia.internal',
    city: 'Ahmedabad',
    address: 'Law Garden, Ellisbridge, Ahmedabad',
    eventName: 'FabIndia Autumn Silk Ethnic Lookbook Campaign',
    category: 'Fashion Shoot', // Cat 14
    date: '2027-01-15',
    endDate: '2027-01-16',
    venue: 'Shreeji Fashion Studio, SG Highway',
    status: 'negotiation' as const,
    leadPhotographerId: 'emp_shr_rahul',
    crew: [
      { id: 'emp_shr_rahul', name: 'Rahul Sharma', role: 'Editorial Fashion Photographer' },
      { id: 'emp_shr_meet', name: 'Meet Shah', role: 'Fashion Reel DP' },
      { id: 'emp_shr_priya', name: 'Priya Joshi', role: 'Colorist' }
    ],
    quotedPrice: 130000,
    packageAmount: 130000,
    discount: 15000,
    discountReason: 'Proposed seasonal lookbook 2-day shoot agreement',
    finalAgreedAmount: 115000,
    paymentReceived: 0,
    paymentMethod: 'Bank Transfer' as const,
    paymentRef: 'PENDING-NEGOTIATION',
    rawPhotos: 0,
    editedPhotos: 0,
    videos: 0,
    reels: 0,
    albumsCount: 0,
    albumStatus: 'None' as const,
    deliveryStatus: 'Pending' as const,
    isMultiEvent: false
  },
  {
    id: 'bkg_shr_025',
    bkgNum: 'SHR-BKG-2026-025',
    customerName: 'Rajendrabhai Desai',
    phone: '+91 98250 20025',
    email: 'rajendra.desai.client@example.com',
    city: 'Mehsana',
    address: 'Radhanpur Road, Mehsana',
    eventName: 'Desai Clan Master Heirloom Flushmount Albums Package',
    category: 'Album Package', // Cat 25
    date: '2027-01-22',
    endDate: '2027-01-22',
    venue: 'Desai Residence & Shreeji Print Lab, Mehsana',
    status: 'negotiation' as const,
    leadPhotographerId: 'emp_shr_neel',
    crew: [
      { id: 'emp_shr_neel', name: 'Neel Vyas', role: 'Chief Album Designer' },
      { id: 'emp_shr_nisha', name: 'Nisha Desai', role: 'Layout Specialist' }
    ],
    quotedPrice: 50000,
    packageAmount: 50000,
    discount: 6000,
    discountReason: '3-Album volume flushmount discount under discussion',
    finalAgreedAmount: 44000,
    paymentReceived: 0,
    paymentMethod: 'Cash' as const,
    paymentRef: 'PENDING-NEGOTIATION',
    rawPhotos: 0,
    editedPhotos: 0,
    videos: 0,
    reels: 0,
    albumsCount: 3,
    albumStatus: 'In Design' as const,
    deliveryStatus: 'Pending' as const,
    isMultiEvent: false
  },

  // --- 1 CANCELLED ---
  {
    id: 'bkg_shr_022',
    bkgNum: 'SHR-BKG-2026-022',
    customerName: 'Urban Spoon Food Festivals',
    phone: '+91 98250 20022',
    email: 'info@urbanspoonfest.internal',
    city: 'Ahmedabad',
    address: 'Sindhu Bhavan Road, Ahmedabad',
    eventName: 'Sindhu Bhavan Food Carnival Viral Reels Campaign',
    category: 'Reels & Social Media', // Cat 22
    date: '2026-10-15',
    endDate: '2026-10-15',
    venue: 'Sindhu Bhavan Open Grounds, Bodakdev',
    status: 'cancelled' as const,
    leadPhotographerId: 'emp_shr_riya',
    crew: [
      { id: 'emp_shr_riya', name: 'Riya Trivedi', role: 'Reels Lead' }
    ],
    quotedPrice: 35000,
    packageAmount: 35000,
    discount: 0,
    discountReason: 'None',
    finalAgreedAmount: 35000,
    paymentReceived: 5000,
    paymentMethod: 'UPI' as const,
    paymentRef: 'UPI-REFUND-PROCESSED-022',
    rawPhotos: 0,
    editedPhotos: 0,
    videos: 0,
    reels: 0,
    albumsCount: 0,
    albumStatus: 'None' as const,
    deliveryStatus: 'Pending' as const,
    isMultiEvent: false
  }
];

// 3. SUB-EVENTS DEFINITIONS FOR MULTI-EVENT WEDDINGS
export function getSubEventsDef(bookingId: string, studioId: string): SubEvent[] {
  if (bookingId === 'bkg_shr_001') {
    // 7 Sub-events for Aarav & Meera Palace Wedding
    return [
      {
        id: 'sub_shr_001_01',
        studioId,
        parentEventId: 'evt_shr_001',
        subEventNumber: 'EVT-SHR-001-S01',
        name: 'Engagement Ceremony & Cocktail',
        customCategory: 'Engagement',
        date: '2026-02-12',
        startTime: '17:00',
        endTime: '21:00',
        venue: 'Courtyard Marriott Ballroom, Satellite, Ahmedabad',
        address: 'Satellite, SG Highway',
        assignedMemberIds: ['emp_shr_rahul', 'emp_shr_karan', 'emp_shr_meet'],
        requiredTeamSize: 3,
        priority: 'High',
        status: 'Completed',
        instructions: 'Focus on ring exchange, candid family hugs, and couple portraiture under warm chandeliers.',
        sortOrder: 1,
        createdAt: '2026-01-15T09:00:00Z',
        updatedAt: '2026-02-13T10:00:00Z'
      },
      {
        id: 'sub_shr_001_02',
        studioId,
        parentEventId: 'evt_shr_001',
        subEventNumber: 'EVT-SHR-001-S02',
        name: 'Mandvo & Ganesh Sthapna Puja',
        customCategory: 'Mandvo',
        date: '2026-02-13',
        startTime: '08:30',
        endTime: '12:00',
        venue: 'Patel Ancestral Farmhouse, Bodakdev',
        address: 'Bodakdev, Ahmedabad',
        assignedMemberIds: ['emp_shr_rahul', 'emp_shr_vishal'],
        requiredTeamSize: 2,
        priority: 'High',
        status: 'Completed',
        instructions: 'Vedic rituals, sacred fire lighting, family elders blessings with traditional 50mm f/1.2 lens.',
        sortOrder: 2,
        createdAt: '2026-01-15T09:00:00Z',
        updatedAt: '2026-02-13T13:00:00Z'
      },
      {
        id: 'sub_shr_001_03',
        studioId,
        parentEventId: 'evt_shr_001',
        subEventNumber: 'EVT-SHR-001-S03',
        name: 'Haldi Ceremony & Phoolon Ki Holi',
        customCategory: 'Haldi',
        date: '2026-02-13',
        startTime: '14:00',
        endTime: '17:00',
        venue: 'Patel Farmhouse Open Lawn, Bodakdev',
        address: 'Bodakdev, Ahmedabad',
        assignedMemberIds: ['emp_shr_karan', 'emp_shr_meet', 'emp_shr_jay'],
        requiredTeamSize: 3,
        priority: 'High',
        status: 'Completed',
        instructions: '120fps high-speed capture of yellow flower petals and water splashes. Drone aerial over lawn.',
        sortOrder: 3,
        createdAt: '2026-01-15T09:00:00Z',
        updatedAt: '2026-02-13T18:00:00Z'
      },
      {
        id: 'sub_shr_001_04',
        studioId,
        parentEventId: 'evt_shr_001',
        subEventNumber: 'EVT-SHR-001-S04',
        name: 'Mehndi Lounge & Live Folk Music',
        customCategory: 'Mehndi',
        date: '2026-02-13',
        startTime: '18:30',
        endTime: '22:30',
        venue: 'Courtyard Poolside Terrace, Satellite',
        address: 'Satellite, SG Highway',
        assignedMemberIds: ['emp_shr_karan', 'emp_shr_vishal', 'emp_shr_aman'],
        requiredTeamSize: 3,
        priority: 'Medium',
        status: 'Completed',
        instructions: 'Intricate henna hand close-ups with macro 90mm lens, bride laughter, live acoustic music audio sync.',
        sortOrder: 4,
        createdAt: '2026-01-15T09:00:00Z',
        updatedAt: '2026-02-13T23:00:00Z'
      },
      {
        id: 'sub_shr_001_05',
        studioId,
        parentEventId: 'evt_shr_001',
        subEventNumber: 'EVT-SHR-001-S05',
        name: 'Sangeet & Raas Garba Night',
        customCategory: 'Sangeet',
        date: '2026-02-14',
        startTime: '19:30',
        endTime: '00:30',
        venue: 'The Ummed Palace Main Lawn, Ahmedabad',
        address: 'Hansol, Ahmedabad',
        assignedMemberIds: ['emp_shr_rahul', 'emp_shr_karan', 'emp_shr_meet', 'emp_shr_jay', 'emp_shr_aman'],
        requiredTeamSize: 5,
        priority: 'High',
        status: 'Completed',
        instructions: 'Fast motion stage performances, swirling garba choreography, sweeping drone shots across palace facade.',
        sortOrder: 5,
        createdAt: '2026-01-15T09:00:00Z',
        updatedAt: '2026-02-15T01:00:00Z'
      },
      {
        id: 'sub_shr_001_06',
        studioId,
        parentEventId: 'evt_shr_001',
        subEventNumber: 'EVT-SHR-001-S06',
        name: 'Sacred Wedding Ceremony & Pheras',
        customCategory: 'Wedding',
        date: '2026-02-15',
        startTime: '09:00',
        endTime: '15:00',
        venue: 'The Ummed Grand Royal Mandap, Ahmedabad',
        address: 'Hansol, Ahmedabad',
        assignedMemberIds: ['emp_shr_rahul', 'emp_shr_karan', 'emp_shr_vishal', 'emp_shr_meet', 'emp_shr_jay'],
        requiredTeamSize: 5,
        priority: 'High',
        status: 'Completed',
        instructions: 'Baraat royal procession, Varmala fireworks, emotional Kanyadaan, 7 Sacred Pheras, and heartfelt Vidaai.',
        sortOrder: 6,
        createdAt: '2026-01-15T09:00:00Z',
        updatedAt: '2026-02-15T16:00:00Z'
      },
      {
        id: 'sub_shr_001_07',
        studioId,
        parentEventId: 'evt_shr_001',
        subEventNumber: 'EVT-SHR-001-S07',
        name: 'Grand Royal Reception Banquet',
        customCategory: 'Reception',
        date: '2026-02-15',
        startTime: '19:00',
        endTime: '23:30',
        venue: 'The Ummed Crystal Grand Ballroom, Ahmedabad',
        address: 'Hansol, Ahmedabad',
        assignedMemberIds: ['emp_shr_rahul', 'emp_shr_karan', 'emp_shr_vishal', 'emp_shr_dhruv'],
        requiredTeamSize: 4,
        priority: 'High',
        status: 'Completed',
        instructions: 'VIP stage formal portraits, couple entrance with cold pyros, dinner candid shots, family felicitations.',
        sortOrder: 7,
        createdAt: '2026-01-15T09:00:00Z',
        updatedAt: '2026-02-16T00:00:00Z'
      }
    ];
  } else if (bookingId === 'bkg_shr_024') {
    // 4 Sub-events for Sameer & Ananya Destination Wedding in Diu
    return [
      {
        id: 'sub_shr_024_01',
        studioId,
        parentEventId: 'evt_shr_024',
        subEventNumber: 'EVT-SHR-024-S01',
        name: 'Coastal Sundowner Welcome Cocktail',
        customCategory: 'Welcome Party',
        date: '2026-11-20',
        startTime: '16:30',
        endTime: '20:30',
        venue: 'Radhika Beach Resort Ocean Lawn, Diu',
        address: 'Nagao Beach Road, Diu',
        assignedMemberIds: ['emp_shr_karan', 'emp_shr_meet', 'emp_shr_jay'],
        requiredTeamSize: 3,
        priority: 'High',
        status: 'Confirmed',
        instructions: 'Golden hour sea backdrop, beach casual attire, sunset silhouette portraits and cocktail candid moments.',
        sortOrder: 1,
        createdAt: '2026-10-01T09:00:00Z',
        updatedAt: '2026-10-01T09:00:00Z'
      },
      {
        id: 'sub_shr_024_02',
        studioId,
        parentEventId: 'evt_shr_024',
        subEventNumber: 'EVT-SHR-024-S02',
        name: 'Beachside Haldi & Phoolon Ki Holi',
        customCategory: 'Haldi',
        date: '2026-11-21',
        startTime: '09:30',
        endTime: '13:00',
        venue: 'Resort Beachfront Wooden Deck, Diu',
        address: 'Nagao Beach Road, Diu',
        assignedMemberIds: ['emp_shr_karan', 'emp_shr_meet', 'emp_shr_jay', 'emp_shr_aman'],
        requiredTeamSize: 4,
        priority: 'High',
        status: 'Confirmed',
        instructions: 'Organic yellow marigold petal throw, coastal breeze aerial sweeps, bride & groom joyful immersion.',
        sortOrder: 2,
        createdAt: '2026-10-01T09:00:00Z',
        updatedAt: '2026-10-01T09:00:00Z'
      },
      {
        id: 'sub_shr_024_03',
        studioId,
        parentEventId: 'evt_shr_024',
        subEventNumber: 'EVT-SHR-024-S03',
        name: 'Sunset Pheras by the Arabian Sea',
        customCategory: 'Wedding Ceremony',
        date: '2026-11-21',
        startTime: '16:30',
        endTime: '20:00',
        venue: 'Nagao Beach Open Ocean Mandap, Diu',
        address: 'Nagao Beach, Diu',
        assignedMemberIds: ['emp_shr_rahul', 'emp_shr_karan', 'emp_shr_meet', 'emp_shr_jay', 'emp_shr_krunal'],
        requiredTeamSize: 5,
        priority: 'High',
        status: 'Confirmed',
        instructions: 'Tide-safe mandap setup, crimson sunset horizon behind wedding holy fire, cinematic couple vows.',
        sortOrder: 3,
        createdAt: '2026-10-01T09:00:00Z',
        updatedAt: '2026-10-01T09:00:00Z'
      },
      {
        id: 'sub_shr_024_04',
        studioId,
        parentEventId: 'evt_shr_024',
        subEventNumber: 'EVT-SHR-024-S04',
        name: 'Starry Night Coastal Gala Reception',
        customCategory: 'Reception',
        date: '2026-11-21',
        startTime: '21:00',
        endTime: '01:00',
        venue: 'Resort Oceanview Banquet Pavilion, Diu',
        address: 'Nagao Beach Road, Diu',
        assignedMemberIds: ['emp_shr_rahul', 'emp_shr_karan', 'emp_shr_meet', 'emp_shr_aman'],
        requiredTeamSize: 4,
        priority: 'High',
        status: 'Confirmed',
        instructions: 'Fairy light canopy, acoustic live performance, champagne toast, cake cutting and guest speeches.',
        sortOrder: 4,
        createdAt: '2026-10-01T09:00:00Z',
        updatedAt: '2026-10-01T09:00:00Z'
      }
    ];
  }
  return [];
}

// 4. TASKS GENERATOR FOR REALISTIC WORKFLOW TRACKING
export function getTasksForBooking(booking: typeof SHREEJI_BOOKINGS_DEF[0], studioId: string): Task[] {
  const isCompleted = booking.status === 'completed';
  const isEditing = booking.status === 'editing' || booking.status === 'in_production';
  const isConfirmed = booking.status === 'deal_confirmed' || booking.status === 'advance_pending' || booking.status === 'negotiation';

  const baseTasks: Array<{
    title: string;
    description: string;
    assignedToId: string;
    assignedToName: string;
    department: string;
    priority: 'High' | 'Medium' | 'Low';
    status: 'Completed' | 'In Progress' | 'Not Started';
    relativeDays: number;
    checklist: Array<{ id: string; text: string; completed: boolean }>;
  }> = [
    {
      title: `Raw Data Backup & Verifications: ${booking.eventName}`,
      description: 'Ingest all SD and CFexpress cards, generate MD5 checksum verified backup on RAID storage and cloud archive.',
      assignedToId: 'emp_shr_aman',
      assignedToName: 'Aman Parmar',
      department: 'Photography',
      priority: 'High',
      status: isCompleted || isEditing ? 'Completed' : 'Not Started',
      relativeDays: 1,
      checklist: [
        { id: 'chk_1', text: 'Offload all primary camera cards', completed: isCompleted || isEditing },
        { id: 'chk_2', text: 'Verify MD5 checksum on primary RAID', completed: isCompleted || isEditing },
        { id: 'chk_3', text: 'Upload proxy previews to client cloud portal', completed: isCompleted || isEditing }
      ]
    },
    {
      title: `Selection & Culling: ${booking.eventName}`,
      description: 'Cull raw catalog down to hero shots, flag blinks/mis-focus, and send watermarked selection gallery to client.',
      assignedToId: 'emp_shr_priya',
      assignedToName: 'Priya Joshi',
      department: 'Photo Editing',
      priority: 'High',
      status: isCompleted ? 'Completed' : isEditing ? 'In Progress' : 'Not Started',
      relativeDays: 3,
      checklist: [
        { id: 'chk_4', text: 'Star-rating pass in Lightroom', completed: isCompleted },
        { id: 'chk_5', text: 'Export client proofing watermarked web gallery', completed: isCompleted },
        { id: 'chk_6', text: 'Receive client final picks confirmation', completed: isCompleted }
      ]
    },
    {
      title: `High-End Photo Editing & Skin Retouching: ${booking.eventName}`,
      description: 'Execute color correction, exposure grading, and frequency separation skin retouching on all selected images.',
      assignedToId: 'emp_shr_priya',
      assignedToName: 'Priya Joshi',
      department: 'Photo Editing',
      priority: 'Medium',
      status: isCompleted ? 'Completed' : isEditing ? 'In Progress' : 'Not Started',
      relativeDays: 7,
      checklist: [
        { id: 'chk_7', text: 'Color temperature calibration across daylight and tungsten', completed: isCompleted },
        { id: 'chk_8', text: 'Skin tone refinement and background distraction removal', completed: isCompleted },
        { id: 'chk_9', text: 'Export high-res 300DPI print ready JPEGs', completed: isCompleted }
      ]
    },
    {
      title: `Cinematic Teaser & Instagram Reels Edit: ${booking.eventName}`,
      description: 'Cut 60-90 second vertical teaser and 4K widescreen cinematic teaser synced to licensed audio score.',
      assignedToId: 'emp_shr_riya',
      assignedToName: 'Riya Trivedi',
      department: 'Video Editing',
      priority: 'High',
      status: isCompleted ? 'Completed' : isEditing ? 'In Progress' : 'Not Started',
      relativeDays: 5,
      checklist: [
        { id: 'chk_10', text: 'Audio beat grid sync', completed: isCompleted },
        { id: 'chk_11', text: '9:16 vertical crop with safe margins for social media', completed: isCompleted },
        { id: 'chk_12', text: 'Client teaser review approval', completed: isCompleted }
      ]
    },
    {
      title: `Photobook Album Layout Design: ${booking.eventName}`,
      description: 'Design luxury narrative photobook layout in InDesign and prepare Canvera/print lab PDF proofing sheet.',
      assignedToId: 'emp_shr_neel',
      assignedToName: 'Neel Vyas',
      department: 'Album Designing',
      priority: 'Medium',
      status: isCompleted ? 'Completed' : 'Not Started',
      relativeDays: 14,
      checklist: [
        { id: 'chk_13', text: 'Chronological page storyboarding', completed: isCompleted },
        { id: 'chk_14', text: 'Client digital flipbook PDF approval', completed: isCompleted },
        { id: 'chk_15', text: 'Send to lab for leather debossing & binding', completed: isCompleted }
      ]
    },
    {
      title: `Final Handover & Delivery Archive: ${booking.eventName}`,
      description: 'Deliver laser-engraved wooden USB box, luxury albums, and unlock high-speed cloud download link for family.',
      assignedToId: 'emp_shr_krunal',
      assignedToName: 'Krunal Dave',
      department: 'Production',
      priority: 'High',
      status: isCompleted ? 'Completed' : 'Not Started',
      relativeDays: 21,
      checklist: [
        { id: 'chk_16', text: 'Packaging quality check', completed: isCompleted },
        { id: 'chk_17', text: 'Obtain signed client delivery acknowledgment receipt', completed: isCompleted }
      ]
    }
  ];

  return baseTasks.map((t, idx) => {
    const taskDate = new Date(booking.date);
    taskDate.setDate(taskDate.getDate() + t.relativeDays);
    const dueDate = taskDate.toISOString().split('T')[0];

    return {
      id: `task_shr_${booking.id.replace('bkg_shr_', '')}_0${idx + 1}`,
      taskNumber: `TSK-SHR-${booking.id.replace('bkg_shr_', '')}-0${idx + 1}`,
      studioId,
      eventId: `evt_shr_${booking.id.replace('bkg_shr_', '')}`,
      eventName: booking.eventName,
      title: t.title,
      description: t.description,
      assignedToId: t.assignedToId,
      assignedToName: t.assignedToName,
      department: t.department,
      priority: t.priority as any,
      status: t.status as any,
      dueDate,
      checklist: t.checklist,
      createdAt: '2026-01-15T09:00:00Z',
      updatedAt: '2026-02-01T09:00:00Z',
      demoSeed: true,
      isDemoData: true,
      seedBatchId: SEED_BATCH_ID,
      createdBy: CREATED_BY_SEED
    } as any;
  });
}

// 5. MASTER SEEDER SERVICE
export class ShreejiSeedService {
  static async seedShreejiStudio(force: boolean = false, targetStudioId: string = 'studio_shreeji_films'): Promise<ShreejiSetupSummary> {
    const studiosToSeed = [targetStudioId];
    // Ensure backward compatibility by also seeding demo alias if requested or default
    if (targetStudioId === 'studio_shreeji_films') {
      studiosToSeed.push('std_demo_royal');
    }

    let summaryResult: ShreejiSetupSummary | null = null;

    for (const studioId of studiosToSeed) {
      const alreadySeeded = TenantStore.getSingle(studioId, SEED_FLAG_KEY);
      if (alreadySeeded && !force) {
        // Already seeded, continue
      }

      // 1. Prepare Employees
      const employees: Employee[] = SHREEJI_EMPLOYEES_DEF.map(emp => ({
        id: emp.id,
        studioId,
        userId: `usr_${emp.id}`,
        employeeNumber: emp.employeeNumber,
        fullName: emp.fullName,
        email: emp.email,
        phone: emp.phone,
        department: emp.department,
        designation: emp.designation,
        joiningDate: emp.joiningDate,
        roleId: emp.roleId,
        roleName: emp.roleName,
        employmentStatus: emp.employmentStatus,
        skills: emp.skills,
        monthlySalary: emp.monthlySalary,
        dailyRate: emp.dailyRate,
        notes: `Key crew member at Shreeji Films and Photography. Specializes in ${emp.department}.`,
        createdAt: '2026-01-15T09:00:00Z',
        updatedAt: '2026-11-14T09:00:00Z',
        demoSeed: true,
        isDemoData: true,
        seedBatchId: SEED_BATCH_ID,
        createdBy: CREATED_BY_SEED
      } as any));

      // 2. Prepare Customers, Events, Bookings, Quotations, Invoices, Payments, SubEvents, Tasks
      const customers: Customer[] = [];
      const events: StudioEvent[] = [];
      const bookings: BookingRecord[] = [];
      const quotations: Quotation[] = [];
      const invoices: Invoice[] = [];
      const payments: Payment[] = [];
      const allSubEvents: SubEvent[] = [];
      const allTasks: Task[] = [];

      SHREEJI_BOOKINGS_DEF.forEach((bkg, index) => {
        const numStr = String(index + 1).padStart(3, '0');
        const customerId = `cust_shr_${numStr}`;
        const eventId = `evt_shr_${numStr}`;
        const bookingId = bkg.id;
        const quotationId = `qt_shr_${numStr}`;
        const invoiceId = `inv_shr_${numStr}`;
        const paymentId = `pay_shr_${numStr}`;

        // Customer
        customers.push({
          id: customerId,
          studioId,
          name: bkg.customerName,
          phone: bkg.phone,
          email: bkg.email,
          city: bkg.city,
          fullAddress: bkg.address,
          status: bkg.status === 'completed' ? 'Completed' : bkg.status === 'cancelled' ? 'Lost' : 'Booked',
          preferences: {
            preferredContactMethod: 'whatsapp',
            whatsappConsent: true,
            emailConsent: true,
            marketingConsent: true,
            optOut: false
          },
          tags: [bkg.category, bkg.city, 'VIP Client'],
          notes: `Customer for ${bkg.eventName} in ${bkg.city}.`,
          totalBookings: 1,
          totalRevenue: bkg.finalAgreedAmount,
          createdAt: '2026-01-15T09:00:00Z',
          updatedAt: '2026-11-14T09:00:00Z',
          demoSeed: true,
          isDemoData: true,
          seedBatchId: SEED_BATCH_ID,
          createdBy: CREATED_BY_SEED
        } as any);

        // Event
        events.push({
          id: eventId,
          studioId,
          eventNumber: `EVT-SHR-2026-${numStr}`,
          name: bkg.eventName,
          title: bkg.eventName,
          customerId,
          customerName: bkg.customerName,
          customerPhone: bkg.phone,
          category: bkg.category,
          startDate: bkg.date,
          startTime: '09:00',
          endDate: bkg.endDate || bkg.date,
          endTime: '23:00',
          venue: bkg.venue,
          venueCity: bkg.city,
          fullAddress: `${bkg.venue}, ${bkg.city}`,
          priority: 'High',
          status: bkg.status === 'completed' ? 'Completed' : bkg.status === 'cancelled' ? 'Cancelled' : 'Confirmed',
          leadPhotographerId: bkg.leadPhotographerId,
          assignedTeamIds: bkg.crew.map(c => c.id),
          detailedAssignments: bkg.crew.map(c => ({
            memberId: c.id,
            memberName: c.name,
            role: c.role,
            status: 'Confirmed'
          })),
          description: `${bkg.category} photography and cinematic shoot for ${bkg.customerName} at ${bkg.venue}.`,
          createdAt: '2026-01-15T09:00:00Z',
          updatedAt: '2026-11-14T09:00:00Z',
          demoSeed: true,
          isDemoData: true,
          seedBatchId: SEED_BATCH_ID,
          createdBy: CREATED_BY_SEED
        } as any);

        // Sub-Events
        const subEvents = getSubEventsDef(bookingId, studioId);
        allSubEvents.push(...subEvents);

        // Tasks
        const tasks = getTasksForBooking(bkg, studioId);
        allTasks.push(...tasks);

        // Quotation
        quotations.push({
          id: quotationId,
          studioId,
          quotationNumber: `SHR-QT-2026-${numStr}`,
          title: `Photography Package for ${bkg.eventName}`,
          customerId,
          customerName: bkg.customerName,
          customerPhone: bkg.phone,
          customerEmail: bkg.email,
          customerAddress: bkg.address,
          eventCategory: bkg.category,
          eventName: bkg.eventName,
          eventDate: bkg.date,
          eventVenue: bkg.venue,
          packageName: `${bkg.category} Signature Package`,
          items: [
            {
              id: `item_${numStr}_1`,
              description: `${bkg.category} Master Coverage & Creative Direction`,
              quantity: 1,
              unitPrice: bkg.quotedPrice,
              discount: bkg.discount,
              taxRate: 18,
              taxAmount: Math.round((bkg.quotedPrice - bkg.discount) * 0.18),
              amount: bkg.finalAgreedAmount
            }
          ],
          subtotal: bkg.quotedPrice,
          discountAmount: bkg.discount,
          taxRate: 18,
          taxAmount: Math.round((bkg.quotedPrice - bkg.discount) * 0.18),
          grandTotal: bkg.finalAgreedAmount,
          advanceAmount: bkg.paymentReceived,
          paymentTerms: '50% advance on signing, balance upon final deliverables approval.',
          status: bkg.status === 'cancelled' ? 'Expired' : bkg.status === 'negotiation' ? 'Sent' : 'Accepted',
          createdAt: '2026-01-15T09:00:00Z',
          updatedAt: '2026-11-14T09:00:00Z',
          demoSeed: true,
          isDemoData: true,
          seedBatchId: SEED_BATCH_ID,
          createdBy: CREATED_BY_SEED
        } as any);

        // Invoice
        const remainingBal = bkg.finalAgreedAmount - bkg.paymentReceived;
        invoices.push({
          id: invoiceId,
          studioId,
          invoiceNumber: `SHR-INV-2026-${numStr}`,
          customerId,
          customerName: bkg.customerName,
          customerPhone: bkg.phone,
          customerEmail: bkg.email,
          customerAddress: bkg.address,
          eventId,
          eventName: bkg.eventName,
          invoiceDate: bkg.date,
          dueDate: bkg.date,
          type: 'Standard Tax Invoice',
          items: [
            {
              id: `inv_item_${numStr}`,
              description: `Photography & Production Services for ${bkg.eventName}`,
              quantity: 1,
              unitPrice: bkg.finalAgreedAmount,
              discount: 0,
              taxRate: 18,
              taxAmount: Math.round(bkg.finalAgreedAmount * 0.18),
              amount: bkg.finalAgreedAmount
            }
          ],
          subtotal: bkg.finalAgreedAmount,
          taxRate: 18,
          taxAmount: Math.round(bkg.finalAgreedAmount * 0.18),
          totalAmount: bkg.finalAgreedAmount,
          paidAmount: bkg.paymentReceived,
          balanceAmount: Math.max(0, remainingBal),
          status: remainingBal <= 0 ? 'Paid' : bkg.paymentReceived > 0 ? 'Partially Paid' : 'Pending',
          paymentMethod: bkg.paymentMethod,
          createdAt: '2026-01-15T09:00:00Z',
          updatedAt: '2026-11-14T09:00:00Z',
          demoSeed: true,
          isDemoData: true,
          seedBatchId: SEED_BATCH_ID,
          createdBy: CREATED_BY_SEED
        } as any);

        // Payment (if received)
        if (bkg.paymentReceived > 0) {
          payments.push({
            id: paymentId,
            studioId,
            paymentNumber: `SHR-PAY-2026-${numStr}`,
            receiptNumber: `SHR-REC-2026-${numStr}`,
            invoiceId,
            invoiceNumber: `SHR-INV-2026-${numStr}`,
            customerId,
            customerName: bkg.customerName,
            amount: bkg.paymentReceived,
            currency: 'INR',
            paymentDate: bkg.date,
            paymentMethod: bkg.paymentMethod.toLowerCase().replace(' ', '_') as any,
            transactionReference: bkg.paymentRef,
            status: 'success',
            verifiedBy: 'Aarav Patel (Studio Owner)',
            notes: `Verified payment for ${bkg.eventName}. Ref: ${bkg.paymentRef}`,
            createdAt: `${bkg.date}T10:00:00Z`,
            updatedAt: `${bkg.date}T10:30:00Z`,
            demoSeed: true,
            isDemoData: true,
            seedBatchId: SEED_BATCH_ID,
            createdBy: CREATED_BY_SEED
          } as any);
        }

        // BookingRecord (studio_bookings_v2)
        bookings.push({
          id: bookingId,
          bookingNumber: bkg.bkgNum,
          studioId,
          customerId,
          customerName: bkg.customerName,
          customerPhone: bkg.phone,
          customerEmail: bkg.email,
          customerCity: bkg.city,
          customerAddress: bkg.address,
          title: bkg.eventName,
          eventType: bkg.category,
          primaryDate: bkg.date,
          status: bkg.status,
          productionStage: bkg.status === 'completed' ? 'delivered' : bkg.status === 'editing' ? 'editing' : bkg.status === 'in_production' ? 'photography_completed' : 'not_started',
          financials: {
            quotedAmount: bkg.quotedPrice,
            packageAmount: bkg.packageAmount,
            negotiatedDiscount: bkg.discount,
            finalAgreedAmount: bkg.finalAgreedAmount,
            advancePaymentReceived: bkg.paymentReceived,
            balanceRemaining: Math.max(0, bkg.finalAgreedAmount - bkg.paymentReceived),
            paymentStatus: remainingBal <= 0 ? 'Paid' : bkg.paymentReceived > 0 ? 'Partial' : 'Pending',
            paymentMethod: bkg.paymentMethod,
            paymentDate: bkg.date,
            transactionReference: bkg.paymentRef,
            originalQuotation: bkg.quotedPrice,
            verifiedPaymentsReceived: bkg.paymentReceived,
            advanceRequired: Math.round(bkg.finalAgreedAmount * 0.5),
            advanceReceived: bkg.paymentReceived,
            isAdvanceConfirmed: bkg.paymentReceived > 0,
            paymentMilestones: []
          },
          deliverables: {
            rawPhotosCount: bkg.rawPhotos,
            editedPhotosCount: bkg.editedPhotos,
            videosCount: bkg.videos,
            reelsCount: bkg.reels,
            albumsCount: bkg.albumsCount,
            albumStatus: bkg.albumStatus,
            deliveryStatus: bkg.deliveryStatus,
            googleDriveLink: bkg.deliveryStatus === 'Delivered' ? `https://drive.google.com/shreejifilms/${bookingId}` : undefined
          },
          crew: bkg.crew,
          subEvents: subEvents.map(s => ({
            id: s.id,
            name: s.name,
            category: s.customCategory,
            date: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
            venue: s.venue,
            city: bkg.city
          })),
          isMultiEvent: bkg.isMultiEvent,
          notes: `Booking for ${bkg.eventName}. Quoted ${bkg.quotedPrice}, agreed ${bkg.finalAgreedAmount}.`,
          createdAt: '2026-01-15T09:00:00Z',
          updatedAt: '2026-11-14T09:00:00Z',
          demoSeed: true,
          isDemoData: true,
          seedBatchId: SEED_BATCH_ID,
          createdBy: CREATED_BY_SEED
        } as any);
      });

      // Write all to TenantStore
      TenantStore.set(studioId, 'employees', employees);
      TenantStore.set(studioId, 'customers', customers);
      TenantStore.set(studioId, 'events', events);
      TenantStore.set(studioId, 'subEvents', allSubEvents);
      TenantStore.set(studioId, 'tasks', allTasks);
      TenantStore.set(studioId, 'studio_bookings_v2', bookings);
      TenantStore.set(studioId, 'quotations', quotations);
      TenantStore.set(studioId, 'invoices', invoices);
      TenantStore.set(studioId, 'payments', payments);
      TenantStore.set(studioId, SEED_FLAG_KEY, true);

      // Write to Cloud Firestore using firestoreService batches (skip during test runner)
      const isTestRunner = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
      if (!isTestRunner) {
        try {
          await Promise.allSettled([
            firestoreService.saveCollectionBatch(studioId, 'employees', employees as any),
            firestoreService.saveCollectionBatch(studioId, 'customers', customers as any),
            firestoreService.saveCollectionBatch(studioId, 'events', events as any),
            firestoreService.saveCollectionBatch(studioId, 'subEvents', allSubEvents as any),
            firestoreService.saveCollectionBatch(studioId, 'tasks', allTasks as any),
            firestoreService.saveCollectionBatch(studioId, 'studio_bookings_v2', bookings as any),
            firestoreService.saveCollectionBatch(studioId, 'quotations', quotations as any),
            firestoreService.saveCollectionBatch(studioId, 'invoices', invoices as any),
            firestoreService.saveCollectionBatch(studioId, 'payments', payments as any)
          ]);
        } catch (err) {
          console.warn(`[Firestore Seed Batch Warning for ${studioId}]:`, err);
        }
      }

      if (studioId === targetStudioId) {
        summaryResult = this.computeSetupSummary(studioId);
      }
    }

    return summaryResult || this.computeSetupSummary(targetStudioId);
  }

  // Safe idempotent cleanup method
  static unseedShreejiStudio(studioId: string = 'studio_shreeji_films'): void {
    const filterOutSeed = (col: string) => {
      const items = TenantStore.get<any>(studioId, col) || [];
      const kept = items.filter(i => !(i.seedBatchId === SEED_BATCH_ID || i.isDemoData || i.demoSeed));
      TenantStore.set(studioId, col, kept);
    };

    const collections = ['employees', 'customers', 'events', 'subEvents', 'tasks', 'studio_bookings_v2', 'quotations', 'invoices', 'payments'];
    collections.forEach(c => filterOutSeed(c));
    TenantStore.set(studioId, SEED_FLAG_KEY, null);
  }

  // Summary generation helper
  static computeSetupSummary(studioId: string = 'studio_shreeji_films'): ShreejiSetupSummary {
    const employees = TenantStore.get<Employee>(studioId, 'employees') || [];
    const bookings = TenantStore.get<BookingRecord>(studioId, 'studio_bookings_v2') || [];
    const subEvents = TenantStore.get<SubEvent>(studioId, 'subEvents') || [];
    const customers = TenantStore.get<Customer>(studioId, 'customers') || [];
    const quotations = TenantStore.get<Quotation>(studioId, 'quotations') || [];
    const invoices = TenantStore.get<Invoice>(studioId, 'invoices') || [];
    const payments = TenantStore.get<Payment>(studioId, 'payments') || [];
    const tasks = TenantStore.get<Task>(studioId, 'tasks') || [];

    const statusDist: Record<string, number> = {
      completed: 0,
      deal_confirmed: 0,
      in_production: 0,
      editing: 0,
      partially_delivered: 0,
      advance_pending: 0,
      negotiation: 0,
      cancelled: 0
    };

    let totalQuoted = 0;
    let totalAgreed = 0;
    let totalDiscounts = 0;
    let totalReceived = 0;
    let totalPending = 0;

    bookings.forEach(b => {
      const st = b.status || 'deal_confirmed';
      statusDist[st] = (statusDist[st] || 0) + 1;

      const quoted = (b.financials as any)?.quotedAmount || b.financials?.originalQuotation || 0;
      const agreed = b.financials?.finalAgreedAmount || 0;
      const disc = b.financials?.negotiatedDiscount || 0;
      const rec = (b.financials as any)?.advancePaymentReceived || b.financials?.verifiedPaymentsReceived || 0;
      const pend = (b.financials as any)?.balanceRemaining || b.financials?.remainingBalance || 0;

      totalQuoted += quoted;
      totalAgreed += agreed;
      totalDiscounts += disc;
      totalReceived += rec;
      totalPending += pend;
    });

    return {
      totalEmployees: employees.length,
      totalBookings: bookings.length,
      totalSubEvents: subEvents.length,
      totalCustomers: customers.length,
      totalQuotations: quotations.length,
      totalInvoices: invoices.length,
      totalPayments: payments.length,
      totalTasks: tasks.length,
      statusDistribution: statusDist,
      revenueBreakdown: {
        totalQuotedValue: totalQuoted,
        totalAgreedValue: totalAgreed,
        totalReceived,
        totalPendingBalance: totalPending,
        totalDiscounts
      },
      firestoreCollectionsPopulated: [
        `/studios/${studioId}/employees`,
        `/studios/${studioId}/customers`,
        `/studios/${studioId}/events`,
        `/studios/${studioId}/subEvents`,
        `/studios/${studioId}/tasks`,
        `/studios/${studioId}/studio_bookings_v2`,
        `/studios/${studioId}/quotations`,
        `/studios/${studioId}/invoices`,
        `/studios/${studioId}/payments`
      ]
    };
  }
}
