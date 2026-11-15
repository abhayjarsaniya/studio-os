import React, { useState, useEffect } from 'react';
import { 
  X, 
  MessageCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  Edit3, 
  Send, 
  User, 
  Phone,
  Calendar,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { 
  WHATSAPP_TEMPLATES, 
  WhatsAppTemplateId, 
  historyBookingsService 
} from '../../services/historyBookingsService';

interface WhatsAppChatModalProps {
  customerName: string;
  phone: string;
  bookingId?: string;
  eventName?: string;
  finalAmount?: number;
  amountReceived?: number;
  remainingBalance?: number;
  onClose: () => void;
}

export const WhatsAppChatModal: React.FC<WhatsAppChatModalProps> = ({
  customerName,
  phone,
  bookingId = 'SHR-BKG-2026-001',
  eventName = 'Grand Wedding Celebration',
  finalAmount = 150000,
  amountReceived = 80000,
  remainingBalance = 70000,
  onClose
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplateId>('booking_confirmation');
  const [messageText, setMessageText] = useState('');
  const [copied, setCopied] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState<'drafted' | 'opened' | 'confirmed_sent'>('drafted');

  // Regenerate message whenever template changes
  useEffect(() => {
    const res = historyBookingsService.generateWhatsAppMessage({
      templateId: selectedTemplate,
      customerName,
      studioName: 'Shreeji Studio',
      phone,
      bookingId,
      eventName,
      finalAmount,
      amountReceived,
      remainingBalance
    });
    setMessageText(res.message);
  }, [selectedTemplate, customerName, phone, bookingId, eventName, finalAmount, amountReceived, remainingBalance]);

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
    setTrackingStatus('opened');
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 bg-emerald-50/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 font-display">Customer WhatsApp Direct Chat</h3>
              <p className="text-xs text-zinc-600">Send pre-formatted instant message via WhatsApp Web / App</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Recipient Ribbon */}
        <div className="px-5 py-3 border-b border-zinc-200 bg-white flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-bold text-zinc-800">
              <User className="w-4 h-4 text-zinc-400" />
              {customerName}
            </span>
            <span className="text-zinc-300">•</span>
            <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              {phone}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs uppercase font-bold text-zinc-400">Status:</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${
              trackingStatus === 'confirmed_sent' 
                ? 'bg-emerald-100 text-emerald-800' 
                : trackingStatus === 'opened' 
                  ? 'bg-sky-100 text-sky-800' 
                  : 'bg-zinc-100 text-zinc-700'
            }`}>
              {trackingStatus.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Template Selector */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
              Select Message Template ({WHATSAPP_TEMPLATES.length} Options)
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value as WhatsAppTemplateId)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 bg-white text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer min-h-[44px]"
            >
              <optgroup label="Booking & Quotation">
                <option value="booking_confirmation">1. Booking Confirmation</option>
                <option value="quotation_summary">2. Quotation Summary</option>
                <option value="negotiated_price_confirmation">3. Negotiated Price Confirmation</option>
              </optgroup>
              <optgroup label="Finance & Invoicing">
                <option value="payment_received">4. Payment Received Receipt</option>
                <option value="outstanding_payment_reminder">5. Outstanding Balance Reminder</option>
                <option value="invoice_shared">6. Official Invoice Shared</option>
              </optgroup>
              <optgroup label="Production & Deliverables">
                <option value="photo_delivery_update">7. Overall Photo Delivery Update</option>
                <option value="raw_photos_delivered">8. Raw Photos Released</option>
                <option value="edited_photos_delivered">9. Edited High-Res Photos Ready</option>
                <option value="album_design_completed">10. Album Design Proofing Ready</option>
                <option value="album_ready_for_printing">11. Album Approved for Printing</option>
                <option value="album_dispatched">12. Physical Album Dispatched</option>
                <option value="final_delivery_completed">13. Final Complete Delivery Handover</option>
              </optgroup>
              <optgroup label="General & Feedback">
                <option value="thank_you_message">14. Thank You & Google Review</option>
                <option value="custom_message">15. Custom Studio Message</option>
              </optgroup>
            </select>
          </div>

          {/* Editable Live Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                Live Message Preview & Edit
              </label>
              <span className="text-xs text-zinc-400">
                You can edit text freely before opening WhatsApp
              </span>
            </div>
            <textarea
              rows={9}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full p-3.5 rounded-xl border border-zinc-300 bg-zinc-50/50 text-xs font-mono text-zinc-800 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all resize-y"
              placeholder="Type or customize your WhatsApp message..."
            />
          </div>

          {/* Compliance & API Notice */}
          <div className="p-3 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-500 leading-relaxed">
            <strong className="text-zinc-700">Studio OS Click-to-Chat Privacy Guarantee:</strong> Messages open securely through standard WhatsApp Web / Desktop protocol (<code className="text-emerald-700">wa.me</code>) without storing private chat history or bypassing user consent.
          </div>

        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer min-h-[44px]"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Message'}</span>
            </button>

            {trackingStatus === 'opened' && (
              <button
                onClick={() => setTrackingStatus('confirmed_sent')}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-zinc-100 border border-zinc-200 text-emerald-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer min-h-[44px]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark as Sent</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-zinc-600 hover:text-zinc-900 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[44px]"
            >
              Cancel
            </button>
            <button
              onClick={handleOpenWhatsApp}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer min-h-[44px]"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in WhatsApp</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
