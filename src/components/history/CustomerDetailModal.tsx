import React, { useState, useMemo } from 'react';
import { CustomerCompleteHistory, historyBookingsService } from '../../services/historyBookingsService';
import { 
  X, 
  User, 
  Phone, 
  MapPin, 
  Mail, 
  Calendar, 
  IndianRupee, 
  Camera, 
  Film, 
  BookOpen, 
  FileText, 
  CheckCircle2, 
  Clock, 
  MessageCircle, 
  Layers, 
  ChevronRight,
  TrendingDown,
  Building,
  Tag
} from 'lucide-react';

interface CustomerDetailModalProps {
  customerId: string;
  studioId: string;
  onClose: () => void;
  onOpenWhatsApp: (payload: {
    customerName: string;
    phone: string;
    bookingId?: string;
    eventName?: string;
    finalAmount?: number;
    amountReceived?: number;
    remainingBalance?: number;
  }) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customerId,
  studioId,
  onClose,
  onOpenWhatsApp
}) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'bookings' | 'quotations' | 'negotiations' | 'invoices' | 'payments' | 'deliverables'>('overview');

  const historyData: CustomerCompleteHistory | null = useMemo(() => {
    return historyBookingsService.getCustomerCompleteHistory(studioId, customerId);
  }, [studioId, customerId]);

  if (!historyData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-zinc-200 text-center">
          <p className="text-zinc-600 font-medium">Customer details not found.</p>
          <button 
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const { customer, bookings, events, quotations, invoices, payments, negotiationTimeline, photosSummary, videosSummary, albumsSummary, totalBilled, totalPaid, outstandingBalance } = historyData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="relative bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 bg-zinc-50/80 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
              {customer.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-zinc-900 truncate font-display">{customer.name}</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {bookings.length} {bookings.length === 1 ? 'Booking' : 'Bookings'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-600 mt-1">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  {customer.phone}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  {customer.city || 'Gujarat, India'}
                </span>
                {customer.email && (
                  <span className="flex items-center gap-1 truncate max-w-xs">
                    <Mail className="w-3.5 h-3.5 text-zinc-400" />
                    {customer.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onOpenWhatsApp({
                customerName: customer.name,
                phone: customer.phone,
                bookingId: bookings[0]?.bookingNumber,
                eventName: bookings[0]?.eventName,
                finalAmount: totalBilled,
                amountReceived: totalPaid,
                remainingBalance: outstandingBalance
              })}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp Chat</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Financial Quick Glance Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-zinc-100 border-b border-zinc-200 bg-white text-center py-3">
          <div className="px-3">
            <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Total Value</p>
            <p className="text-sm font-bold text-zinc-900 mt-0.5">₹{totalBilled.toLocaleString('en-IN')}</p>
          </div>
          <div className="px-3">
            <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Received</p>
            <p className="text-sm font-bold text-emerald-600 mt-0.5">₹{totalPaid.toLocaleString('en-IN')}</p>
          </div>
          <div className="px-3">
            <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Outstanding</p>
            <p className={`text-sm font-bold mt-0.5 ${outstandingBalance > 0 ? 'text-rose-600' : 'text-zinc-600'}`}>
              ₹{outstandingBalance.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="px-3">
            <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Deliverables</p>
            <p className="text-sm font-bold text-indigo-600 mt-0.5">
              {albumsSummary.deliveredAlbums}/{albumsSummary.totalAlbums} Albums
            </p>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex border-b border-zinc-200 px-4 gap-2 bg-zinc-50/50 overflow-x-auto text-xs font-bold text-zinc-600">
          <button
            onClick={() => setActiveSection('overview')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeSection === 'overview' ? 'border-zinc-900 text-zinc-900' : 'border-transparent hover:text-zinc-900'
            }`}
          >
            Full Journey Timeline
          </button>
          <button
            onClick={() => setActiveSection('bookings')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeSection === 'bookings' ? 'border-zinc-900 text-zinc-900' : 'border-transparent hover:text-zinc-900'
            }`}
          >
            Bookings ({bookings.length})
          </button>
          <button
            onClick={() => setActiveSection('negotiations')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeSection === 'negotiations' ? 'border-zinc-900 text-zinc-900' : 'border-transparent hover:text-zinc-900'
            }`}
          >
            Negotiations ({negotiationTimeline.length})
          </button>
          <button
            onClick={() => setActiveSection('quotations')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeSection === 'quotations' ? 'border-zinc-900 text-zinc-900' : 'border-transparent hover:text-zinc-900'
            }`}
          >
            Quotations ({quotations.length})
          </button>
          <button
            onClick={() => setActiveSection('invoices')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeSection === 'invoices' ? 'border-zinc-900 text-zinc-900' : 'border-transparent hover:text-zinc-900'
            }`}
          >
            Invoices ({invoices.length})
          </button>
          <button
            onClick={() => setActiveSection('payments')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeSection === 'payments' ? 'border-zinc-900 text-zinc-900' : 'border-transparent hover:text-zinc-900'
            }`}
          >
            Payments ({payments.length})
          </button>
          <button
            onClick={() => setActiveSection('deliverables')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeSection === 'deliverables' ? 'border-zinc-900 text-zinc-900' : 'border-transparent hover:text-zinc-900'
            }`}
          >
            Deliveries & Albums
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* 1. OVERVIEW & COMPLETE BOOKING TIMELINE */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Journey Stepper */}
              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/60">
                <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-3">Customer Relationship Lifecycle</h4>
                <div className="flex items-center justify-between text-center overflow-x-auto gap-2 pb-2">
                  {[
                    { label: 'Quotation', active: quotations.length > 0 },
                    { label: 'Negotiation', active: negotiationTimeline.length > 0 },
                    { label: 'Confirmation', active: bookings.some(b => b.status !== 'cancelled') },
                    { label: 'Event Shoot', active: events.length > 0 },
                    { label: 'Production', active: bookings.some(b => ['in_production', 'editing', 'partially_delivered', 'fully_delivered', 'completed'].includes(b.status)) },
                    { label: 'Editing', active: photosSummary.editedPhotosTotal > 0 },
                    { label: 'Delivery', active: albumsSummary.deliveredAlbums > 0 || photosSummary.deliveredPhotosTotal > 0 },
                    { label: 'Settlement', active: outstandingBalance === 0 && totalPaid > 0 }
                  ].map((step, idx) => (
                    <div key={idx} className="flex-1 min-w-[75px] flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        step.active ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-500'
                      }`}>
                        {step.active ? '✓' : idx + 1}
                      </div>
                      <span className={`text-[10px] mt-1.5 font-semibold ${step.active ? 'text-zinc-900 font-bold' : 'text-zinc-400'}`}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deliverables Overview Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-zinc-200 bg-white shadow-2xs">
                  <div className="flex items-center gap-2 text-indigo-600 mb-1">
                    <Camera className="w-4 h-4" />
                    <span className="text-xs font-bold">Stills & Photos</span>
                  </div>
                  <p className="text-xl font-bold text-zinc-900">{photosSummary.editedPhotosTotal.toLocaleString('en-IN')}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{photosSummary.rawPhotosTotal.toLocaleString('en-IN')} Raw Stills Backed Up</p>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-200 bg-white shadow-2xs">
                  <div className="flex items-center gap-2 text-rose-600 mb-1">
                    <Film className="w-4 h-4" />
                    <span className="text-xs font-bold">Cinema & Reels</span>
                  </div>
                  <p className="text-xl font-bold text-zinc-900">{videosSummary.totalVideos} Films / {videosSummary.totalReels} Reels</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{videosSummary.completedVideos} Video Edits Delivered</p>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-200 bg-white shadow-2xs">
                  <div className="flex items-center gap-2 text-amber-600 mb-1">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-xs font-bold">Luxury Albums</span>
                  </div>
                  <p className="text-xl font-bold text-zinc-900">{albumsSummary.deliveredAlbums} / {albumsSummary.totalAlbums}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Canvera Ultra-HD Print Spec</p>
                </div>
              </div>

              {/* Bookings List Summary */}
              <div>
                <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">Events & Bookings Summary</h4>
                <div className="space-y-2">
                  {bookings.map(b => (
                    <div key={b.id} className="p-3.5 rounded-xl border border-zinc-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-900">{b.eventName}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700">
                            {b.bookingNumber}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-2">
                          <span>{b.mainEventDate}</span>
                          <span>•</span>
                          <span>{b.venue}, {b.city}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <p className="text-xs font-bold text-zinc-900">₹{(b.financials?.finalAgreedAmount || 0).toLocaleString('en-IN')}</p>
                          <p className="text-[10px] text-emerald-600 font-medium">₹{(b.financials?.verifiedPaymentsReceived || 0).toLocaleString('en-IN')} Paid</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full uppercase bg-zinc-900 text-white">
                          {b.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. BOOKINGS SECTION */}
          {activeSection === 'bookings' && (
            <div className="space-y-4">
              {bookings.map(b => (
                <div key={b.id} className="p-4 rounded-xl border border-zinc-200 bg-white space-y-3 shadow-2xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900">{b.eventName}</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">{b.bookingNumber} • Category: {b.category}</p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-800 uppercase">
                      {b.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-zinc-100 text-xs">
                    <div>
                      <span className="text-zinc-400 block text-[10px] uppercase font-bold">Date</span>
                      <span className="font-semibold text-zinc-800">{b.mainEventDate}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[10px] uppercase font-bold">Venue</span>
                      <span className="font-semibold text-zinc-800 truncate block">{b.venue}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[10px] uppercase font-bold">Agreed Value</span>
                      <span className="font-bold text-zinc-900">₹{(b.financials?.finalAgreedAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[10px] uppercase font-bold">Balance</span>
                      <span className="font-bold text-rose-600">₹{(b.financials?.remainingBalance || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Assigned Crew */}
                  {b.functions?.[0]?.assignedCrew && b.functions[0].assignedCrew.length > 0 && (
                    <div className="pt-2 border-t border-zinc-100">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Assigned Photography Crew</span>
                      <div className="flex flex-wrap gap-2">
                        {b.functions[0].assignedCrew.map((c, i) => (
                          <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-800 flex items-center gap-1.5">
                            <User className="w-3 h-3 text-zinc-400" />
                            <strong>{c.employeeName}</strong> ({c.role})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 3. NEGOTIATIONS SECTION */}
          {activeSection === 'negotiations' && (
            <div className="space-y-3">
              {negotiationTimeline.length === 0 ? (
                <p className="text-xs text-zinc-500 py-4 text-center">No negotiation discounts recorded for this customer.</p>
              ) : (
                negotiationTimeline.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-zinc-200 bg-white space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-zinc-900">{item.eventName} ({item.bookingNumber})</h4>
                      <span className="text-[11px] text-zinc-500">{item.date}</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg text-xs font-semibold">
                      <div className="text-zinc-500">
                        Quoted: <span className="line-through text-zinc-400">₹{item.originalPrice.toLocaleString('en-IN')}</span>
                      </div>
                      <span className="text-zinc-300">→</span>
                      <div className="text-rose-600 font-bold">
                        Discount: -₹{item.discount.toLocaleString('en-IN')} ({Math.round((item.discount / item.originalPrice) * 100)}%)
                      </div>
                      <span className="text-zinc-300">→</span>
                      <div className="text-emerald-700 font-bold">
                        Final: ₹{item.finalPrice.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <p className="text-xs text-zinc-600 italic">
                      <span className="font-bold not-italic text-zinc-500">Reason / Concession:</span> "{item.reason}"
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 4. QUOTATIONS SECTION */}
          {activeSection === 'quotations' && (
            <div className="space-y-3">
              {quotations.map(q => (
                <div key={q.id} className="p-4 rounded-xl border border-zinc-200 bg-white flex items-center justify-between gap-4 shadow-2xs">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900">{q.quotationNumber}</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">{q.items?.length || 0} line items • Valid until {q.validUntil}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-zinc-900">₹{q.totalAmount.toLocaleString('en-IN')}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {q.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 5. INVOICES SECTION */}
          {activeSection === 'invoices' && (
            <div className="space-y-3">
              {invoices.map(inv => (
                <div key={inv.id} className="p-4 rounded-xl border border-zinc-200 bg-white flex items-center justify-between gap-4 shadow-2xs">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900">{inv.invoiceNumber}</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">Issued: {inv.issuedAt || (inv as any).issueDate} • Due: {inv.dueDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-zinc-900">₹{inv.totalAmount.toLocaleString('en-IN')}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-zinc-100 text-zinc-800">
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 6. PAYMENTS SECTION */}
          {activeSection === 'payments' && (
            <div className="space-y-3">
              {payments.map(p => (
                <div key={p.id} className="p-4 rounded-xl border border-zinc-200 bg-white flex items-center justify-between gap-4 shadow-2xs">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900">Payment: ₹{p.amount.toLocaleString('en-IN')}</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">Method: {p.paymentMethod} • Ref: {p.transactionReference || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-zinc-600">{p.paymentDate}</p>
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 justify-end">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 7. DELIVERABLES SECTION */}
          {activeSection === 'deliverables' && (
            <div className="space-y-2">
              {historyData.deliverables.map(del => (
                <div key={del.id} className="p-3 rounded-xl border border-zinc-200 bg-white flex items-center justify-between text-xs shadow-2xs">
                  <div>
                    <span className="font-bold text-zinc-900">{del.name}</span>
                    <p className="text-[11px] text-zinc-500">{del.deliveryMethod} • Target: {del.calculatedDeadline}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                    del.isDelivered ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {del.stage.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50/80 flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            Customer ID: <code className="bg-zinc-200/80 px-1.5 py-0.5 rounded text-[11px]">{customer.id}</code>
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Close Details
          </button>
        </div>

      </div>
    </div>
  );
};
