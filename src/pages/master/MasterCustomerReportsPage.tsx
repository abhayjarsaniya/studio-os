import React, { useState, useMemo, useEffect } from 'react';
import { masterAdminService } from '../../services/masterAdminService';
import { platformEventsService } from '../../services/platformEventsService';
import { masterExportService, ExportColumn } from '../../services/masterExportService';
import { platformAuditService } from '../../services/platformAuditService';
import { TenantStore } from '../../services/tenantStore';
import { Customer, StudioEvent } from '../../types/schema';
import { 
  FileSpreadsheet, 
  Search, 
  Filter, 
  Download, 
  FileText, 
  Plus, 
  Calendar, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  Building2, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Edit3, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';

interface UnifiedRecord {
  id: string;
  studioId: string;
  studioName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  eventName: string;
  category: string;
  eventDate: string;
  venue: string;
  city: string;
  status: string;
  totalAmount: number;
}

export const MasterCustomerReportsPage: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudio, setSelectedStudio] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<UnifiedRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<UnifiedRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    studioId: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    eventName: '',
    category: 'Wedding',
    eventDate: new Date().toISOString().slice(0, 10),
    venue: '',
    city: 'Ahmedabad',
    status: 'deal_confirmed',
    totalAmount: 50000
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const studios = useMemo(() => {
    return masterAdminService.getAllStudios();
  }, [refreshKey]);

  // Load real records from TenantStore across all studios
  const allRecords = useMemo(() => {
    const list: UnifiedRecord[] = [];
    studios.forEach(st => {
      const customers = TenantStore.get<Customer>(st.id, 'customers') || [];
      const events = TenantStore.get<StudioEvent>(st.id, 'events') || [];

      events.forEach(evt => {
        const cust = customers.find(c => c.id === evt.customerId) || {
          name: evt.name || 'Valued Client',
          phone: '9876543210',
          email: ''
        };
        list.push({
          id: evt.id,
          studioId: st.id,
          studioName: st.name,
          customerName: cust.name,
          customerPhone: cust.phone || '',
          customerEmail: cust.email || '',
          eventName: evt.name,
          category: evt.category || 'Wedding',
          eventDate: evt.startDate || evt.createdAt?.slice(0, 10) || '2026-11-20',
          venue: evt.venue || 'Grand Palace Banquet',
          city: st.city || 'Gujarat',
          status: evt.status || 'deal_confirmed',
          totalAmount: Number(evt.totalAmount) || 65000
        });
      });
    });
    return list;
  }, [studios, refreshKey]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return allRecords.filter(r => {
      if (selectedStudio !== 'all' && r.studioId !== selectedStudio) return false;
      if (selectedCategory !== 'all' && r.category !== selectedCategory) return false;
      if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;
      if (dateFrom && r.eventDate < dateFrom) return false;
      if (dateTo && r.eventDate > dateTo) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          r.customerName.toLowerCase().includes(q) ||
          r.eventName.toLowerCase().includes(q) ||
          r.studioName.toLowerCase().includes(q) ||
          r.city.toLowerCase().includes(q) ||
          r.customerPhone.includes(q)
        );
      }
      return true;
    }).sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  }, [allRecords, selectedStudio, selectedCategory, selectedStatus, dateFrom, dateTo, searchTerm]);

  // Summary Metrics
  const summary = useMemo(() => {
    const totalShoots = filteredRecords.length;
    const totalValue = filteredRecords.reduce((sum, r) => sum + r.totalAmount, 0);
    const confirmedCount = filteredRecords.filter(r => ['deal_confirmed', 'advance_received', 'confirmed'].includes(r.status)).length;
    const completedCount = filteredRecords.filter(r => ['completed', 'fully_delivered'].includes(r.status)).length;
    return { totalShoots, totalValue, confirmedCount, completedCount };
  }, [filteredRecords]);

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const handleSaveRecord = () => {
    if (!formData.customerName.trim() || !formData.eventName.trim()) {
      alert('Please enter both customer name and event title.');
      return;
    }

    const targetStudioId = formData.studioId;
    const events = TenantStore.get<StudioEvent>(targetStudioId, 'events') || [];
    const customers = TenantStore.get<Customer>(targetStudioId, 'customers') || [];

    if (editingRecord) {
      // Update
      const updatedEvents = events.map(e => {
        if (e.id === editingRecord.id) {
          return {
            ...e,
            name: formData.eventName,
            category: formData.category as any,
            startDate: formData.eventDate,
            venue: formData.venue,
            status: formData.status as any,
            totalAmount: Number(formData.totalAmount)
          };
        }
        return e;
      });
      TenantStore.set(targetStudioId, 'events', updatedEvents);
      platformAuditService.logAction('Master Admin', 'UPDATE_EVENT_RECORD', 'event', editingRecord.id, `Updated event ${formData.eventName} in studio ${targetStudioId}`);
      showToast('Event and customer record updated successfully.');
    } else {
      // Create new customer and event
      const newCustId = `cust_${Date.now()}`;
      const newCust: Customer = {
        id: newCustId,
        studioId: targetStudioId,
        name: formData.customerName,
        phone: formData.customerPhone,
        email: formData.customerEmail,
        city: formData.city,
        createdAt: new Date().toISOString()
      };
      TenantStore.set(targetStudioId, 'customers', [newCust, ...customers]);

      const newEvent: StudioEvent = {
        id: `evt_m_${Date.now()}`,
        studioId: targetStudioId,
        eventNumber: `EVT-${Date.now().toString().slice(-6)}`,
        name: formData.eventName,
        customerId: newCustId,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        category: formData.category as any,
        startDate: formData.eventDate,
        startTime: '09:00',
        endDate: formData.eventDate,
        endTime: '22:00',
        venue: formData.venue,
        venueCity: formData.city,
        priority: 'High',
        status: (formData.status === 'completed' ? 'Completed' : 'Confirmed') as any,
        tasksCount: { total: 0, completed: 0 },
        totalAmount: Number(formData.totalAmount),
        paidAmount: formData.status === 'advance_received' ? Math.round(Number(formData.totalAmount) * 0.4) : 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'Master Admin'
      };
      TenantStore.set(targetStudioId, 'events', [newEvent, ...events]);
      platformAuditService.logAction('Master Admin', 'CREATE_EVENT_RECORD', 'event', newEvent.id, `Created new event ${formData.eventName} in studio ${targetStudioId}`);
      showToast('New platform booking record created successfully.');
    }

    setIsAddModalOpen(false);
    setEditingRecord(null);
    setRefreshKey(k => k + 1);
  };

  const handleDeleteRecord = () => {
    if (!deletingRecord) return;
    const events = TenantStore.get<StudioEvent>(deletingRecord.studioId, 'events') || [];
    const filtered = events.filter(e => e.id !== deletingRecord.id);
    TenantStore.set(deletingRecord.studioId, 'events', filtered);
    platformAuditService.logAction('Master Admin', 'DELETE_EVENT_RECORD', 'event', deletingRecord.id, `Deleted event ${deletingRecord.eventName} from studio ${deletingRecord.studioId}`);
    showToast(`Record ${deletingRecord.eventName} deleted.`);
    setDeletingRecord(null);
    setRefreshKey(k => k + 1);
  };

  const handleExport = (type: 'pdf' | 'excel') => {
    const exportColumns: ExportColumn[] = [
      { key: 'customerName', label: 'Customer Name' },
      { key: 'customerPhone', label: 'Phone' },
      { key: 'studioName', label: 'Studio Name' },
      { key: 'eventName', label: 'Event Title' },
      { key: 'category', label: 'Category' },
      { key: 'eventDate', label: 'Shoot Date' },
      { key: 'venue', label: 'Venue' },
      { key: 'city', label: 'City' },
      { key: 'status', label: 'Status' },
      { key: 'totalAmountFormatted', label: 'Total Value', align: 'right', format: 'currency' }
    ];

    const exportRows = filteredRecords.map(r => ({
      ...r,
      totalAmountFormatted: `₹${r.totalAmount.toLocaleString('en-IN')}`
    }));

    const options = {
      filename: 'Customer_Event_Reports',
      title: 'Global Customer & Event Management Audit',
      subtitle: `Aggregated audit across ${studios.length} registered studios`,
      filterSummary: `Studio: ${selectedStudio} | Category: ${selectedCategory} | Status: ${selectedStatus}`,
      columns: exportColumns,
      rows: exportRows,
      summaryMetrics: [
        { label: 'Total Shoots', value: summary.totalShoots },
        { label: 'Pipeline Value', value: `₹${summary.totalValue.toLocaleString('en-IN')}` },
        { label: 'Confirmed', value: summary.confirmedCount },
        { label: 'Completed', value: summary.completedCount }
      ],
      totals: {
        customerName: 'TOTALS',
        totalAmountFormatted: `₹${summary.totalValue.toLocaleString('en-IN')}`
      }
    };

    if (type === 'excel') {
      masterExportService.exportToExcel(options);
    } else {
      masterExportService.exportToPDF(options);
    }
  };

  return (
    <div className="space-y-6 pb-20 w-full font-sans">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-orange-500/30 text-xs">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-50 text-orange-800 border border-orange-200">
              Platform Governance
            </span>
            <span className="text-xs text-zinc-500 font-medium">{filteredRecords.length} Active Records</span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 font-display tracking-tight mt-1">
            Customer & Event Reports
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Cross-studio client directory, event scheduling timeline, and live booking audit.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleExport('excel')}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 text-xs font-bold flex items-center gap-2 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 text-xs font-bold flex items-center gap-2 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={() => {
              setEditingRecord(null);
              setFormData({
                studioId: studios[0]?.id || 'studio_shreeji_films',
                customerName: '',
                customerPhone: '',
                customerEmail: '',
                eventName: '',
                category: 'Wedding',
                eventDate: new Date().toISOString().slice(0, 10),
                venue: '',
                city: 'Ahmedabad',
                status: 'deal_confirmed',
                totalAmount: 50000
              });
              setIsAddModalOpen(true);
            }}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Booking Record</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Total Shoots</span>
          <div className="text-2xl font-black text-zinc-900 mt-1 font-display">{summary.totalShoots}</div>
          <span className="text-xs text-zinc-500 mt-0.5 block">Across all studios</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Total Value</span>
          <div className="text-2xl font-black text-zinc-900 mt-1 font-display">₹{(summary.totalValue / 100000).toFixed(1)}L</div>
          <span className="text-xs text-emerald-600 font-bold mt-0.5 block">Net booking pipeline</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Confirmed</span>
          <div className="text-2xl font-black text-emerald-600 mt-1 font-display">{summary.confirmedCount}</div>
          <span className="text-xs text-zinc-500 mt-0.5 block">In production / scheduled</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Completed</span>
          <div className="text-2xl font-black text-blue-600 mt-1 font-display">{summary.completedCount}</div>
          <span className="text-xs text-zinc-500 mt-0.5 block">Delivered & closed</span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by customer, event, studio, city, or phone..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:outline-none focus:bg-white focus:border-zinc-900 min-h-[40px]"
            />
          </div>

          <select
            value={selectedStudio}
            onChange={e => { setSelectedStudio(e.target.value); setCurrentPage(1); }}
            className="min-h-[40px] px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:bg-white"
          >
            <option value="all">All Studios ({studios.length})</option>
            {studios.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={e => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
            className="min-h-[40px] px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:bg-white"
          >
            <option value="all">All Categories</option>
            <option value="Wedding">Wedding</option>
            <option value="Pre-Wedding">Pre-Wedding</option>
            <option value="Engagement">Engagement</option>
            <option value="Reception">Reception</option>
            <option value="Corporate Event">Corporate Event</option>
            <option value="Family Photoshoot">Family Photoshoot</option>
          </select>

          <select
            value={selectedStatus}
            onChange={e => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
            className="min-h-[40px] px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="deal_confirmed">Confirmed</option>
            <option value="advance_received">Advance Paid</option>
            <option value="in_production">In Production</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="flex items-center gap-3 text-xs pt-1 border-t border-zinc-100 flex-wrap">
          <span className="font-bold text-zinc-500">Date Range:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }}
            className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs"
          />
          <span className="text-zinc-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }}
            className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs"
          />
          {(selectedStudio !== 'all' || selectedCategory !== 'all' || selectedStatus !== 'all' || dateFrom || dateTo || searchTerm) && (
            <button
              onClick={() => {
                setSelectedStudio('all');
                setSelectedCategory('all');
                setSelectedStatus('all');
                setDateFrom('');
                setDateTo('');
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="text-orange-600 font-bold hover:underline cursor-pointer ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Client / Contact</th>
                <th className="py-3 px-4">Studio</th>
                <th className="py-3 px-4">Event & Category</th>
                <th className="py-3 px-4">Date & Venue</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Agreed Value</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400 font-medium">
                    No customer or event records found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map(r => (
                  <tr key={r.id} className="hover:bg-orange-50/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-zinc-900">{r.customerName}</div>
                      <div className="text-zinc-500 text-xs flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-zinc-400" />
                        <span>{r.customerPhone || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-zinc-700">
                      <div className="truncate max-w-[150px]">{r.studioName}</div>
                      <div className="text-zinc-400 text-xs">{r.city}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-zinc-900 truncate max-w-[180px]">{r.eventName}</div>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
                        {r.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-zinc-900">{r.eventDate}</div>
                      <div className="text-zinc-500 text-xs truncate max-w-[150px] mt-0.5">{r.venue}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize border ${
                        r.status === 'completed' ? 'bg-zinc-100 text-zinc-700 border-zinc-200' :
                        r.status === 'deal_confirmed' || r.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-zinc-900">
                      ₹{r.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingRecord(r);
                            setFormData({
                              studioId: r.studioId,
                              customerName: r.customerName,
                              customerPhone: r.customerPhone,
                              customerEmail: r.customerEmail,
                              eventName: r.eventName,
                              category: r.category,
                              eventDate: r.eventDate,
                              venue: r.venue,
                              city: r.city,
                              status: r.status,
                              totalAmount: r.totalAmount
                            });
                            setIsAddModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 cursor-pointer"
                          title="Edit Record"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingRecord(r)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3.5 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
          <span>Showing page {currentPage} of {totalPages} ({filteredRecords.length} records)</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  {editingRecord ? 'Edit Customer & Event Record' : 'Add New Booking Record'}
                </h3>
                <p className="text-xs text-zinc-500">Persisted across studio workspace and master audits</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Target Studio</label>
                <select
                  value={formData.studioId}
                  disabled={Boolean(editingRecord)}
                  onChange={e => setFormData(d => ({ ...d, studioId: e.target.value }))}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold"
                >
                  {studios.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Customer Full Name</label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={e => setFormData(d => ({ ...d, customerName: e.target.value }))}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.customerPhone}
                    onChange={e => setFormData(d => ({ ...d, customerPhone: e.target.value }))}
                    placeholder="e.g. 9876543210"
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Event Title</label>
                <input
                  type="text"
                  value={formData.eventName}
                  onChange={e => setFormData(d => ({ ...d, eventName: e.target.value }))}
                  placeholder="e.g. Sharma Royal Wedding Ceremony"
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData(d => ({ ...d, category: e.target.value }))}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  >
                    <option value="Wedding">Wedding</option>
                    <option value="Pre-Wedding">Pre-Wedding</option>
                    <option value="Engagement">Engagement</option>
                    <option value="Reception">Reception</option>
                    <option value="Corporate Event">Corporate Event</option>
                    <option value="Family Photoshoot">Family Photoshoot</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Shoot Date</label>
                  <input
                    type="date"
                    value={formData.eventDate}
                    onChange={e => setFormData(d => ({ ...d, eventDate: e.target.value }))}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Venue Name</label>
                  <input
                    type="text"
                    value={formData.venue}
                    onChange={e => setFormData(d => ({ ...d, venue: e.target.value }))}
                    placeholder="e.g. YMCA International Club"
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Agreed Value (₹)</label>
                  <input
                    type="number"
                    value={formData.totalAmount}
                    onChange={e => setFormData(d => ({ ...d, totalAmount: Number(e.target.value) }))}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Booking Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData(d => ({ ...d, status: e.target.value }))}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                >
                  <option value="deal_confirmed">Confirmed</option>
                  <option value="advance_received">Advance Paid</option>
                  <option value="in_production">In Production</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRecord}
                className="px-5 py-2 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-xs cursor-pointer active:scale-95"
              >
                {editingRecord ? 'Save Changes' : 'Create Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-200">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">Delete Event Record</h3>
                <p className="text-xs text-zinc-500">This action will remove the event from studio storage</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-1">
              <div><strong>Event:</strong> {deletingRecord.eventName}</div>
              <div><strong>Client:</strong> {deletingRecord.customerName}</div>
              <div><strong>Studio:</strong> {deletingRecord.studioName}</div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeletingRecord(null)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRecord}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer active:scale-95"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
