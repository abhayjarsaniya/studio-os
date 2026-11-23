import React, { useState, useEffect } from 'react';
import { quotationService } from '../services/quotationService';
import { pdfGeneratorService } from '../services/pdfGeneratorService';
import { Quotation } from '../types/schema';
import { 
  FileText, 
  Download, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  MessageSquare,
  Sparkles,
  Building2,
  AlertCircle
} from 'lucide-react';

export const PublicQuotationPage: React.FC = () => {
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [studio, setStudio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAccepted, setIsAccepted] = useState(false);

  useEffect(() => {
    const hash = window.location.hash || '';
    // Expected formats: #/quote/:id or #/quotation/:id
    const parts = hash.split('/');
    const quoteId = parts[2] || '';

    if (quoteId) {
      const result = quotationService.getQuotationPublic(quoteId);
      if (result) {
        setQuotation(result.quotation);
        setStudio(result.studio);
        if (result.quotation.status === 'Accepted' || result.quotation.status === 'Converted to Booking') {
          setIsAccepted(true);
        }
      }
    }
    setLoading(false);
  }, []);

  const handleDownloadPDF = () => {
    if (!quotation) return;
    try {
      const payload = pdfGeneratorService.createQuotationPayload(quotation, {
        name: studio?.name || 'Studio OS Photography',
        address: studio?.address,
        city: studio?.city,
        state: studio?.state,
        pincode: studio?.pincode,
        gstin: studio?.gstNumber,
        supportPhone: studio?.phone,
        supportEmail: studio?.email
      });
      pdfGeneratorService.downloadDocumentPDF(payload);
    } catch (e: any) {
      alert('Unable to generate PDF document: ' + (e.message || 'Unknown error'));
    }
  };

  const handleContactWhatsApp = (messageType: 'accept' | 'query' = 'query') => {
    if (!quotation) return;
    const studioPhone = studio?.phone || '919876543210';
    const cleanPhone = studioPhone.replace(/\D/g, '');
    
    let text = '';
    if (messageType === 'accept') {
      text = `Hello ${studio?.name || 'Studio'}! I have reviewed quotation ${quotation.quotationNumber} for ${quotation.eventName || quotation.eventCategory} (₹${quotation.grandTotal.toLocaleString('en-IN')}) and would like to ACCEPT and confirm our booking! 🎉`;
    } else {
      text = `Hello ${studio?.name || 'Studio'}! Regarding quotation ${quotation.quotationNumber} for ${quotation.eventName || quotation.eventCategory}, I have a question:`;
    }

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleAcceptProposal = () => {
    if (!quotation) return;
    try {
      quotationService.updateStatus(quotation.studioId, quotation.id, 'Accepted', 'Public Customer');
      setQuotation(prev => prev ? { ...prev, status: 'Accepted' } : null);
      setIsAccepted(true);
      handleContactWhatsApp('accept');
    } catch {
      setIsAccepted(true);
      handleContactWhatsApp('accept');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-zinc-500 font-medium">Loading quotation proposal...</p>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-zinc-200 rounded-3xl p-8 text-center shadow-lg space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 font-display">Quotation Not Found</h2>
          <p className="text-xs text-zinc-500 leading-relaxed">
            The quotation link you accessed is either expired, invalid, or has been removed. Please reach out to the studio directly to request a refreshed estimate.
          </p>
        </div>
      </div>
    );
  }

  const isExpired = quotation.validUntil ? new Date(quotation.validUntil).getTime() < Date.now() : false;
  const remainingBalance = Math.max(0, quotation.grandTotal - (quotation.advanceAmount || 0));

  return (
    <div className="min-h-screen bg-zinc-100/70 py-8 px-4 sm:px-6 lg:px-8 font-sans selection:bg-zinc-900 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Floating / Sticky Action Bar on Mobile */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Official Estimate</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-800">
                  {quotation.quotationNumber}
                </span>
                {isAccepted ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Accepted
                  </span>
                ) : isExpired ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    Expired
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    Active Proposal
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Prepared by <span className="font-semibold text-zinc-800">{studio?.name || 'Studio OS'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleDownloadPDF}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-300 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-zinc-500" />
              <span>Download PDF</span>
            </button>

            {!isAccepted && (
              <button
                onClick={handleAcceptProposal}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Accept & Book</span>
              </button>
            )}

            <button
              onClick={() => handleContactWhatsApp('query')}
              className="inline-flex items-center justify-center p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all cursor-pointer"
              title="Chat on WhatsApp"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Quotation Sheet */}
        <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8">
          
          {/* Header & Studio Branding */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b border-zinc-100">
            <div>
              {studio?.logoUrl ? (
                <img 
                  src={studio.logoUrl} 
                  alt={studio.name} 
                  className="h-14 max-w-[200px] object-contain mb-3" 
                />
              ) : (
                <div className="flex items-center gap-2.5 text-zinc-900 font-display font-black text-xl mb-3 tracking-tight">
                  <Building2 className="w-6 h-6 text-amber-500" />
                  <span>{studio?.name || 'STUDIO OS'}</span>
                </div>
              )}
              <h1 className="text-xl font-bold text-zinc-900 font-display">{studio?.name || 'Creative Studios'}</h1>
              {studio?.tagline && <p className="text-xs text-zinc-500 mt-0.5">{studio.tagline}</p>}
              
              <div className="mt-3 space-y-1 text-xs text-zinc-500">
                {studio?.address && (
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>{studio.address}, {studio.city || ''} {studio.state || ''}</span>
                  </p>
                )}
                {studio?.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>{studio.phone}</span>
                  </p>
                )}
                {studio?.email && (
                  <p className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>{studio.email}</span>
                  </p>
                )}
                {studio?.gstNumber && (
                  <p className="text-xs font-semibold text-zinc-600">
                    GSTIN: {studio.gstNumber}
                  </p>
                )}
              </div>
            </div>

            {/* Quotation Metadata Card */}
            <div className="sm:text-right bg-zinc-50 p-4 rounded-2xl border border-zinc-100 w-full sm:w-auto sm:min-w-[220px]">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-600">Quotation No</span>
              <p className="text-lg font-bold text-zinc-900 font-display mt-0.5">{quotation.quotationNumber}</p>
              
              <div className="mt-3 pt-3 border-t border-zinc-200/60 space-y-1.5 text-xs">
                <div className="flex sm:justify-end gap-2 text-zinc-500">
                  <span>Issued Date:</span>
                  <span className="font-semibold text-zinc-800">{quotation.quotationDate || quotation.createdAt.split('T')[0]}</span>
                </div>
                {quotation.validUntil && (
                  <div className="flex sm:justify-end gap-2 text-zinc-500">
                    <span>Valid Until:</span>
                    <span className={`font-semibold ${isExpired ? 'text-rose-600' : 'text-zinc-800'}`}>
                      {quotation.validUntil}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Client & Event Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-50/60 p-5 rounded-2xl border border-zinc-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 block mb-2">Proposal For</span>
              <p className="text-base font-bold text-zinc-900">{quotation.customerName}</p>
              <div className="mt-2 space-y-1 text-xs text-zinc-600">
                {quotation.customerPhone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{quotation.customerPhone}</span>
                  </p>
                )}
                {quotation.customerEmail && (
                  <p className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{quotation.customerEmail}</span>
                  </p>
                )}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 block mb-2">Event & Shoot Details</span>
              <p className="text-base font-bold text-zinc-900">{quotation.eventName || quotation.eventCategory}</p>
              <div className="mt-2 space-y-1 text-xs text-zinc-600">
                <p className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Category: {quotation.eventCategory}</span>
                </p>
                {quotation.eventDate && (
                  <p className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Date: {quotation.eventDate}</span>
                  </p>
                )}
                {(quotation.venue || quotation.eventVenue) && (
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Venue: {quotation.venue || quotation.eventVenue}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Services Checklist / Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
                Services & Deliverables
              </h3>
              <span className="text-xs text-zinc-500 font-medium">{quotation.items.length} item(s) included</span>
            </div>

            <div className="border border-zinc-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Service & Inclusions</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4 text-right">Unit Price</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {quotation.items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-zinc-400">{idx + 1}</td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-zinc-900 text-xs sm:text-sm">{item.title || item.description}</p>
                        {item.title && item.description && item.title !== item.description && (
                          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{item.description}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-medium text-zinc-700">{item.quantity}</td>
                      <td className="py-3.5 px-4 text-right text-zinc-600 font-mono">₹{item.unitPrice.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-zinc-900 font-mono">
                        ₹{((item.totalPrice ?? item.amount ?? (item.quantity * item.unitPrice))).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Breakdown & Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-4 border-t border-zinc-100">
            <div className="w-full sm:w-1/2 space-y-3">
              {quotation.paymentTerms && (
                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                  <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider block mb-1">
                    Payment Schedule & Terms
                  </span>
                  <p className="text-xs text-zinc-600 leading-relaxed">{quotation.paymentTerms}</p>
                </div>
              )}

              {(quotation.notes || quotation.additionalNotes) && (
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block mb-1">
                    Special Notes
                  </span>
                  <p className="text-xs text-amber-900 leading-relaxed">{quotation.notes || quotation.additionalNotes}</p>
                </div>
              )}
            </div>

            <div className="w-full sm:w-80 bg-zinc-50 p-5 rounded-2xl border border-zinc-200/80 space-y-2.5 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal</span>
                <span className="font-mono font-medium">₹{quotation.subtotal.toLocaleString('en-IN')}</span>
              </div>

              {Boolean(quotation.discount) && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount</span>
                  <span className="font-mono">- ₹{Number(quotation.discount).toLocaleString('en-IN')}</span>
                </div>
              )}

              {Boolean(quotation.taxAmount) && (
                <div className="flex justify-between text-zinc-600">
                  <span>GST ({quotation.taxRate || 18}%)</span>
                  <span className="font-mono font-medium">₹{quotation.taxAmount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="pt-2.5 border-t border-zinc-200 flex justify-between items-center text-sm font-bold text-zinc-900">
                <span className="font-display">Total Investment</span>
                <span className="font-mono text-base text-zinc-900">
                  ₹{quotation.grandTotal.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="pt-2 border-t border-dashed border-zinc-200 space-y-1.5 text-xs text-zinc-500">
                <div className="flex justify-between font-semibold text-zinc-700">
                  <span>Booking Advance</span>
                  <span className="font-mono text-emerald-700">₹{(quotation.advanceAmount || Math.round(quotation.grandTotal * 0.5)).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Balance Due</span>
                  <span className="font-mono">₹{remainingBalance.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Callout */}
          <div className="pt-6 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verified Studio OS Quotation Document • Real-time Studio Confirmation</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPDF}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition-all cursor-pointer"
              >
                Download PDF
              </button>
              <button
                onClick={handleAcceptProposal}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Confirm via WhatsApp
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
