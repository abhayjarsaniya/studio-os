import { 
  SHREEJI_EMPLOYEES_DEF, 
  SHREEJI_BOOKINGS_DEF, 
  getSubEventsDef, 
  getTasksForBooking, 
  ShreejiSeedService, 
  SEED_BATCH_ID, 
  CREATED_BY_SEED, 
  SEED_FLAG_KEY 
} from '../services/seedShreejiStudio';

export {
  SHREEJI_EMPLOYEES_DEF,
  SHREEJI_BOOKINGS_DEF,
  getSubEventsDef,
  getTasksForBooking,
  ShreejiSeedService,
  SEED_BATCH_ID,
  CREATED_BY_SEED,
  SEED_FLAG_KEY
};

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('seedShreejiStudio')) {
  console.log('--- Initializing Shreeji Studio Dataset ---');
  ShreejiSeedService.seedShreejiStudio(true, 'studio_shreeji_films')
    .then(summary => {
      console.log('Seed completed successfully!');
      console.log('Employees:', summary.totalEmployees);
      console.log('Bookings:', summary.totalBookings);
      console.log('Sub-events:', summary.totalSubEvents);
      console.log('Customers:', summary.totalCustomers);
      console.log('Quotations:', summary.totalQuotations);
      console.log('Invoices:', summary.totalInvoices);
      console.log('Payments:', summary.totalPayments);
      console.log('Tasks:', summary.totalTasks);
    })
    .catch(err => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
