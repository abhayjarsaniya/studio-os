import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useStudio } from '../context/StudioContext';
import { quotationService } from '../services/quotationService';
import { whatsappService } from '../services/whatsappService';
import { pdfGeneratorService } from '../services/pdfGeneratorService';
import { Quotation, QuotationStatus } from '../types/schema';
import { 
  FileText, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Share2, 
  Copy, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink,
  Eye,
  Trash2,
  Calendar,
  User,
  ArrowRight
} from 'lucide-react';

export const QuotationsListPage: React.FC = () => {
  const { setActiveTab, openPdfViewer } = useApp();
  const { currentStudio, refreshStudioData } = useStudio();
  const studioId = currentStudio.id || 'studio_royal_001';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setDataVersion(v => v + 1);
    window.addEventListener('studio_data_updated', handleUpdate);
    return () => window.removeEventListener('studio_data_updated', handleUpdate);
  }, []);

  // Load all studio quotations
  const quotations = useMemo(() => {
    return quotationService.listQuotations(studioId);
  }, [studioId, successBanner, dataVersion]);

  // Filtered quotations
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      const matchesSearch = 
        q.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.eventName && q.eventName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (q.eventCategory && q.eventCategory.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quotations, searchQuery, statusFilter]);

  const handleDownloadPDF = (quotation: Quotation) => {
    try {
      const payload = pdfGeneratorService.createQuotationPayload(quotation, {
        name: currentStudio.name,
        address: currentStudio.address,
        city: currentStudio.city,
        state: (currentStudio as any).state || 'Gujarat',
        pincode: (currentStudio as any).pincode,
        gstin: currentStudio.gstNumber,
        supportPhone: currentStudio.phone,
        supportEmail: currentStudio.email
      });
      pdfGeneratorService.downloadDocumentPDF(payload);
    } catch (e: any) {
      alert('Unable to generate PDF document: ' + (e.message || 'Unknown error'));
    }
  };

  const handlePreviewPDF = (quotation: Quotation) => {
    try {
      const payload = pdfGeneratorService.createQuotationPayload(quotation, {
        name: currentStudio.name,
        address: currentStudio.address,
        city: currentStudio.city,
        state: (currentStudio as any).state || 'Gujarat',
        pincode: (currentStudio as any).pincode,
        gstin: currentStudio.gstNumber,
        supportPhone: currentStudio.phone,
        supportEmail: currentStudio.email
      });
      openPdfViewer(payload);
    } catch (e: any) {
      alert('Unable to preview PDF document: ' + (e.message || 'Unknown error'));
    }
  };

  const handleShareWhatsApp = (quotation: Quotation) => {
    if ((currentStudio?.settings as any)?.allowDirectWhatsApp === false) {
      alert('WhatsApp Click-to-Chat has been administratively disabled for this studio by Platform Master Admin.');
      return;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const publicUrl = `${origin}${pathname}#/quote/${quotation.id}`;

    const defaultTemplate = whatsappService.getDefaultQuotationTemplate(studioId);
    const templateText = defaultTemplate?.body || 
      'Dear {customer_name}, here is the customized quotation for your *{event_name}* on *{event_date}* at {event_location}. Total amount: *₹{total_amount}*. Review proposal here: {quotation_link} - *{studio_name}*';

    const rendered = whatsappService.replacePlaceholders(templateText, {
      customer_name: quotation.customerName,
      studio_name: currentStudio.name || 'Studio OS',
      event_name: quotation.eventName || quotation.eventCategory,
      event_date: quotation.eventDate || 'Scheduled Date',
      event_location: quotation.eventVenue || quotation.venue || 'Venue',
      total_amount: quotation.grandTotal.toLocaleString('en-IN'),
      quotation_link: publicUrl
    });

    const clickToChat = whatsappService.generateClickToChatUrl(quotation.customerPhone || '9820112233', rendered.message);
    if (!clickToChat.isValid) {
      alert(clickToChat.error || 'Please verify the customer phone number.');
      return;
    }

    // Open WhatsApp Click-to-Chat in new tab for manual dispatch
    window.open(clickToChat.url, '_blank', 'noopener,noreferrer');
  };

  const handleDuplicate = (quotation: Quotation) => {
    try {
      const duplicated = quotationService.duplicateQuotation(studioId, quotation.id, 'Studio Owner');
      setSuccessBanner(`Duplicated quotation as ${duplicated.quotationNumber}`);
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (e: any) {
      alert(e.message || 'Error duplicating quotation');
    }
  };

  const handleConvertToBooking = (quotation: Quotation) => {
    try {
      const result = quotationService.convertQuotationToBooking(studioId, quotation.id, {
        eventName: quotation.eventName,
        eventDate: quotation.eventDate,
        venue: quotation.eventVenue,
        operatorId: 'Studio Owner'
      });
      setSuccessBanner(`Successfully converted ${quotation.quotationNumber} into Event "${result.event.name}" and created Tax Invoice!`);
      refreshStudioData?.();
      window.dispatchEvent(new Event('studio_data_updated'));
    } catch (e: any) {
      alert(e.message || 'Error converting quotation.');
    }
  };

  const handleDelete = (quotation: Quotation) => {
    if (!window.confirm(`Are you sure you want to delete quotation ${quotation.quotationNumber}?`)) return;
    try {
      quotationService.deleteQuotation(studioId, quotation.id, 'Studio Owner');
      setSuccessBanner(`Deleted quotation ${quotation.quotationNumber}`);
      setTimeout(() => setSuccessBanner(null), 3000);
    } catch (e: any) {
      alert(e.message || 'Unable to delete quotation');
    }
  };

  const getStatusBadge = (status: QuotationStatus) => {
    switch (status) {
      case 'Accepted':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Accepted</span>;
      case 'Converted to Booking':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">Converted to Booking</span>;
      case 'Sent':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">Sent</span>;
      case 'Viewed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Viewed</span>;
      case 'Rejected':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">Rejected</span>;
      case 'Expired':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">Expired</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-700 border border-zinc-300">Draft</span>;
    }
  };

  return (
    <div className="space-y-6 w-full pb-24 font-sans">
      
      {/* Header & Quick Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              Studio Proposals & Quotes
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 font-display mt-1">
            Quotations Manager
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage quotations, share instant WhatsApp links, download official PDFs, and convert accepted deals into confirmed bookings.
          </p>
        </div>

        {/* Prominent Quick Quotation Button */}
        <button
          onClick={() => setActiveTab('create-quotation')}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>+ Quick Quotation</span>
        </button>
      </div>

      {successBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-800 text-xs font-medium animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('bookings')}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-all"
            >
              View in Bookings Directory →
            </button>
            <button
              onClick={() => setSuccessBanner(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search quotation #, customer, event..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          {['all', 'Draft', 'Sent', 'Accepted', 'Converted to Booking', 'Expired'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
              }`}
            >
              {st === 'all' ? 'All Statuses' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-xs">
        {filteredQuotations.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 font-display">No Quotations Found</h3>
              <p className="text-xs text-zinc-500 mt-1">
                {searchQuery || statusFilter !== 'all' 
                  ? 'No quotations match the active search filters.' 
                  : 'Create your studio’s first quick quotation proposal in under 30 seconds.'}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('create-quotation')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Create Quick Quotation</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Quotation #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Event Details</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4">Dates & Validity</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredQuotations.map((q) => (
                  <tr key={q.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-zinc-900 block">{q.quotationNumber}</span>
                      <span className="text-xs text-zinc-500">{q.items.length} service(s)</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-zinc-900">{q.customerName}</p>
                      {q.customerPhone && <p className="text-xs text-zinc-500 font-mono">{q.customerPhone}</p>}
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-medium text-zinc-800">{q.eventName || q.eventCategory}</p>
                      <p className="text-xs text-zinc-500">{q.venue || q.eventVenue || 'On-site'}</p>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono">
                      <p className="font-bold text-zinc-900 text-xs sm:text-sm">₹{q.grandTotal.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-zinc-500">Adv: ₹{(q.advanceAmount || 0).toLocaleString('en-IN')}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="text-xs text-zinc-600">Created: {q.quotationDate || q.createdAt.split('T')[0]}</p>
                      {q.validUntil && <p className="text-xs text-zinc-500">Valid: {q.validUntil}</p>}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(q.status)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handlePreviewPDF(q)}
                          className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                          title="Preview Quotation"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDownloadPDF(q)}
                          className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleShareWhatsApp(q)}
                          className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Share on WhatsApp"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDuplicate(q)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
                          title="Duplicate Quotation"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        {q.status !== 'Converted to Booking' ? (
                          <button
                            onClick={() => handleConvertToBooking(q)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-all cursor-pointer"
                            title="1-Click Convert to Booking"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>Convert</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if ((q as any).convertedBookingId) {
                                window.location.hash = `#/app/bookings/${(q as any).convertedBookingId}`;
                              }
                              setActiveTab('bookings');
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition-all cursor-pointer"
                            title="Open in Booking Directory"
                          >
                            <CheckCircle2 className="w-3 h-3 text-purple-600" />
                            <span>Converted →</span>
                          </button>
                        )}

                        {q.status !== 'Converted to Booking' && (
                          <button
                            onClick={() => handleDelete(q)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
