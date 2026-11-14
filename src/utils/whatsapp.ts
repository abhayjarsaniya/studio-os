// WhatsApp Native Click-to-Chat & Message Template Engine (Zero API / Zero Cost)
import { normalizePhoneNumber } from '../services/customerService';
import { whatsappService } from '../services/whatsappService';

export interface WhatsAppTemplateContext {
  customerName: string;
  studioName: string;
  eventName?: string;
  eventDate?: string;
  venue?: string;
  invoiceAmount?: number | string;
  pendingAmount?: number | string;
  invoiceLink?: string;
  customMessage?: string;
}

export type WhatsAppActionType = 
  | 'chat_direct' 
  | 'booking_reminder' 
  | 'event_reminder' 
  | 'payment_reminder' 
  | 'invoice_link' 
  | 'custom';

export function formatPhoneNumberForWhatsApp(phone: string): string {
  const norm = normalizePhoneNumber(phone);
  return norm.waMeFormat;
}

export function generateWhatsAppMessage(
  action: WhatsAppActionType, 
  ctx: WhatsAppTemplateContext
): string {
  const { customerName, studioName, eventName, eventDate, venue, pendingAmount, invoiceAmount, invoiceLink, customMessage } = ctx;

  switch (action) {
    case 'booking_reminder':
      return `Hello ${customerName}, greetings from *${studioName}*! 📸✨\n\nWe are following up regarding your upcoming booking for *${eventName || 'your photography session'}* scheduled for *${eventDate || 'the requested date'}*.\n\nPlease let us know if you would like us to finalize the dates and lock your calendar slots.\n\nWarm regards,\n*${studioName}*`;

    case 'event_reminder':
      return `Dear ${customerName},\n\nThis is a friendly reminder from *${studioName}* that your event *${eventName || 'Shoot'}* is coming up on *${eventDate || 'the scheduled date'}* at *${venue || 'your chosen venue'}*! 🎥🎬\n\nOur photography & cinematography crew is fully prepped. Feel free to reply here if there are any updates in timing or location.\n\nLooking forward to capturing your special moments!`;

    case 'payment_reminder':
      return `Dear ${customerName},\n\nGreetings from *${studioName}*! 🧾\n\nThis is a gentle reminder regarding the pending balance of *₹${pendingAmount || '0'}* for *${eventName || 'your event photography'}* (Total Bill: ₹${invoiceAmount || '0'}).\n\nKindly clear the remaining dues at your earliest convenience to assist our post-production and album dispatch schedule. Thank you!`;

    case 'invoice_link':
      return `Dear ${customerName},\n\nHere is your invoice link for *${eventName || 'your photography project'}* from *${studioName}*:\n🔗 ${invoiceLink || 'https://studio-os.preview/invoice/demo'}\n\nTotal Amount: ₹${invoiceAmount || '0'}\nPending: ₹${pendingAmount || '0'}\n\nPlease reach out if you have any questions.\n\nThank you for choosing *${studioName}*!`;

    case 'custom':
      return customMessage || `Hello ${customerName}, greetings from ${studioName}!`;

    case 'chat_direct':
    default:
      return `Hello ${customerName}, greetings from *${studioName}*! How can we assist you today?`;
  }
}

export function openWhatsAppChat(phone: string, text: string): void {
  const result = whatsappService.generateClickToChatUrl(phone, text);
  if (!result.isValid) {
    alert(result.error || 'Invalid phone number for WhatsApp.');
    return;
  }
  window.open(result.url, '_blank', 'noopener,noreferrer');
}
