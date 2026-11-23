import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { MessageTemplate, WhatsAppLog } from '../../types';
import { whatsappService } from '../../services/whatsappService';
import { formatDate } from '../../utils/formatters';
import { 
  MessageCircle, 
  Send, 
  Copy, 
  Check, 
  AlertTriangle, 
  ExternalLink, 
  CheckCircle2, 
  X,
  FileText,
  Lock
} from 'lucide-react';

export const WhatsAppMessagePreviewModal: React.FC = () => {
  const { 
    isWhatsAppPreviewOpen, 
    setIsWhatsAppPreviewOpen, 
    whatsAppPreviewData,
    messageTemplates,
    studio,
    currentUser,
    logWhatsAppClick,
    confirmWhatsAppSent
  } = useApp();

  const customer = whatsAppPreviewData?.customer || null;
  const event = whatsAppPreviewData?.event || null;
  const lead = whatsAppPreviewData?.lead || null;

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [editableMessage, setEditableMessage] = useState<string>('');
  const [missingKeys, setMissingKeys] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [launchedLog, setLaunchedLog] = useState<WhatsAppLog | null>(null);

  const isWhatsAppDisabled = Boolean((studio as any)?.settings?.allowDirectWhatsApp === false);

  // Initialize or update template when modal opens
  useEffect(() => {
    if (!isWhatsAppPreviewOpen) {
      setLaunchedLog(null);
      setCopied(false);
      return;
    }

    const initialTemplate = whatsAppPreviewData?.templateId 
      ? messageTemplates.find(t => t.id === whatsAppPreviewData.templateId)
      : messageTemplates[0];

    if (initialTemplate) {
      setSelectedTemplateId(initialTemplate.id);
      applyTemplate(initialTemplate);
    } else if (whatsAppPreviewData?.prefilledMessage) {
      setEditableMessage(whatsAppPreviewData.prefilledMessage);
      setMissingKeys([]);
    }
  }, [isWhatsAppPreviewOpen, whatsAppPreviewData, messageTemplates]);

  const applyTemplate = (tmpl: MessageTemplate) => {
    const custName = customer?.name || lead?.customerName || 'Valued Client';
    const evtName = event?.name || (lead ? `${lead.customerName} ${lead.eventCategory}` : 'Photography Shoot');
    const evtCategory = event?.category || lead?.eventCategory || 'Wedding';
    const evtDate = event?.startDate ? formatDate(event.startDate) : (lead?.expectedDate || 'Upcoming');
    const evtVenue = event?.venue ? `${event.venue}, ${event.venueCity}` : 'Scheduled Venue';
    const pending = customer?.pendingBalance || 0;
    const advance = event?.advancePaid || 0;
    const total = event?.estimatedBudget || customer?.totalSpent || 0;
    const bookingId = event?.eventNumber || lead?.leadNumber || 'BK-101';
    const assignedEmp = event?.leadPhotographerId || currentUser?.name || 'Lead Photographer';

    const context = {
      customer_name: custName,
      studio_name: studio.name,
      studio_phone: studio.phone,
      event_name: evtName,
      event_category: evtCategory,
      event_date: evtDate,
      event_venue: evtVenue,
      booking_id: bookingId,
      quotation_amount: total,
      advance_amount: advance,
      pending_amount: pending,
      delivery_date: event?.endDate ? formatDate(event.endDate) : '15 days from shoot',
      assigned_employee: assignedEmp,
      custom_message: whatsAppPreviewData?.prefilledMessage || ''
    };

    const res = whatsappService.replacePlaceholders(tmpl.body, context);
    setEditableMessage(res.resultText);
    setMissingKeys(res.missingPlaceholders);
  };

  const handleTemplateChange = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    const tmpl = messageTemplates.find(t => t.id === tmplId);
    if (tmpl) {
      applyTemplate(tmpl);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editableMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const phone = customer?.phone || lead?.phone || '';
    const tmpl = messageTemplates.find(t => t.id === selectedTemplateId);

    const clickUrlResult = whatsappService.generateClickToChatUrl(phone, editableMessage);
    if (!clickUrlResult.isValid) {
      alert(clickUrlResult.error || 'Please enter a valid phone number.');
      return;
    }

    // Log Link Opened action
    const log = logWhatsAppClick({
      customerId: customer?.id || lead?.convertedCustomerId || 'lead_temp',
      customerName: customer?.name || lead?.customerName || 'Client',
      phone: clickUrlResult.waMeNumber,
      templateTitle: tmpl?.title || 'Custom',
      messageText: editableMessage,
      relatedEventId: event?.id,
      relatedLeadId: lead?.id
    });

    setLaunchedLog(log);

    // Open WhatsApp in new tab
    window.open(clickUrlResult.url, '_blank', 'noopener,noreferrer');
  };

  const handleMarkAsSent = () => {
    if (launchedLog) {
      confirmWhatsAppSent(launchedLog.id);
    }
    setIsWhatsAppPreviewOpen(false);
  };

  if (!isWhatsAppPreviewOpen) return null;

  const phone = customer?.phone || lead?.phone || '';
  const clientName = customer?.name || lead?.customerName || 'Client';

  return (
    <Modal
      isOpen={isWhatsAppPreviewOpen}
      onClose={() => setIsWhatsAppPreviewOpen(false)}
      title="WhatsApp Click-to-Chat Preview"
      subtitle={`Send to ${clientName} • ${phone}`}
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Recipient Details Card */}
        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-zinc-900">{clientName}</span>
            <span className="text-zinc-500 ml-2 font-mono">{phone}</span>
          </div>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded-full">
            Official wa.me Native Link
          </span>
        </div>

        {/* Template Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-zinc-500" />
            <span>Select Message Template (16 Available)</span>
          </label>
          <select
            value={selectedTemplateId}
            onChange={e => handleTemplateChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
          >
            {messageTemplates.map(t => (
              <option key={t.id} value={t.id}>
                [{t.category}] {t.title}
              </option>
            ))}
          </select>
        </div>

        {/* Missing Placeholders Warning */}
        {missingKeys.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unresolved Dynamic Placeholders Detected</p>
              <p className="text-xs text-amber-700 mt-0.5">
                The following placeholder variables had no value and should be filled manually before sending:{' '}
                <span className="font-mono font-bold">{missingKeys.map(k => `{{${k}}}`).join(', ')}</span>
              </p>
            </div>
          </div>
        )}

        {/* Editable Message Body */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-700">
              Message Preview & Custom Editor
            </label>
            <button
              onClick={handleCopy}
              className="text-xs text-zinc-600 hover:text-zinc-900 flex items-center gap-1 cursor-pointer font-medium"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-zinc-500" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>
          </div>

          <textarea
            value={editableMessage}
            onChange={e => setEditableMessage(e.target.value)}
            rows={7}
            className="w-full p-3 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 font-sans focus:outline-none focus:ring-2 focus:ring-zinc-900/10 leading-relaxed resize-y"
            placeholder="Type your WhatsApp message..."
          />
          <p className="text-xs text-zinc-400 italic">
            You can edit this message freely before opening WhatsApp. Studio OS will never send messages automatically.
          </p>
        </div>

        {/* Launched Log Confirmation Banner */}
        {launchedLog && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp Link Opened Successfully!</span>
            </div>
            <p className="text-xs text-emerald-800">
              Did you review and press <strong>Send</strong> in WhatsApp?
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleMarkAsSent}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Yes, Mark as Sent
              </button>
              <button
                onClick={() => setIsWhatsAppPreviewOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 font-semibold text-xs transition-colors cursor-pointer"
              >
                Keep Status as Opened
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsWhatsAppPreviewOpen(false)}
          >
            Close
          </Button>

          <Button
            variant="primary"
            size="sm"
            disabled={isWhatsAppDisabled}
            icon={<MessageCircle className="w-4 h-4 text-white" />}
            onClick={handleOpenWhatsApp}
            className={`text-white border-transparent ${
              isWhatsAppDisabled 
                ? 'bg-zinc-400 opacity-50 cursor-not-allowed' 
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            <span>Open WhatsApp Chat</span>
            <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-80" />
          </Button>
        </div>
      </div>
    </Modal>
  );
};
