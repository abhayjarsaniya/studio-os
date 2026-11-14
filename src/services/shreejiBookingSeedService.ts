import { TenantStore } from './tenantStore';
import { Customer, StudioEvent, Quotation, Invoice, Payment, Employee } from '../types/schema';
import { BookingRecord, FunctionPlan, DeliverableSpecification, BookingVersionRecord } from '../types/bookingProduction';
import { getSubEventsDef, getTasksForBooking, SEED_BATCH_ID, CREATED_BY_SEED } from './seedShreejiStudio';

export interface ShreejiSeedSummary {
  customersCount: number;
  bookingsCount: number;
  quotationsCount: number;
  invoicesCount: number;
  paymentsCount: number;
  employeesCount: number;
  totalAgreedValue: number;
  totalPaymentsReceived: number;
  totalNegotiatedDiscount: number;
}

export class ShreejiBookingSeedService {
  public static SEED_FLAG_KEY = 'shreeji_sample_bookings_seeded_v1';
  public static TARGET_STUDIO = 'std_demo_royal';

  // Demo Employees list for Shreeji Studio - 14 full crew members as requested
  static getDemoEmployees(studioId: string): Employee[] {
    return [
      {
        id: 'emp_shr_rahul',
        studioId,
        fullName: 'Rahul Sharma',
        employeeNumber: 'EMP-SHR-001',
        email: 'rahul.sharma@shreejifilms.in',
        phone: '+91 98251 10001',
        department: 'Photography',
        designation: 'Lead Photographer',
        roleId: 'lead_photographer',
        roleName: 'Lead Photographer',
        employmentStatus: 'active',
        skills: ['Traditional Photography', 'Candid Photography', 'Portraiture', 'Lighting Design', 'Client Posing'],
        monthlySalary: 45000,
        dailyRate: 4000,
        experienceYears: 8,
        createdAt: '2022-04-15T09:00:00Z',
        updatedAt: '2026-11-14T09:00:00Z',
        demoSeed: true,
        isDemoData: true,
        seedBatchId: 'shreeji_firebase_seed_v2026',
        createdBy: 'system_seed_admin'
      } as any,
      {
        id: 'emp_shr_karan',
        studioId,
        fullName: 'Karan Patel',
        employeeNumber: 'EMP-SHR-002',
        email: 'karan.patel@shreejifilms.in',
        phone: '+91 98251 10002',
        department: 'Photography',
        designation: 'Candid Photographer',
        roleId: 'photographer',
        roleName: 'Candid Photographer',
        employmentStatus: 'active',
        skills: ['Candid Moments', 'Low-light Photography', 'Sony Alpha Series', 'Street Portraiture'],
        monthlySalary: 38000,
        dailyRate: 3200,
        experienceYears: 5,
        createdAt: '2023-01-10T09:00:00Z',
        updatedAt: '2026-11-14T09:00:00Z',
        demoSeed: true,
        isDemoData: true,
        seedBatchId: 'shreeji_firebase_seed_v2026',
        createdBy: 'system_seed_admin'
      } as any,
      {
        id: 'emp_shr_vishal',
        studioId,
        fullName: 'Vishal Desai',
        employeeNumber: 'EMP-SHR-003',
        email: 'vishal.desai@shreejifilms.in',
        phone: '+91 98251 10003',
        department: 'Videography',
        designation: 'Videographer',
        roleId: 'videographer',
        roleName: 'Senior Videographer',
        employmentStatus: 'active',
        skills: ['Wedding Videography', 'Multi-Cam Setup', 'Live Audio Recording', 'Gimbal Stabilization'],
        monthlySalary: 40000,
        dailyRate: 3500,
        experienceYears: 7,
        createdAt: '2022-08-01T09:00:00Z',
        updatedAt: '2026-11-14T09:00:00Z',
        demoSeed: true,
        isDemoData: true,
        seedBatchId: 'shreeji_firebase_seed_v2026',
        createdBy: 'system_seed_admin'
      } as any,
      {
        id: 'emp_shr_meet',
        studioId,
        fullName: 'Meet Shah',
        employeeNumber: 'EMP-SHR-004',
        email: 'meet.shah@shreejifilms.in',
        phone: '+91 98251 10004',
        department: 'Cinematography',
        designation: 'Cinematographer',
        roleId: 'cinematographer',
        roleName: 'Cinematographer',
        employmentStatus: 'active',
        skills: ['Cinematic Visuals', 'Color Grading (DaVinci)', '4K 120fps Slow-mo', 'Creative Storyboarding'],
        monthlySalary: 48000,
        dailyRate: 4200,
        experienceYears: 6,
        createdAt: '2023-03-20T09:00:00Z',
        updatedAt: '2026-11-14T09:00:00Z',
        demoSeed: true,
        isDemoData: true,
        seedBatchId: 'shreeji_firebase_seed_v2026',
        createdBy: 'system_seed_admin'
      } as any,
      {
        id: 'emp_shr_jay',
        studioId,
        fullName: 'Jay Mehta',
        employeeNumber: 'EMP-SHR-005',
        email: 'jay.mehta@shreejifilms.in',
        phone: '+91 98251 10005',
        department: 'Drone',
        designation: 'Drone Operator',
        roleId: 'drone_operator',
        roleName: 'Drone Operator',
        employmentStatus: 'active',
        skills: ['DGCA Certified Pilot', 'DJI Mavic 3 Cine', 'FPV Dynamic Flights', 'Night Aerial Operations'],
        monthlySalary: 35000,
        dailyRate: 3000,
        experienceYears: 4,
        createdAt: '2023-06-15T09:00:00Z',
        updatedAt: '2026-11-14T09:00:00Z',
        demoSeed: true,
        isDemoData: true,
        seedBatchId: 'shreeji_firebase_seed_v2026',
        createdBy: 'system_seed_admin'
      } as any,
      {
        id: 'emp_shr_priya',
        studioId,
        fullName: 'Priya Joshi',
        employeeNumber: 'EMP-SHR-006',
        email: 'priya.joshi@shreejifilms.in',
        phone: '+91 98251 10006',
        department: 'Photo Editing',
        designation: 'Photo Editor',
        roleId: 'editor',
        roleName: 'Photo Editor',
        employmentStatus: 'active',
        skills: ['Adobe Lightroom Classic', 'Photoshop Retouching', 'Batch Processing', 'Color Grading'],
        monthlySalary: 32000,
        dailyRate: 2500,
        experienceYears: 6,
        createdAt: '2022-11-05T09:00:00Z',
        updatedAt: '2026-11-14T09:00:00Z',
        demoSeed: true,
        isDemoData: true,
        seedBatchId: 'shreeji_firebase_seed_v2026',
        createdBy: 'system_seed_admin'
      } as any,
      {
        id: 'emp_shr_riya',
        studioId,
        fullName: 'Riya Trivedi',
        employeeNumber: 'EMP-SHR-007',
        email: 'riya.trivedi@shreejifilms.in',
        phone: '+91 98251 10007',
        department: 'Video Editing',
        designation: 'Video Editor',
        roleId: 'editor',
        roleName: 'Video Editor',
        employmentStatus: 'active',
        skills: ['Premiere Pro', 'DaVinci Resolve', 'Instagram Reels & Shorts', 'Audio Synchronization'],
        monthlySalary: 34000,
        dailyRate: 2600,
        experienceYears: 4,
        createdAt: '2023-04-12T09:00:00Z',
        updatedAt: '2026-11-14T09:00:00Z',
        demoSeed: true,
        isDemoData: true,
        seedBatchId: 'shreeji_firebase_seed_v2026',
        createdBy: 'system_seed_admin'
      } as any,
      {
        id: 'emp_shr_neel',
        studioId,
        fullName: 'Neel Vyas',
        employeeNumber: 'EMP-SHR-008',
        email: 'neel.vyas@shreejifilms.in',
        phone: '+91 98251 10008',
        department: 'Album Designing',
        designation: 'Album Designer',
        roleId: 'album_designer',
        roleName: 'Album Designer',
        employmentStatus: 'active',
        skills: ['Adobe InDesign', 'Canvera Print Layouts', 'Typography', 'Leather Embossing Prep'],
        monthlySalary: 36000,
        dailyRate: 2800,
        experienceYears: 5,
        createdAt: '2022-09-18T09:00:00Z',
        updatedAt: '2026-11-14T09:00:00Z',
        demoSeed: true,
        isDemoData: true,
        seedBatchId: 'shreeji_firebase_seed_v2026',
        createdBy: 'system_seed_admin'
      } as any,
      {
        id: 'emp_shr_aman',
        studioId,
        fullName: 'Aman Parmar',
        employeeNumber: 'EMP-SHR-009',
        email: 'aman.parmar@shreejifilms.in',
        phone: '+91 98251 10009',
        department: 'Photography',
        designation: 'Photography Assistant',
        roleId: 'assistant',
        roleName: 'Photography Assistant',
        employmentStatus: 'active',
        skills: ['Light Modifier Handling', 'Reflector Angles', 'Battery & SD Management', 'Data Ingestion'],
        monthlySalary: 22000,
        dailyRate: 1800,
        experienceYears: 2,
        createdAt: '2024-02-01T09:00:00Z',
        updatedAt: '2026-11-14T09:00:00Z',
        demoSeed: true,
        isDemoData: true,
        seedBatchId: 'shreeji_firebase_seed_v2026',
        createdBy: 'system_seed_admin'
      } as any,
      {
        id: 'emp_shr_krunal',
        studioId,
        fullName: 'Krunal Dave',
        employeeNumber: 'EMP-SHR-010',
        email: 'krunal.dave@shreejifilms.in',
        phone: '+91 98251 10010',
        department: 'Production',
        designation: 'Production Manager',
        roleId: 'manager',
        roleName: 'Production Manager',
        employmentStatus: 'active',
        skills: ['Crew Scheduling', 'Equipment Logistics', 'Client Timeline Coordination', 'Crisis Management'],
        monthlySalary: 50000,
        dailyRate: 4500,
        experienceYears: 9,
        createdAt: '2021-07-01T09:00:00Z',
        updatedAt: '2026-11-14T09:00:00Z',
        demoSeed: true,
        isDemoData: true,
        seedBatchId: 'shreeji_firebase_seed_v2026',
        createdBy: 'system_seed_admin'
      } as any,
      {
        id: 'emp_shr_dhruv',
        studioId,
        fullName: 'Dhruv Patel',
        employeeNumber: 'EMP-SHR-011',
        email: 'dhruv.patel@shreejifilms.in',
        phone: '+91 98251 10011',
        department: 'Photography',
        designation: 'Photographer',
        roleId: 'photographer',
        roleName: 'Photographer',
        employmentStatus: 'active',
        skills: ['Stage Photography', 'Guest Group Photos', 'Speedlight Off-Camera Flash', 'Speed Edits'],
        monthlySalary: 30000,
        dailyRate: 2500,
        experienceYears: 3,
        createdAt: '2023-09-01T09:00:00Z',
        updatedAt: '2026-11-14T09:00:00Z',
        demoSeed: true,
        isDemoData: true,
        seedBatchId: 'shreeji_firebase_seed_v2026',
        createdBy: 'system_seed_admin'
      } as any,
      {
        id: 'emp_shr_kavya',
        studioId,
        fullName: 'Kavya Shah',
        employeeNumber: 'EMP-SHR-012',
        email: 'kavya.shah@shreejifilms.in',
        phone: '+91 98251 10012',
        department: 'Video Editing',
        designation: 'Editing Assistant',
        roleId: 'editor',
        roleName: 'Editing Assistant',
        employmentStatus: 'active',
        skills: ['Rough Cut Assembly', 'Subtitle Transcription', 'Proxy File Generation', 'Asset Archiving'],
        monthlySalary: 24000,
        dailyRate: 2000,
        experienceYears: 2,
        createdAt: '2024-05-15T09:00:00Z',
        updatedAt: '2026-11-14T09:00:00Z',
        demoSeed: true,
        isDemoData: true,
        seedBatchId: 'shreeji_firebase_seed_v2026',
        createdBy: 'system_seed_admin'
      } as any,
      {
        id: 'emp_shr_harsh',
        studioId,
        fullName: 'Harsh Modi',
        employeeNumber: 'EMP-SHR-013',
        email: 'harsh.modi@shreejifilms.in',
        phone: '+91 98251 10013',
        department: 'Photography',
        designation: 'Photography Assistant',
        roleId: 'assistant',
        roleName: 'Photography Assistant',
        employmentStatus: 'active',
        skills: ['Gear Transportation', 'Light Stands Rigging', 'On-Field Client Assistance', 'Lens Cleaning'],
        monthlySalary: 20000,
        dailyRate: 1700,
        experienceYears: 2,
        createdAt: '2024-03-10T09:00:00Z',
        updatedAt: '2026-11-14T09:00:00Z',
        demoSeed: true,
        isDemoData: true,
        seedBatchId: 'shreeji_firebase_seed_v2026',
        createdBy: 'system_seed_admin'
      } as any,
      {
        id: 'emp_shr_nisha',
        studioId,
        fullName: 'Nisha Desai',
        employeeNumber: 'EMP-SHR-014',
        email: 'nisha.desai@shreejifilms.in',
        phone: '+91 98251 10014',
        department: 'Album Designing',
        designation: 'Album Designer',
        roleId: 'album_designer',
        roleName: 'Album Designer',
        employmentStatus: 'active',
        skills: ['Photobook Narrative Flow', 'Custom Foil Stamping', 'Proofing Collaboration', 'Print Vendor QC'],
        monthlySalary: 33000,
        dailyRate: 2700,
        experienceYears: 3,
        createdAt: '2023-10-01T09:00:00Z',
        updatedAt: '2026-11-14T09:00:00Z',
        demoSeed: true,
        isDemoData: true,
        seedBatchId: 'shreeji_firebase_seed_v2026',
        createdBy: 'system_seed_admin'
      } as any
    ];
  }

  // 27 Detailed Sample Bookings Definitions
  static getSampleBookingsData(): Array<{
    id: string;
    bkgNum: string;
    customerName: string;
    phone: string;
    city: string;
    address: string;
    eventName: string;
    category: string;
    date: string;
    venue: string;
    status: any;
    quotedPrice: number;
    discount: number;
    discountReason: string;
    paymentReceived: number;
    paymentMethod: 'UPI' | 'Bank Transfer' | 'Cash' | 'Cheque' | 'Card';
    paymentRef: string;
    services: string[];
    crew: Array<{ id: string; name: string; role: string }>;
    rawPhotos: number;
    editedPhotos: number;
    videos: number;
    reels: number;
    albumsCount: number;
    albumStatus: 'None' | 'In Design' | 'Ready for Print' | 'Printed' | 'Delivered';
    deliveryStatus: 'Pending' | 'In Progress' | 'Partially Delivered' | 'Delivered';
  }> {
    return [
      {
        id: 'bkg_shr_001',
        bkgNum: 'SHR-BKG-2026-001',
        customerName: 'Aarav Patel',
        phone: '+91 98980 20001',
        city: 'Ahmedabad',
        address: 'Satellite, SG Highway',
        eventName: 'Aarav & Meera Grand Palace Wedding',
        category: 'Wedding',
        date: '2026-02-14',
        venue: 'The Ummed Palace, Ahmedabad',
        status: 'completed',
        quotedPrice: 180000,
        discount: 20000,
        discountReason: 'Early bird palace destination booking package concession',
        paymentReceived: 160000,
        paymentMethod: 'Bank Transfer',
        paymentRef: 'NEFT-AXIS-20260214-7891',
        services: ['Traditional Photography', 'Candid Photography', 'Cinematic Videography', 'Drone Aerials', 'Leatherbound Album (40 Sheets)'],
        crew: [
          { id: 'emp_shr_rahul', name: 'Rahul Panchal', role: 'Lead Photographer' },
          { id: 'emp_shr_karan', name: 'Karan Dave', role: 'Candid Photographer' },
          { id: 'emp_shr_meet', name: 'Meet Mehta', role: 'Cinematographer' },
          { id: 'emp_shr_neel', name: 'Neel Shah', role: 'Album Designer' }
        ],
        rawPhotos: 2200,
        editedPhotos: 450,
        videos: 2,
        reels: 5,
        albumsCount: 2,
        albumStatus: 'Delivered',
        deliveryStatus: 'Delivered'
      },
      {
        id: 'bkg_shr_002',
        bkgNum: 'SHR-BKG-2026-002',
        customerName: 'Riya Shah',
        phone: '+91 98980 20002',
        city: 'Gandhinagar',
        address: 'Sector 8, Gandhinagar',
        eventName: 'Riya & Harsh Romantic Heritage Pre-Wedding',
        category: 'Pre-Wedding',
        date: '2026-03-01',
        venue: 'Adalaj Stepwell & Polo Forest',
        status: 'fully_delivered',
        quotedPrice: 65000,
        discount: 5000,
        discountReason: 'Social media reel tagging discount',
        paymentReceived: 60000,
        paymentMethod: 'UPI',
        paymentRef: 'UPI-GPAY-9898020002-3341',
        services: ['Candid Photography', 'Cinematic Music Film', 'Drone Aerials', 'Instagram Reels'],
        crew: [
          { id: 'emp_shr_karan', name: 'Karan Dave', role: 'Candid Photographer' },
          { id: 'emp_shr_meet', name: 'Meet Mehta', role: 'Cinematographer' },
          { id: 'emp_shr_riya', name: 'Riya Trivedi', role: 'Reels Editor' }
        ],
        rawPhotos: 850,
        editedPhotos: 120,
        videos: 1,
        reels: 4,
        albumsCount: 0,
        albumStatus: 'None',
        deliveryStatus: 'Delivered'
      },
      {
        id: 'bkg_shr_003',
        bkgNum: 'SHR-BKG-2026-003',
        customerName: 'Krish Mehta',
        phone: '+91 98980 20003',
        city: 'Vadodara',
        address: 'Alkapuri, Vadodara',
        eventName: 'Krish & Pooja Royal Engagement Ceremony',
        category: 'Engagement',
        date: '2026-03-10',
        venue: 'Laxmi Vilas Palace Banquet, Vadodara',
        status: 'editing',
        quotedPrice: 85000,
        discount: 10000,
        discountReason: 'Family reference concession from Mr. Arvind Mehta',
        paymentReceived: 50000,
        paymentMethod: 'UPI',
        paymentRef: 'UPI-PHONEPE-9898020003-8871',
        services: ['Traditional Photography', 'Candid Photography', 'Full Event Video', 'Online Digital Gallery'],
        crew: [
          { id: 'emp_shr_rahul', name: 'Rahul Panchal', role: 'Lead Photographer' },
          { id: 'emp_shr_vishal', name: 'Vishal Soni', role: 'Videographer' },
          { id: 'emp_shr_priya', name: 'Priya Joshi', role: 'Photo Editor' }
        ],
        rawPhotos: 1400,
        editedPhotos: 200,
        videos: 1,
        reels: 2,
        albumsCount: 1,
        albumStatus: 'In Design',
        deliveryStatus: 'In Progress'
      },
      {
        id: 'bkg_shr_004',
        bkgNum: 'SHR-BKG-2026-004',
        customerName: 'Diya Desai',
        phone: '+91 98980 20004',
        city: 'Surat',
        address: 'Vesu Main Road, Surat',
        eventName: 'Diya Sweet 16 Princess Birthday Gala',
        category: 'Birthday',
        date: '2026-03-15',
        venue: 'Avadh Utopia Club, Surat',
        status: 'completed',
        quotedPrice: 40000,
        discount: 3000,
        discountReason: 'Single session birthday special package offer',
        paymentReceived: 37000,
        paymentMethod: 'Cash',
        paymentRef: 'CASH-REC-20260315-004',
        services: ['Traditional Photography', 'Party Highlight Reel', 'Instant Photo Prints'],
        crew: [
          { id: 'emp_shr_karan', name: 'Karan Dave', role: 'Photographer' },
          { id: 'emp_shr_aman', name: 'Aman Patel', role: 'Lighting Assistant' }
        ],
        rawPhotos: 600,
        editedPhotos: 90,
        videos: 1,
        reels: 2,
        albumsCount: 1,
        albumStatus: 'Delivered',
        deliveryStatus: 'Delivered'
      },
      {
        id: 'bkg_shr_005',
        bkgNum: 'SHR-BKG-2026-005',
        customerName: 'Harsh Trivedi',
        phone: '+91 98980 20005',
        city: 'Rajkot',
        address: 'Kalawad Road, Rajkot',
        eventName: 'Harsh & Sneha 3-Day Royal Gujarati Wedding',
        category: 'Wedding',
        date: '2026-03-20',
        venue: 'Regent Palace Resort, Rajkot',
        status: 'partially_delivered',
        quotedPrice: 240000,
        discount: 25000,
        discountReason: 'Multi-function 3-day combo booking discount',
        paymentReceived: 180000,
        paymentMethod: 'Bank Transfer',
        paymentRef: 'IMPS-HDFC-20260320-1122',
        services: ['Candid Photography (2 Photographers)', 'Traditional Video', 'Cinematic Film', 'Drone 4K', '2 Premium Canvera Albums'],
        crew: [
          { id: 'emp_shr_rahul', name: 'Rahul Panchal', role: 'Lead Photographer' },
          { id: 'emp_shr_karan', name: 'Karan Dave', role: 'Candid Photographer' },
          { id: 'emp_shr_meet', name: 'Meet Mehta', role: 'Cinematographer' },
          { id: 'emp_shr_jay', name: 'Jay Barot', role: 'Drone Pilot' },
          { id: 'emp_shr_neel', name: 'Neel Shah', role: 'Album Designer' }
        ],
        rawPhotos: 3400,
        editedPhotos: 600,
        videos: 3,
        reels: 6,
        albumsCount: 2,
        albumStatus: 'Ready for Print',
        deliveryStatus: 'Partially Delivered'
      },
      {
        id: 'bkg_shr_006',
        bkgNum: 'SHR-BKG-2026-006',
        customerName: 'Mahi Joshi',
        phone: '+91 98980 20006',
        city: 'Ahmedabad',
        address: 'Bodakdev, Ahmedabad',
        eventName: 'Mahi Serene Outdoor Maternity Shoot',
        category: 'Maternity',
        date: '2026-03-25',
        venue: 'Gulmohar Greens Golf & Country Club',
        status: 'fully_delivered',
        quotedPrice: 35000,
        discount: 3000,
        discountReason: 'Client provided indoor wardrobe styling',
        paymentReceived: 32000,
        paymentMethod: 'UPI',
        paymentRef: 'UPI-PAYTM-9898020006-4412',
        services: ['Candid Portraiture', 'Creative Lighting', 'Fine Art Retouching', 'Mini Coffee Table Photobook'],
        crew: [
          { id: 'emp_shr_karan', name: 'Karan Dave', role: 'Photographer' },
          { id: 'emp_shr_priya', name: 'Priya Joshi', role: 'Photo Editor' }
        ],
        rawPhotos: 450,
        editedPhotos: 45,
        videos: 0,
        reels: 1,
        albumsCount: 1,
        albumStatus: 'Delivered',
        deliveryStatus: 'Delivered'
      },
      {
        id: 'bkg_shr_007',
        bkgNum: 'SHR-BKG-2026-007',
        customerName: 'Dev Parmar',
        phone: '+91 98980 20007',
        city: 'Anand',
        address: 'GIDC Industrial Estate, Vitthal Udyognagar',
        eventName: 'Dev Agro Products Commercial Catalog Shoot',
        category: 'Product',
        date: '2026-04-02',
        venue: 'Shreeji Studio A - Cyclorama Studio',
        status: 'completed',
        quotedPrice: 55000,
        discount: 5000,
        discountReason: 'High volume SKU product catalog pricing tier',
        paymentReceived: 50000,
        paymentMethod: 'Bank Transfer',
        paymentRef: 'RTGS-SBI-20260402-9901',
        services: ['Studio Tabletop Photography', 'E-commerce White Background Clipping', 'High-Res Hero Shots'],
        crew: [
          { id: 'emp_shr_rahul', name: 'Rahul Panchal', role: 'Commercial Photographer' },
          { id: 'emp_shr_priya', name: 'Priya Joshi', role: 'Retoucher' }
        ],
        rawPhotos: 600,
        editedPhotos: 150,
        videos: 0,
        reels: 0,
        albumsCount: 0,
        albumStatus: 'None',
        deliveryStatus: 'Delivered'
      },
      {
        id: 'bkg_shr_008',
        bkgNum: 'SHR-BKG-2026-008',
        customerName: 'Nisha Thakkar',
        phone: '+91 98980 20008',
        city: 'Ahmedabad',
        address: 'Sindhu Bhavan Road, Ahmedabad',
        eventName: 'Nisha & Kunal Grand Wedding Reception',
        category: 'Reception',
        date: '2026-04-08',
        venue: 'Taj Skyline Grand Ballroom, Ahmedabad',
        status: 'in_production',
        quotedPrice: 95000,
        discount: 10000,
        discountReason: 'Corporate partner discount for Thakkar Group',
        paymentReceived: 50000,
        paymentMethod: 'Cheque',
        paymentRef: 'CHQ-ICICI-441209',
        services: ['Stage & VIP Candid Photography', 'Live Projection Videography', 'Drone Hall Overflight', 'Online Live Gallery'],
        crew: [
          { id: 'emp_shr_rahul', name: 'Rahul Panchal', role: 'Lead Photographer' },
          { id: 'emp_shr_vishal', name: 'Vishal Soni', role: 'Videographer' },
          { id: 'emp_shr_jay', name: 'Jay Barot', role: 'Drone Pilot' }
        ],
        rawPhotos: 1200,
        editedPhotos: 250,
        videos: 1,
        reels: 3,
        albumsCount: 1,
        albumStatus: 'In Design',
        deliveryStatus: 'In Progress'
      },
      {
        id: 'bkg_shr_009',
        bkgNum: 'SHR-BKG-2026-009',
        customerName: 'Yash Vyas',
        phone: '+91 98980 20009',
        city: 'Surat',
        address: 'Ghod Dod Road, Surat',
        eventName: 'Yash Festive Haldi & Sangeet Beats',
        category: 'Haldi & Mehndi',
        date: '2026-04-12',
        venue: 'Club Bellwether, Dumas Road, Surat',
        status: 'in_production',
        quotedPrice: 75000,
        discount: 8000,
        discountReason: 'Off-peak Sunday morning function rate',
        paymentReceived: 40000,
        paymentMethod: 'UPI',
        paymentRef: 'UPI-GPAY-9898020009-1299',
        services: ['Haldi Color Stills', 'High-Speed Sangeet Dance Videography', 'Vertical Reels Package'],
        crew: [
          { id: 'emp_shr_karan', name: 'Karan Dave', role: 'Candid Photographer' },
          { id: 'emp_shr_meet', name: 'Meet Mehta', role: 'Cinematographer' }
        ],
        rawPhotos: 1100,
        editedPhotos: 180,
        videos: 1,
        reels: 4,
        albumsCount: 1,
        albumStatus: 'In Design',
        deliveryStatus: 'In Progress'
      },
      {
        id: 'bkg_shr_010',
        bkgNum: 'SHR-BKG-2026-010',
        customerName: 'Aanya Dave',
        phone: '+91 98980 20010',
        city: 'Vadodara',
        address: 'Vasna Road, Vadodara',
        eventName: 'Baby Aanya Milestone Newborn Portraits',
        category: 'Newborn',
        date: '2026-04-18',
        venue: 'Dave Residence Cozy Setup, Vadodara',
        status: 'completed',
        quotedPrice: 28000,
        discount: 2000,
        discountReason: 'Hospital discharge early booking voucher',
        paymentReceived: 26000,
        paymentMethod: 'UPI',
        paymentRef: 'UPI-PHONEPE-9898020010-0981',
        services: ['Infant Safe Lighting Stills', 'Prop & Swaddle Styling', 'Velvet Bound Mini Album'],
        crew: [
          { id: 'emp_shr_karan', name: 'Karan Dave', role: 'Photographer' },
          { id: 'emp_shr_priya', name: 'Priya Joshi', role: 'Editor' }
        ],
        rawPhotos: 300,
        editedPhotos: 35,
        videos: 0,
        reels: 1,
        albumsCount: 1,
        albumStatus: 'Delivered',
        deliveryStatus: 'Delivered'
      },
      {
        id: 'bkg_shr_011',
        bkgNum: 'SHR-BKG-2026-011',
        customerName: 'Dhruv Patel',
        phone: '+91 98980 20011',
        city: 'Gandhinagar',
        address: 'Infocity, Gandhinagar',
        eventName: 'Fintech Gujarat Annual Leadership Summit 2026',
        category: 'Corporate',
        date: '2026-04-22',
        venue: 'Mahatma Mandir Convention Centre, Gandhinagar',
        status: 'confirmed',
        quotedPrice: 110000,
        discount: 10000,
        discountReason: 'Govt & Tech forum registered partner rebate',
        paymentReceived: 50000,
        paymentMethod: 'Bank Transfer',
        paymentRef: 'NEFT-KOTAK-20260422-7744',
        services: ['Keynote Speaker Stills', 'Audience Reaction Coverage', '2-Camera Live Stream Video', 'Same-Day Press Release Media Pack'],
        crew: [
          { id: 'emp_shr_rahul', name: 'Rahul Panchal', role: 'Lead Photographer' },
          { id: 'emp_shr_vishal', name: 'Vishal Soni', role: 'Live Videographer' },
          { id: 'emp_shr_krunal', name: 'Krunal Desai', role: 'Production Manager' }
        ],
        rawPhotos: 1500,
        editedPhotos: 300,
        videos: 2,
        reels: 3,
        albumsCount: 0,
        albumStatus: 'None',
        deliveryStatus: 'Pending'
      },
      {
        id: 'bkg_shr_012',
        bkgNum: 'SHR-BKG-2026-012',
        customerName: 'Kavya Shah',
        phone: '+91 98980 20012',
        city: 'Rajkot',
        address: 'University Road, Rajkot',
        eventName: 'Shah Extended Family 50-Year Heritage Gathering',
        category: 'Family',
        date: '2026-04-28',
        venue: 'The Imperial Palace, Rajkot',
        status: 'editing',
        quotedPrice: 48000,
        discount: 4000,
        discountReason: 'Senior citizen 50th jubilee family gesture',
        paymentReceived: 30000,
        paymentMethod: 'Cash',
        paymentRef: 'CASH-REC-20260428-012',
        services: ['Generational Portraits', 'Candid Family Moments', 'Custom Wooden Framed Art Print'],
        crew: [
          { id: 'emp_shr_karan', name: 'Karan Dave', role: 'Photographer' },
          { id: 'emp_shr_priya', name: 'Priya Joshi', role: 'Retoucher' }
        ],
        rawPhotos: 750,
        editedPhotos: 110,
        videos: 0,
        reels: 2,
        albumsCount: 1,
        albumStatus: 'In Design',
        deliveryStatus: 'In Progress'
      },
      {
        id: 'bkg_shr_013',
        bkgNum: 'SHR-BKG-2026-013',
        customerName: 'Manav Bhatt',
        phone: '+91 98980 20013',
        city: 'Ahmedabad',
        address: 'Naranpura, Ahmedabad',
        eventName: 'Manav & Anjali Desert Dunes Pre-Wedding',
        category: 'Pre-Wedding',
        date: '2026-05-02',
        venue: 'Little Rann of Kutch & Desert Oasis',
        status: 'partially_delivered',
        quotedPrice: 80000,
        discount: 8000,
        discountReason: 'Travel cost sharing for Kutch schedule',
        paymentReceived: 65000,
        paymentMethod: 'UPI',
        paymentRef: 'UPI-AXIS-9898020013-3321',
        services: ['Sunset Candid Photography', 'Slow-Mo 4K Cinematic Video', 'FPV Drone Action Shots', '8 Vertical Reels'],
        crew: [
          { id: 'emp_shr_karan', name: 'Karan Dave', role: 'Candid Photographer' },
          { id: 'emp_shr_meet', name: 'Meet Mehta', role: 'Cinematographer' },
          { id: 'emp_shr_jay', name: 'Jay Barot', role: 'Drone Operator' }
        ],
        rawPhotos: 1100,
        editedPhotos: 160,
        videos: 1,
        reels: 8,
        albumsCount: 1,
        albumStatus: 'Ready for Print',
        deliveryStatus: 'Partially Delivered'
      },
      {
        id: 'bkg_shr_014',
        bkgNum: 'SHR-BKG-2026-014',
        customerName: 'Pooja Solanki',
        phone: '+91 98980 20014',
        city: 'Junagadh',
        address: 'Moti Baug, Junagadh',
        eventName: 'Pooja & Chetan 25th Silver Wedding Anniversary',
        category: 'Anniversary',
        date: '2026-05-08',
        venue: 'Gir Lions Safari Club & Resort, Junagadh',
        status: 'deal_confirmed',
        quotedPrice: 62000,
        discount: 6000,
        discountReason: 'Junagadh destination loyalty discount',
        paymentReceived: 35000,
        paymentMethod: 'Bank Transfer',
        paymentRef: 'IMPS-ICICI-20260508-4499',
        services: ['Vintage Candid Stills', 'Couple Retrospective Video', 'Embossed Silver Hardcover Album'],
        crew: [
          { id: 'emp_shr_rahul', name: 'Rahul Panchal', role: 'Lead Photographer' },
          { id: 'emp_shr_vishal', name: 'Vishal Soni', role: 'Videographer' }
        ],
        rawPhotos: 850,
        editedPhotos: 130,
        videos: 1,
        reels: 2,
        albumsCount: 1,
        albumStatus: 'In Design',
        deliveryStatus: 'Pending'
      },
      {
        id: 'bkg_shr_015',
        bkgNum: 'SHR-BKG-2026-015',
        customerName: 'Reyansh Modi',
        phone: '+91 98980 20015',
        city: 'Surat',
        address: 'Adajan, Surat',
        eventName: 'Reyansh & Trisha Grand Diamond City Wedding',
        category: 'Wedding',
        date: '2026-05-15',
        venue: 'Surat International Exhibition & Convention Centre',
        status: 'deal_confirmed',
        quotedPrice: 280000,
        discount: 30000,
        discountReason: 'Diamond merchants association high-volume booking concession',
        paymentReceived: 150000,
        paymentMethod: 'Bank Transfer',
        paymentRef: 'RTGS-HDFC-20260515-9922',
        services: ['3 Senior Candid Photographers', '2 4K Cinematic Videographers', 'Dual Heavy-Lift 4K Drones', '3 Canvera Signature Albums', 'Instant Same-Day Highlight Teaser'],
        crew: [
          { id: 'emp_shr_rahul', name: 'Rahul Panchal', role: 'Lead Director' },
          { id: 'emp_shr_karan', name: 'Karan Dave', role: 'Candid Photographer' },
          { id: 'emp_shr_meet', name: 'Meet Mehta', role: 'Cinematographer' },
          { id: 'emp_shr_jay', name: 'Jay Barot', role: 'Drone Pilot' },
          { id: 'emp_shr_neel', name: 'Neel Shah', role: 'Album Designer' }
        ],
        rawPhotos: 4200,
        editedPhotos: 800,
        videos: 3,
        reels: 10,
        albumsCount: 3,
        albumStatus: 'In Design',
        deliveryStatus: 'Pending'
      },
      {
        id: 'bkg_shr_016',
        bkgNum: 'SHR-BKG-2026-016',
        customerName: 'Krupa Panchal',
        phone: '+91 98980 20016',
        city: 'Anand',
        address: 'Amul Dairy Road, Anand',
        eventName: 'Krupa & Bhavik Two-State Gujarati-Punjabi Wedding',
        category: 'Wedding',
        date: '2026-05-22',
        venue: 'Madhuban Resort & Spa, Anand',
        status: 'in_production',
        quotedPrice: 195000,
        discount: 15000,
        discountReason: 'Multi-day resort exclusive partner discount',
        paymentReceived: 120000,
        paymentMethod: 'UPI',
        paymentRef: 'UPI-GPAY-9898020016-8801',
        services: ['Bilingual Ceremony Photography', 'Candid Stills', 'Cinematic Wedding Film', 'Handcrafted Flushmount Albums'],
        crew: [
          { id: 'emp_shr_rahul', name: 'Rahul Panchal', role: 'Lead Photographer' },
          { id: 'emp_shr_meet', name: 'Meet Mehta', role: 'Cinematographer' },
          { id: 'emp_shr_neel', name: 'Neel Shah', role: 'Album Designer' }
        ],
        rawPhotos: 2600,
        editedPhotos: 500,
        videos: 2,
        reels: 5,
        albumsCount: 2,
        albumStatus: 'In Design',
        deliveryStatus: 'In Progress'
      },
      {
        id: 'bkg_shr_017',
        bkgNum: 'SHR-BKG-2026-017',
        customerName: 'Siddharth Rana',
        phone: '+91 98980 20017',
        city: 'Ahmedabad',
        address: 'Prahlad Nagar, Ahmedabad',
        eventName: 'Rana Haute Couture Summer 2026 Fashion Campaign',
        category: 'Fashion',
        date: '2026-05-28',
        venue: 'Shreeji Studio A & Sarkhej Roza Heritage Steps',
        status: 'fully_delivered',
        quotedPrice: 90000,
        discount: 10000,
        discountReason: 'Editorial portfolio credit collaboration rate',
        paymentReceived: 80000,
        paymentMethod: 'Bank Transfer',
        paymentRef: 'NEFT-ICICI-20260528-6611',
        services: ['High Fashion Lookbook', 'Model Runway Video Clips', 'Magazine Print Retouching'],
        crew: [
          { id: 'emp_shr_rahul', name: 'Rahul Panchal', role: 'Fashion Photographer' },
          { id: 'emp_shr_meet', name: 'Meet Mehta', role: 'Cinematographer' },
          { id: 'emp_shr_priya', name: 'Priya Joshi', role: 'Lead Retoucher' }
        ],
        rawPhotos: 900,
        editedPhotos: 120,
        videos: 1,
        reels: 6,
        albumsCount: 0,
        albumStatus: 'None',
        deliveryStatus: 'Delivered'
      },
      {
        id: 'bkg_shr_018',
        bkgNum: 'SHR-BKG-2026-018',
        customerName: 'Isha Gohil',
        phone: '+91 98980 20018',
        city: 'Vadodara',
        address: 'Gotri Road, Vadodara',
        eventName: 'Isha Blessing Baby Shower & Godh Bharai',
        category: 'Baby Shower',
        date: '2026-06-04',
        venue: 'Sayaji Hotel Crystal Hall, Vadodara',
        status: 'completed',
        quotedPrice: 38000,
        discount: 3000,
        discountReason: 'Traditional afternoon ceremony discount',
        paymentReceived: 35000,
        paymentMethod: 'UPI',
        paymentRef: 'UPI-PHONEPE-9898020018-9912',
        services: ['Traditional Ritual Stills', 'Family Candid Moments', 'Mini Linen Bound Album'],
        crew: [
          { id: 'emp_shr_karan', name: 'Karan Dave', role: 'Photographer' },
          { id: 'emp_shr_priya', name: 'Priya Joshi', role: 'Photo Editor' }
        ],
        rawPhotos: 550,
        editedPhotos: 80,
        videos: 0,
        reels: 2,
        albumsCount: 1,
        albumStatus: 'Delivered',
        deliveryStatus: 'Delivered'
      },
      {
        id: 'bkg_shr_019',
        bkgNum: 'SHR-BKG-2026-019',
        customerName: 'Parth Soni',
        phone: '+91 98980 20019',
        city: 'Gandhinagar',
        address: 'Sector 21, Gandhinagar',
        eventName: 'DPS Gandhinagar Annual Convocation & Cultural Fest',
        category: 'School Event',
        date: '2026-06-12',
        venue: 'DPS Auditorium Complex, Gandhinagar',
        status: 'advance_received',
        quotedPrice: 72000,
        discount: 7000,
        discountReason: 'Educational non-profit institutional pricing',
        paymentReceived: 35000,
        paymentMethod: 'Cheque',
        paymentRef: 'CHQ-SBI-558812',
        services: ['Graduation Stage Portraiture', 'Full Auditorium Dance Videography', 'Class Group Photos with Mounts'],
        crew: [
          { id: 'emp_shr_rahul', name: 'Rahul Panchal', role: 'Lead Photographer' },
          { id: 'emp_shr_vishal', name: 'Vishal Soni', role: 'Videographer' }
        ],
        rawPhotos: 1200,
        editedPhotos: 200,
        videos: 1,
        reels: 2,
        albumsCount: 0,
        albumStatus: 'None',
        deliveryStatus: 'Pending'
      },
      {
        id: 'bkg_shr_020',
        bkgNum: 'SHR-BKG-2026-020',
        customerName: 'Neha Pandya',
        phone: '+91 98980 20020',
        city: 'Rajkot',
        address: '150 Feet Ring Road, Rajkot',
        eventName: 'Neha & Ronak Royal Heritage Nuptials',
        category: 'Wedding',
        date: '2026-06-20',
        venue: 'Heritage Khirasara Palace, Rajkot',
        status: 'advance_pending',
        quotedPrice: 210000,
        discount: 20000,
        discountReason: 'Monsoon season destination package special',
        paymentReceived: 0,
        paymentMethod: 'Bank Transfer',
        paymentRef: 'PENDING',
        services: ['Palace Candid Photography', '4K Drone Flight', 'Cinematic Aftermovie', '2 Custom Velvet Bound Photobooks'],
        crew: [
          { id: 'emp_shr_rahul', name: 'Rahul Panchal', role: 'Lead Photographer' },
          { id: 'emp_shr_meet', name: 'Meet Mehta', role: 'Cinematographer' },
          { id: 'emp_shr_jay', name: 'Jay Barot', role: 'Drone Pilot' }
        ],
        rawPhotos: 2800,
        editedPhotos: 550,
        videos: 2,
        reels: 6,
        albumsCount: 2,
        albumStatus: 'None',
        deliveryStatus: 'Pending'
      },
      {
        id: 'bkg_shr_021',
        bkgNum: 'SHR-BKG-2026-021',
        customerName: 'Kunal Barot',
        phone: '+91 98980 20021',
        city: 'Ahmedabad',
        address: 'Thaltej, Ahmedabad',
        eventName: 'Gujarat Tourism High-Octane Drone Showcase',
        category: 'Drone & Cinematic Shoot',
        date: '2026-06-28',
        venue: 'Statue of Unity & Narmada Riverfront',
        status: 'completed',
        quotedPrice: 125000,
        discount: 15000,
        discountReason: 'Tourism board seasonal filming permit package',
        paymentReceived: 110000,
        paymentMethod: 'Bank Transfer',
        paymentRef: 'RTGS-BOB-20260628-8833',
        services: ['Dual 4K Drone Operations', 'Cinematic 60fps Sunset B-Roll', 'Color Grading in DaVinci Resolve'],
        crew: [
          { id: 'emp_shr_meet', name: 'Meet Mehta', role: 'Cinematographer' },
          { id: 'emp_shr_jay', name: 'Jay Barot', role: 'Senior Drone Pilot' },
          { id: 'emp_shr_riya', name: 'Riya Trivedi', role: 'Editor' }
        ],
        rawPhotos: 400,
        editedPhotos: 80,
        videos: 3,
        reels: 5,
        albumsCount: 0,
        albumStatus: 'None',
        deliveryStatus: 'Delivered'
      },
      {
        id: 'bkg_shr_022',
        bkgNum: 'SHR-BKG-2026-022',
        customerName: 'Jhanvi Shah',
        phone: '+91 98980 20022',
        city: 'Surat',
        address: 'City Light Road, Surat',
        eventName: 'Jhanvi & Tirth Mehndi & Reception Festivities',
        category: 'Mehndi & Reception',
        date: '2026-07-05',
        venue: 'Surat Marriott Hotel, Athwalines',
        status: 'negotiation',
        quotedPrice: 135000,
        discount: 15000,
        discountReason: 'Family negotiated two-function package discount',
        paymentReceived: 20000,
        paymentMethod: 'UPI',
        paymentRef: 'UPI-GPAY-9898020022-5501',
        services: ['Intricate Mehndi Photography', 'Reception Grand Entrance Live Video', 'Handcrafted Canvera Album'],
        crew: [
          { id: 'emp_shr_rahul', name: 'Rahul Panchal', role: 'Lead Photographer' },
          { id: 'emp_shr_karan', name: 'Karan Dave', role: 'Candid Photographer' },
          { id: 'emp_shr_vishal', name: 'Vishal Soni', role: 'Videographer' }
        ],
        rawPhotos: 1600,
        editedPhotos: 320,
        videos: 2,
        reels: 4,
        albumsCount: 1,
        albumStatus: 'None',
        deliveryStatus: 'Pending'
      },
      {
        id: 'bkg_shr_023',
        bkgNum: 'SHR-BKG-2026-023',
        customerName: 'Om Patel',
        phone: '+91 98980 20023',
        city: 'Anand',
        address: 'Vallabh Vidyanagar, Anand',
        eventName: 'Patel Heritage Estate Outdoor Family Portrait',
        category: 'Family Portrait',
        date: '2026-07-12',
        venue: 'Patel Farmhouse Orchards, Vidyanagar',
        status: 'completed',
        quotedPrice: 32000,
        discount: 2000,
        discountReason: 'Vidyanagar university campus alumni rate',
        paymentReceived: 30000,
        paymentMethod: 'Cash',
        paymentRef: 'CASH-REC-20260712-023',
        services: ['Golden Hour Outdoor Portraits', 'Matte Finish Fine Art Canvas Print (24x36)'],
        crew: [
          { id: 'emp_shr_karan', name: 'Karan Dave', role: 'Photographer' },
          { id: 'emp_shr_priya', name: 'Priya Joshi', role: 'Retoucher' }
        ],
        rawPhotos: 400,
        editedPhotos: 50,
        videos: 0,
        reels: 1,
        albumsCount: 1,
        albumStatus: 'Delivered',
        deliveryStatus: 'Delivered'
      },
      {
        id: 'bkg_shr_024',
        bkgNum: 'SHR-BKG-2026-024',
        customerName: 'Sanvi Desai',
        phone: '+91 98980 20024',
        city: 'Vadodara',
        address: 'Karelibaug, Vadodara',
        eventName: 'Sanvi Desai Bespoke Luxury Wedding Album Repack',
        category: 'Wedding Album Package',
        date: '2026-07-18',
        venue: 'Shreeji Studio Design Lab',
        status: 'fully_delivered',
        quotedPrice: 45000,
        discount: 5000,
        discountReason: 'Album upgrade package loyalty rebate',
        paymentReceived: 40000,
        paymentMethod: 'UPI',
        paymentRef: 'UPI-PHONEPE-9898020024-8899',
        services: ['Canvera Ultra HD Non-Tearable Lamination Sheets', 'Italian Acrylic Glass Cover', 'Parent Mini Album Copies'],
        crew: [
          { id: 'emp_shr_neel', name: 'Neel Shah', role: 'Master Album Designer' }
        ],
        rawPhotos: 0,
        editedPhotos: 350,
        videos: 0,
        reels: 0,
        albumsCount: 3,
        albumStatus: 'Delivered',
        deliveryStatus: 'Delivered'
      },
      {
        id: 'bkg_shr_025',
        bkgNum: 'SHR-BKG-2026-025',
        customerName: 'Mihir Joshi',
        phone: '+91 98980 20025',
        city: 'Ahmedabad',
        address: 'Vastrapur, Ahmedabad',
        eventName: 'Joshi Healthcare Corporate Brand & Facility Film',
        category: 'Corporate',
        date: '2026-07-25',
        venue: 'Joshi Superspeciality Hospital Campus, Ahmedabad',
        status: 'deal_confirmed',
        quotedPrice: 140000,
        discount: 15000,
        discountReason: 'Healthcare enterprise annual media retainer contract',
        paymentReceived: 75000,
        paymentMethod: 'Bank Transfer',
        paymentRef: 'NEFT-AXIS-20260725-3399',
        services: ['Medical Facility High-Definition Stills', 'Doctor Interview Sound Bites', '3-Minute Corporate Brand Film', 'Indoor Drone Walkthrough'],
        crew: [
          { id: 'emp_shr_rahul', name: 'Rahul Panchal', role: 'Lead Photographer' },
          { id: 'emp_shr_meet', name: 'Meet Mehta', role: 'Cinematographer' },
          { id: 'emp_shr_jay', name: 'Jay Barot', role: 'Drone Pilot' },
          { id: 'emp_shr_krunal', name: 'Krunal Desai', role: 'Production Manager' }
        ],
        rawPhotos: 1200,
        editedPhotos: 250,
        videos: 2,
        reels: 4,
        albumsCount: 0,
        albumStatus: 'None',
        deliveryStatus: 'Pending'
      },
      {
        id: 'bkg_shr_026',
        bkgNum: 'SHR-BKG-2026-026',
        customerName: 'Tanvi Vora',
        phone: '+91 98980 20026',
        city: 'Ahmedabad',
        address: 'Gulbai Tekra, Ahmedabad',
        eventName: 'Tanvi & Naman Royal Lake Palace Wedding Destination',
        category: 'Wedding',
        date: '2026-08-05',
        venue: 'Chundam Palace, Udaipur / Ahmedabad Flagoff',
        status: 'quotation_sent',
        quotedPrice: 320000,
        discount: 35000,
        discountReason: 'Destination wedding promotional portfolio feature discount',
        paymentReceived: 0,
        paymentMethod: 'Bank Transfer',
        paymentRef: 'PENDING',
        services: ['Full 3-Day Destination Coverage', '3 Photographers + 3 Cinematographers', '4K Aerial Drones', '3 Signature Photobooks', 'Daily Reels'],
        crew: [
          { id: 'emp_shr_rahul', name: 'Rahul Panchal', role: 'Lead Director' },
          { id: 'emp_shr_karan', name: 'Karan Dave', role: 'Photographer' },
          { id: 'emp_shr_meet', name: 'Meet Mehta', role: 'Cinematographer' }
        ],
        rawPhotos: 4800,
        editedPhotos: 900,
        videos: 4,
        reels: 12,
        albumsCount: 3,
        albumStatus: 'None',
        deliveryStatus: 'Pending'
      },
      {
        id: 'bkg_shr_027',
        bkgNum: 'SHR-BKG-2026-027',
        customerName: 'Bhavin Solanki',
        phone: '+91 98980 20027',
        city: 'Surat',
        address: 'Varachha, Surat',
        eventName: 'Solanki Solitaire Fine Jewelry Commercial Campaign',
        category: 'Product',
        date: '2026-08-15',
        venue: 'Shreeji Studio B, Surat High-End Bay',
        status: 'cancelled',
        quotedPrice: 70000,
        discount: 5000,
        discountReason: 'Seasonal campaign discount',
        paymentReceived: 0,
        paymentMethod: 'Bank Transfer',
        paymentRef: 'CANCELLED_NO_PAY',
        services: ['Macro Diamond Stills', '360 Jewelry Spin Video', 'Focus-Stacked High-End Retouching'],
        crew: [
          { id: 'emp_shr_rahul', name: 'Rahul Panchal', role: 'Commercial Photographer' },
          { id: 'emp_shr_priya', name: 'Priya Joshi', role: 'Retoucher' }
        ],
        rawPhotos: 0,
        editedPhotos: 0,
        videos: 0,
        reels: 0,
        albumsCount: 0,
        albumStatus: 'None',
        deliveryStatus: 'Pending'
      }
    ];
  }

  // Idempotent Seeding function
  static seedAllSampleBookings(force = false, targetStudioId?: string): ShreejiSeedSummary {
    const studioId = targetStudioId || this.TARGET_STUDIO;

    // Check if already seeded and not forced
    const isAlreadySeeded = TenantStore.getSingle(studioId, this.SEED_FLAG_KEY);
    if (isAlreadySeeded && !force) {
      return this.computeSummary(studioId);
    }

    const sampleData = this.getSampleBookingsData();
    const demoEmployees = this.getDemoEmployees(studioId);

    // 1. Employees: Merge without duplicating existing employees
    const existingEmployees = TenantStore.get<Employee>(studioId, 'employees') || [];
    demoEmployees.forEach(de => {
      const idx = existingEmployees.findIndex(e => e.id === de.id);
      if (idx >= 0) {
        existingEmployees[idx] = de;
      } else {
        existingEmployees.push(de);
      }
    });
    TenantStore.set(studioId, 'employees', existingEmployees);

    // 2. Customers
    const existingCustomers = TenantStore.get<Customer>(studioId, 'customers') || [];
    // 3. Events
    const existingEvents = TenantStore.get<StudioEvent>(studioId, 'events') || [];
    // 4. Bookings v2
    const existingBookings = TenantStore.get<BookingRecord>(studioId, 'studio_bookings_v2') || [];
    // 5. Quotations
    const existingQuotations = TenantStore.get<Quotation>(studioId, 'quotations') || [];
    // 6. Invoices
    const existingInvoices = TenantStore.get<Invoice>(studioId, 'invoices') || [];
    // 7. Payments
    const existingPayments = TenantStore.get<Payment>(studioId, 'payments') || [];

    // Filter out previously seeded demo items if force re-seeding
    const cleanCustomers = existingCustomers.filter(c => !(c as any).demoSeed);
    const cleanEvents = existingEvents.filter(e => !(e as any).demoSeed);
    const cleanBookings = existingBookings.filter(b => !(b as any).demoSeed);
    const cleanQuotations = existingQuotations.filter(q => !(q as any).demoSeed);
    const cleanInvoices = existingInvoices.filter(i => !(i as any).demoSeed);
    const cleanPayments = existingPayments.filter(p => !(p as any).demoSeed);

    sampleData.forEach((item, index) => {
      const customerId = `cust_shr_${String(index + 1).padStart(3, '0')}`;
      const eventId = `evt_shr_${String(index + 1).padStart(3, '0')}`;
      const quotationId = `qt_shr_${String(index + 1).padStart(3, '0')}`;
      const invoiceId = `inv_shr_${String(index + 1).padStart(3, '0')}`;
      const paymentId = `pay_shr_${String(index + 1).padStart(3, '0')}`;
      const finalAmount = Math.max(0, item.quotedPrice - item.discount);
      const remainingBalance = Math.max(0, finalAmount - item.paymentReceived);

      // Create Customer
      const newCustomer: Customer = {
        id: customerId,
        studioId,
        name: item.customerName,
        phone: item.phone,
        email: `${item.customerName.toLowerCase().replace(/[^a-z]/g, '')}@demo-shreeji.in`,
        city: item.city,
        address: item.address,
        company: item.category === 'Corporate' ? `${item.customerName} Enterprises` : undefined,
        status: (item.status === 'completed' || item.status === 'fully_delivered' ? 'completed' : 'active') as any,
        totalBookings: 1,
        totalRevenue: item.paymentReceived,
        totalQuotedValue: item.quotedPrice,
        pendingBalance: remainingBalance,
        lastInteractionDate: item.date,
        createdAt: '2026-01-10T10:00:00Z',
        updatedAt: '2026-01-15T12:00:00Z',
        demoSeed: true
      } as any;
      cleanCustomers.push(newCustomer);

      // Create StudioEvent
      const newEvent: StudioEvent = {
        id: eventId,
        studioId,
        eventNumber: `SHR-EV-${String(index + 1).padStart(4, '0')}`,
        title: item.eventName,
        customerId,
        customerName: item.customerName,
        customerPhone: item.phone,
        category: item.category as any,
        eventCategory: item.category,
        date: item.date,
        startDate: item.date,
        endDate: item.date,
        venue: item.venue,
        location: `${item.venue}, ${item.city}`,
        city: item.city,
        status: (item.status === 'completed' || item.status === 'fully_delivered' ? 'Completed' : item.status === 'cancelled' ? 'Cancelled' : 'Confirmed') as any,
        quotationAmount: item.quotedPrice,
        negotiatedDiscount: item.discount,
        negotiationReason: item.discountReason,
        agreedAmount: finalAmount,
        totalAmount: finalAmount,
        advanceAmount: item.paymentReceived,
        paymentStatus: item.paymentReceived >= finalAmount ? 'paid' : item.paymentReceived > 0 ? 'partial' : 'pending',
        assignedCrew: item.crew.map(c => ({
          employeeId: c.id,
          employeeName: c.name,
          role: c.role
        })),
        deliverables: item.services,
        deliverablesConfig: {
          albumRequired: item.albumsCount > 0,
          albumsCount: item.albumsCount,
          totalDigitalPhotographs: item.editedPhotos,
          deliveryMethod: 'Cloud Gallery & USB Drive',
          packageType: 'custom',
          selectedServices: item.services,
          customDeliverables: item.services,
          editedPhotosRequired: item.editedPhotos > 0,
          rawPhotosRequired: item.rawPhotos > 0,
          videoRequired: item.videos > 0,
          cinematicHighlightRequired: item.videos > 0,
          parentAlbumRequired: item.albumsCount > 1
        },
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-01-20T12:00:00Z',
        demoSeed: true
      } as any;
      cleanEvents.push(newEvent);

      // Create Deliverables Specification
      const deliverablesList: DeliverableSpecification[] = item.services.map((svc, sIdx) => ({
        id: `del_${item.id}_${sIdx + 1}`,
        bookingId: item.id,
        name: svc,
        category: svc.toLowerCase().includes('video') || svc.toLowerCase().includes('reel') ? 'video' : svc.toLowerCase().includes('album') ? 'physical' : 'photography',
        requiredQty: svc.includes('Album') ? item.albumsCount : svc.includes('Reel') ? item.reels : svc.includes('Video') ? item.videos : 1,
        completedQty: item.deliveryStatus === 'Delivered' ? (svc.includes('Album') ? item.albumsCount : 1) : item.deliveryStatus === 'Partially Delivered' ? 1 : 0,
        unit: svc.includes('Album') ? 'albums' : svc.includes('Reel') ? 'reels' : svc.includes('Video') ? 'videos' : 'photos',
        photoCount: svc.toLowerCase().includes('photo') ? item.editedPhotos : undefined,
        videoCount: svc.toLowerCase().includes('video') ? item.videos : undefined,
        deliveryMethod: svc.includes('Album') ? 'Physical Album' : 'Online Gallery',
        deadlineType: 'relative_to_shoot',
        deadlineDays: 30,
        calculatedDeadline: '2026-08-30',
        stage: item.deliveryStatus === 'Delivered' ? 'delivered' : item.deliveryStatus === 'Partially Delivered' ? 'ready_for_delivery' : 'editing',
        priority: 'normal',
        isDelivered: item.deliveryStatus === 'Delivered',
        deliveredDate: item.deliveryStatus === 'Delivered' ? '2026-04-10' : undefined
      }));

      // Create BookingRecord v2
      const newBooking: BookingRecord = {
        id: item.id,
        studioId,
        bookingNumber: item.bkgNum,
        status: item.status,
        customerId,
        customerName: item.customerName,
        customerPhone: item.phone,
        customerWhatsApp: item.phone,
        customerEmail: `${item.customerName.toLowerCase().replace(/[^a-z]/g, '')}@demo-shreeji.in`,
        customerAddress: item.address,
        eventName: item.eventName,
        category: item.category,
        eventCategory: item.category,
        mainEventDate: item.date,
        startDate: item.date,
        venue: item.venue,
        city: item.city,
        numberOfDays: 1,
        numberOfFunctions: 1,
        functions: [
          {
            id: `fn_${item.id}_01`,
            bookingId: item.id,
            name: `${item.category} Main Ceremony`,
            category: item.category,
            date: item.date,
            startTime: '10:00 AM',
            endTime: '08:00 PM',
            venue: item.venue,
            city: item.city,
            assignedPhotographerIds: item.crew.map(c => c.id),
            assignedVideographerIds: [],
            assignedDroneOperatorIds: [],
            assignedEditorIds: [],
            assignedSupplierIds: [],
            assignedCrew: item.crew.map(c => ({
              employeeId: c.id,
              employeeName: c.name,
              role: c.role,
              contact: '+91 98980 11000'
            }))
          }
        ],
        deliverables: deliverablesList,
        financials: {
          originalQuotation: item.quotedPrice,
          negotiatedDiscount: item.discount,
          finalAgreedAmount: finalAmount,
          verifiedPaymentsReceived: item.paymentReceived,
          remainingBalance,
          advanceRequired: Math.round(finalAmount * 0.4),
          advanceReceived: item.paymentReceived,
          advanceReceivedDate: item.paymentReceived > 0 ? item.date : undefined,
          isAdvanceConfirmed: item.paymentReceived > 0,
          paymentMilestones: [
            {
              id: `ms_${item.id}_01`,
              title: 'Booking Advance (40%)',
              percentage: 40,
              amount: Math.round(finalAmount * 0.4),
              dueDate: item.date,
              status: item.paymentReceived >= Math.round(finalAmount * 0.4) ? 'paid' : item.paymentReceived > 0 ? 'partially_paid' : 'pending',
              paidAmount: Math.min(item.paymentReceived, Math.round(finalAmount * 0.4))
            },
            {
              id: `ms_${item.id}_02`,
              title: 'Event Day Payment (40%)',
              percentage: 40,
              amount: Math.round(finalAmount * 0.4),
              dueDate: item.date,
              status: item.paymentReceived >= Math.round(finalAmount * 0.8) ? 'paid' : 'pending',
              paidAmount: Math.max(0, item.paymentReceived - Math.round(finalAmount * 0.4))
            },
            {
              id: `ms_${item.id}_03`,
              title: 'Final Delivery Settlement (20%)',
              percentage: 20,
              amount: finalAmount - (Math.round(finalAmount * 0.4) * 2),
              dueDate: '2026-08-30',
              status: item.paymentReceived >= finalAmount ? 'paid' : 'pending',
              paidAmount: Math.max(0, item.paymentReceived - (Math.round(finalAmount * 0.4) * 2))
            }
          ]
        },
        billingVersions: [
          {
            id: `bv_${item.id}_01`,
            bookingId: item.id,
            versionNumber: 1,
            originalQuotedAmount: item.quotedPrice,
            negotiatedDiscount: item.discount,
            deliverablesAdjustment: 0,
            finalAgreedAmount: finalAmount,
            negotiationReason: item.discountReason,
            approvedBy: 'Aarav Patel (Studio Owner)',
            dateOfChange: '2026-01-20T10:00:00Z',
            notes: item.discountReason
          }
        ],
        notes: {
          clientPreferences: 'Prefers candid natural tone without heavy orange tinting.',
          internalProductionNotes: 'Ensure battery backup for drone and dual card slot recording.'
        },
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-01-25T14:30:00Z',
        createdBy: 'usr_owner_royal',
        demoSeed: true
      } as any;
      cleanBookings.push(newBooking);

      // Create Quotation
      const newQuotation: Quotation = {
        id: quotationId,
        studioId,
        quotationNumber: `SHR-QT-2026-${String(index + 1).padStart(3, '0')}`,
        customerId,
        customerName: item.customerName,
        customerEmail: `${item.customerName.toLowerCase().replace(/[^a-z]/g, '')}@demo-shreeji.in`,
        customerPhone: item.phone,
        status: (item.status === 'cancelled' ? 'Rejected' : item.status === 'quotation_sent' ? 'Sent' : item.status === 'negotiation' ? 'Sent' : 'Accepted') as any,
        subtotal: item.quotedPrice,
        taxAmount: 0,
        totalAmount: item.quotedPrice,
        notes: `Initial proposal for ${item.eventName}. Concession reason: ${item.discountReason}.`,
        terms: '1. 40% advance required to block dates.\n2. Raw data archived for 90 days.\n3. Canvera album printing takes 15 business days.',
        validUntil: '2026-09-30',
        items: item.services.map((svc, iIdx) => ({
          id: `item_${quotationId}_${iIdx + 1}`,
          description: svc,
          quantity: 1,
          unitPrice: Math.round(item.quotedPrice / item.services.length),
          totalPrice: Math.round(item.quotedPrice / item.services.length)
        })),
        createdAt: '2026-01-16T11:00:00Z',
        updatedAt: '2026-01-18T16:00:00Z',
        demoSeed: true
      } as any;
      cleanQuotations.push(newQuotation);

      // Create Invoice if confirmed or has payments
      if (item.status !== 'cancelled' && item.status !== 'quotation_sent') {
        const newInvoice: Invoice = {
          id: invoiceId,
          studioId,
          invoiceNumber: `SHR-INV-2026-${String(index + 1).padStart(3, '0')}`,
          invoiceType: 'Standard Tax Invoice' as any,
          customerId,
          customerName: item.customerName,
          customerEmail: `${item.customerName.toLowerCase().replace(/[^a-z]/g, '')}@demo-shreeji.in`,
          customerPhone: item.phone,
          customerAddress: `${item.address}, ${item.city}, Gujarat`,
          status: (item.paymentReceived >= finalAmount ? 'paid' : item.paymentReceived > 0 ? 'partially_paid' : 'sent') as any,
          issuedAt: item.date,
          dueDate: '2026-08-30',
          subtotal: finalAmount,
          taxRate: 0,
          taxAmount: 0,
          totalAmount: finalAmount,
          paidAmount: item.paymentReceived,
          balanceAmount: remainingBalance,
          items: item.services.map((svc, sIdx) => ({
            id: `inv_item_${invoiceId}_${sIdx + 1}`,
            description: svc,
            quantity: 1,
            unitPrice: Math.round(finalAmount / item.services.length),
            totalPrice: Math.round(finalAmount / item.services.length)
          })),
          notes: `Agreed final amount: ₹${finalAmount.toLocaleString('en-IN')}. Negotiated discount applied: ₹${item.discount.toLocaleString('en-IN')}.`,
          termsAndConditions: 'Payment via UPI/Bank Transfer. Bank: Axis Bank, Bodakdev Branch, A/C: 923020011223344, IFSC: UTIB0001234.',
          createdAt: '2026-01-20T10:00:00Z',
          updatedAt: '2026-01-25T14:00:00Z',
          demoSeed: true
        } as any;
        cleanInvoices.push(newInvoice);
      }

      // Create Payment if money was received
      if (item.paymentReceived > 0) {
        const newPayment: Payment = {
          id: paymentId,
          studioId,
          paymentNumber: `SHR-PAY-2026-${String(index + 1).padStart(3, '0')}`,
          receiptNumber: `SHR-REC-2026-${String(index + 1).padStart(3, '0')}`,
          invoiceId,
          invoiceNumber: `SHR-INV-2026-${String(index + 1).padStart(3, '0')}`,
          customerId,
          customerName: item.customerName,
          amount: item.paymentReceived,
          currency: 'INR',
          paymentDate: item.date,
          paymentMethod: item.paymentMethod.toLowerCase().replace(' ', '_') as any,
          transactionReference: item.paymentRef,
          status: 'success',
          verifiedBy: 'Aarav Patel',
          notes: `Verified payment for ${item.eventName}. Ref: ${item.paymentRef}`,
          createdAt: item.date + 'T14:00:00Z',
          updatedAt: item.date + 'T14:30:00Z',
          demoSeed: true
        } as any;
        cleanPayments.push(newPayment);
      }
    });

    // Write all to TenantStore
    TenantStore.set(studioId, 'customers', cleanCustomers);
    TenantStore.set(studioId, 'events', cleanEvents);
    TenantStore.set(studioId, 'studio_bookings_v2', cleanBookings);
    TenantStore.set(studioId, 'quotations', cleanQuotations);
    TenantStore.set(studioId, 'invoices', cleanInvoices);
    TenantStore.set(studioId, 'payments', cleanPayments);

    // Multi-event sub-events & delivery tasks
    const subEvents = [
      ...getSubEventsDef('bkg_shr_001', studioId),
      ...getSubEventsDef('bkg_shr_024', studioId)
    ];
    TenantStore.set(studioId, 'subEvents', subEvents);

    const allTasks: any[] = [];
    sampleData.forEach((item: any) => {
      const generated = getTasksForBooking(item as any, studioId);
      allTasks.push(...generated);
    });
    TenantStore.set(studioId, 'tasks', allTasks);

    TenantStore.set(studioId, this.SEED_FLAG_KEY, true);

    return this.computeSummary(studioId);
  }

  // Safe unseed of only demo records
  static unseedDemoBookings(studioId: string = this.TARGET_STUDIO): void {
    const filterOutDemo = (col: string) => {
      const items = TenantStore.get<any>(studioId, col) || [];
      const kept = items.filter(i => !i.demoSeed);
      TenantStore.set(studioId, col, kept);
    };

    filterOutDemo('customers');
    filterOutDemo('events');
    filterOutDemo('subEvents');
    filterOutDemo('tasks');
    filterOutDemo('studio_bookings_v2');
    filterOutDemo('quotations');
    filterOutDemo('invoices');
    filterOutDemo('payments');
    filterOutDemo('employees');
    TenantStore.set(studioId, this.SEED_FLAG_KEY, null);
  }

  // Helper to compute summary
  static computeSummary(studioId: string = this.TARGET_STUDIO): ShreejiSeedSummary {
    const customers = TenantStore.get<Customer>(studioId, 'customers') || [];
    const bookings = TenantStore.get<BookingRecord>(studioId, 'studio_bookings_v2') || [];
    const quotations = TenantStore.get<Quotation>(studioId, 'quotations') || [];
    const invoices = TenantStore.get<Invoice>(studioId, 'invoices') || [];
    const payments = TenantStore.get<Payment>(studioId, 'payments') || [];
    const employees = TenantStore.get<Employee>(studioId, 'employees') || [];

    const demoBookings = bookings.filter(b => (b as any).demoSeed);
    let totalAgreedValue = 0;
    let totalNegotiatedDiscount = 0;
    demoBookings.forEach(b => {
      totalAgreedValue += b.financials?.finalAgreedAmount || 0;
      totalNegotiatedDiscount += b.financials?.negotiatedDiscount || 0;
    });

    let totalPaymentsReceived = 0;
    payments.filter(p => (p as any).demoSeed).forEach(p => {
      totalPaymentsReceived += p.amount || 0;
    });

    return {
      customersCount: customers.filter(c => (c as any).demoSeed).length,
      bookingsCount: demoBookings.length,
      quotationsCount: quotations.filter(q => (q as any).demoSeed).length,
      invoicesCount: invoices.filter(i => (i as any).demoSeed).length,
      paymentsCount: payments.filter(p => (p as any).demoSeed).length,
      employeesCount: employees.filter(e => (e as any).demoSeed).length,
      totalAgreedValue,
      totalPaymentsReceived,
      totalNegotiatedDiscount
    };
  }
}
