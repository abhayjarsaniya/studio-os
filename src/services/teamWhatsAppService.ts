import { TenantStore } from './tenantStore';
import { StudioEvent, SubEvent, Employee } from '../types';
import { eventService } from './eventService';
import { subEventService } from './subEventService';
import { supplierService } from './supplierService';
import { privacyProtectionService } from './privacyProtectionService';

export class TeamWhatsAppService {
  /**
   * Generates a privacy-scrubbed daily shoot summary for crew members.
   * Excludes personal customer phones and financial figures.
   */
  generateDailyCrewSummary(studioId: string, date: string): string {
    const studio = TenantStore.getSingle<any>(studioId, 'profile');
    const studioName = studio?.name || 'Studio OS';

    const allSubs = subEventService.listSubEvents(studioId);
    const subEvents = allSubs.filter(s => s.date === date);
    const events = eventService.listEvents(studioId);
    const employees = TenantStore.get<Employee>(studioId, 'employees') || [];

    if (subEvents.length === 0) {
      return `📅 *DAILY CREW SCHEDULE - ${date}*\n🏢 *${studioName}*\n\nNo sub-events or shoots scheduled for this date.`;
    }

    let msg = `📸 *DAILY CREW & SHOOT SCHEDULE*\n`;
    msg += `📅 *Date:* ${date}\n`;
    msg += `🏢 *Studio:* ${studioName}\n`;
    msg += `Total Shoots: ${subEvents.length}\n`;
    msg += `═══════════════════════════════\n\n`;

    subEvents.forEach((se, idx) => {
      const parentEvent = events.find(e => e.id === se.parentEventId);
      const rawDigits = (parentEvent?.customerId || se.parentEventId).replace(/\D/g, '');
      const clientCode = rawDigits.length >= 3 ? rawDigits.slice(-3) : '001';

      msg += `🔹 *${idx + 1}. ${se.name.toUpperCase()}*\n`;
      msg += `📋 *Event:* ${parentEvent?.name || 'Main Event'}\n`;
      msg += `🏷️ *Ref:* Client #${clientCode}\n`;
      msg += `⏰ *Time:* ${se.startTime || 'TBD'} - ${se.endTime || 'TBD'}\n`;
      msg += `📍 *Venue:* ${se.venue || 'Studio / TBD'}\n`;
      if (se.address) {
        msg += `🗺️ *Address:* ${se.address}\n`;
      }

      // Assigned team members
      if (se.assignedMemberIds && se.assignedMemberIds.length > 0) {
        msg += `👥 *Assigned Crew:*\n`;
        se.assignedMemberIds.forEach(mId => {
          const emp = employees.find(e => e.id === mId);
          msg += `  • ${emp?.fullName || emp?.name || 'Crew Member'} (${emp?.designation || 'Photographer'})\n`;
        });
      }

      // External Suppliers
      const suppliers = supplierService.listAssignments(studioId, { subEventId: se.id });
      if (suppliers.length > 0) {
        msg += `🤝 *External Partners:*\n`;
        suppliers.forEach(sup => {
          msg += `  • ${sup.supplierName}: ${sup.supplierMemberName || sup.category} (Call: ${sup.callTime})\n`;
        });
      }

      msg += `\n───────────────────────────────\n\n`;
    });

    msg += `⚠️ *Note:* Please arrive 30 mins prior to call time in official studio attire. Batteries charged & cards cleared.`;

    return msg;
  }

  /**
   * Generates event-level crew summary across all sub-events of a main event.
   */
  generateEventCrewSummary(studioId: string, eventId: string): string {
    const event = eventService.getEvent(studioId, eventId);
    if (!event) throw new Error('Event not found');

    const studio = TenantStore.getSingle<any>(studioId, 'profile');
    const studioName = studio?.name || 'Studio OS';
    const subEvents = subEventService.listSubEvents(studioId, eventId);
    const employees = TenantStore.get<Employee>(studioId, 'employees') || [];

    const rawDigits = (event.customerId || event.id).replace(/\D/g, '');
    const clientCode = rawDigits.length >= 3 ? rawDigits.slice(-3) : '001';

    let msg = `🎬 *SHOOT CALL SHEET & CREW BRIEF*\n`;
    msg += `🏢 *${studioName}*\n`;
    msg += `🎯 *Event:* ${event.name}\n`;
    msg += `🏷️ *Reference:* Client #${clientCode}\n`;
    msg += `📅 *Dates:* ${event.totalStartDate || event.startDate} to ${event.totalEndDate || event.endDate}\n`;
    msg += `📍 *Main Venue:* ${event.overallVenue || event.venue || 'Various'}\n`;
    msg += `═══════════════════════════════\n\n`;

    if (subEvents.length === 0) {
      msg += `Single Day Shoot\nCall Time: ${event.totalStartDate || event.startDate} 08:00 AM\n`;
    } else {
      subEvents.forEach((se, idx) => {
        msg += `*${idx + 1}. ${se.name}* (${se.date})\n`;
        msg += `⏰ *Time:* ${se.startTime} - ${se.endTime}\n`;
        msg += `📍 *Venue:* ${se.venue}\n`;
        if (se.assignedMemberIds && se.assignedMemberIds.length > 0) {
          const names = se.assignedMemberIds.map(mId => {
            const emp = employees.find(e => e.id === mId);
            return emp?.fullName || emp?.name || 'Crew';
          }).join(', ');
          msg += `👥 *Crew:* ${names}\n`;
        }
        msg += `\n`;
      });
    }

    // External suppliers assigned to main event or sub-events
    const suppliers = supplierService.listAssignments(studioId, { eventId });
    if (suppliers.length > 0) {
      msg += `🤝 *External Suppliers & Specialized Gear:*\n`;
      suppliers.forEach(sup => {
        msg += `• ${sup.supplierName} (${sup.category}) - ${sup.subEventTitle || 'Event'} (Call: ${sup.callTime})\n`;
      });
      msg += `\n`;
    }

    msg += `📞 *Production Desk:* ${studio?.phone || '+91 98765 43210'}\n`;
    msg += `✨ Let's capture excellence!`;

    return msg;
  }

  /**
   * Generates a WhatsApp URL link for desktop/mobile click-to-chat.
   */
  createWhatsAppShareLink(phone: string, messageText: string): string {
    const cleanPhone = phone.replace(/\D/g, '');
    const encoded = encodeURIComponent(messageText);
    if (!cleanPhone) {
      return `https://wa.me/?text=${encoded}`;
    }
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  }
}

export const teamWhatsAppService = new TeamWhatsAppService();
