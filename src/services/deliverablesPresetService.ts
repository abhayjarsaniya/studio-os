import { DeliverableSpecification, DeliverableCategory, DeliveryStage, DeliveryPriority } from '../types/bookingProduction';

export interface DeliverableTemplateItem {
  id: string;
  name: string;
  category: DeliverableCategory;
  offsetDays: number;
  priority: DeliveryPriority;
  unit: string;
  requiredQty: number;
}

// 1. STANDARD CATEGORY DELIVERABLE TEMPLATES (As explicitly requested)
export const DELIVERABLE_PRESETS: Record<string, DeliverableTemplateItem[]> = {
  Wedding: [
    { id: 'raw_backup', name: 'RAW photo backup verified', category: 'photography', offsetDays: 1, priority: 'urgent', unit: 'GB', requiredQty: 500 },
    { id: 'selection_gallery', name: 'Selection gallery sent', category: 'digital', offsetDays: 3, priority: 'high', unit: 'link', requiredQty: 1 },
    { id: 'customer_selection', name: 'Customer selection received', category: 'digital', offsetDays: 10, priority: 'normal', unit: 'selection', requiredQty: 1 },
    { id: 'edited_photos', name: 'Edited photos ready', category: 'photography', offsetDays: 20, priority: 'normal', unit: 'photos', requiredQty: 350 },
    { id: 'video_teaser', name: 'Video teaser delivered', category: 'video', offsetDays: 7, priority: 'high', unit: 'videos', requiredQty: 1 },
    { id: 'long_film', name: 'Long film delivered', category: 'video', offsetDays: 30, priority: 'normal', unit: 'videos', requiredQty: 1 },
    { id: 'album_design_approved', name: 'Album design approved', category: 'physical', offsetDays: 35, priority: 'normal', unit: 'approval', requiredQty: 1 },
    { id: 'album_sent_to_print', name: 'Album sent to print', category: 'physical', offsetDays: 40, priority: 'normal', unit: 'order', requiredQty: 1 },
    { id: 'album_delivered', name: 'Album delivered', category: 'physical', offsetDays: 50, priority: 'high', unit: 'albums', requiredQty: 2 }
  ],
  Birthday: [
    { id: 'photo_completed', name: 'Photography completed', category: 'photography', offsetDays: 0, priority: 'normal', unit: 'shoot', requiredQty: 1 },
    { id: 'raw_uploaded', name: 'RAW photos uploaded', category: 'digital', offsetDays: 1, priority: 'high', unit: 'photos', requiredQty: 500 },
    { id: 'edited_delivered', name: '100 edited photos delivered', category: 'photography', offsetDays: 5, priority: 'high', unit: 'photos', requiredQty: 100 },
    { id: 'gallery_shared', name: 'Online gallery shared', category: 'digital', offsetDays: 6, priority: 'normal', unit: 'link', requiredQty: 1 }
  ],
  'Pre-Wedding': [
    { id: 'photoshoot_completed', name: 'Photoshoot completed', category: 'photography', offsetDays: 0, priority: 'normal', unit: 'shoot', requiredQty: 1 },
    { id: 'edited_photos_ready', name: 'Edited photos ready', category: 'photography', offsetDays: 7, priority: 'high', unit: 'photos', requiredQty: 80 },
    { id: 'cinematic_video', name: 'Cinematic video completed', category: 'video', offsetDays: 12, priority: 'normal', unit: 'videos', requiredQty: 1 },
    { id: 'social_reels', name: 'Social media reels delivered', category: 'video', offsetDays: 5, priority: 'urgent', unit: 'reels', requiredQty: 3 }
  ],
  'Product Photography': [
    { id: 'product_captured', name: 'Product images captured', category: 'photography', offsetDays: 0, priority: 'normal', unit: 'stills', requiredQty: 50 },
    { id: 'bg_editing', name: 'Background editing completed', category: 'photography', offsetDays: 3, priority: 'normal', unit: 'photos', requiredQty: 50 },
    { id: 'hi_res_exported', name: 'Final high-resolution images exported', category: 'digital', offsetDays: 5, priority: 'high', unit: 'photos', requiredQty: 50 },
    { id: 'customer_gallery', name: 'Customer gallery shared', category: 'digital', offsetDays: 6, priority: 'normal', unit: 'link', requiredQty: 1 }
  ],
  Corporate: [
    { id: 'corp_shoot_done', name: 'Corporate coverage completed', category: 'photography', offsetDays: 0, priority: 'normal', unit: 'shoot', requiredQty: 1 },
    { id: 'corp_press_stills', name: 'Press & PR stills delivered (same day)', category: 'photography', offsetDays: 0, priority: 'urgent', unit: 'photos', requiredQty: 25 },
    { id: 'corp_event_recap', name: 'Highlight recap film delivered', category: 'video', offsetDays: 4, priority: 'high', unit: 'videos', requiredQty: 1 },
    { id: 'corp_archive_link', name: 'Cloud archive link shared', category: 'digital', offsetDays: 5, priority: 'normal', unit: 'link', requiredQty: 1 }
  ],
  Default: [
    { id: 'def_raw_backup', name: 'RAW photo backup verified', category: 'photography', offsetDays: 1, priority: 'high', unit: 'backup', requiredQty: 1 },
    { id: 'def_stills_ready', name: 'Edited stills ready', category: 'photography', offsetDays: 10, priority: 'normal', unit: 'photos', requiredQty: 100 },
    { id: 'def_video_ready', name: 'Video teaser / edit delivered', category: 'video', offsetDays: 14, priority: 'normal', unit: 'videos', requiredQty: 1 },
    { id: 'def_final_handover', name: 'Final client handover', category: 'digital', offsetDays: 20, priority: 'normal', unit: 'package', requiredQty: 1 }
  ]
};

/**
 * Generate unique, event-specific deliverables from category presets
 */
export function generateDeliverablesForCategory(
  category: string,
  bookingId: string,
  eventDate: string,
  subEventId?: string,
  subEventName?: string
): DeliverableSpecification[] {
  const normalizedCat = Object.keys(DELIVERABLE_PRESETS).find(
    k => k.toLowerCase() === (category || '').toLowerCase()
  ) || 'Default';

  const template = DELIVERABLE_PRESETS[normalizedCat] || DELIVERABLE_PRESETS.Default;
  const baseDateObj = new Date(eventDate || new Date().toISOString().split('T')[0]);

  return template.map((item, idx) => {
    const dueObj = new Date(baseDateObj);
    dueObj.setDate(dueObj.getDate() + item.offsetDays);
    const dueDate = dueObj.toISOString().split('T')[0];

    const uniqueId = `del_${bookingId}_${subEventId || 'main'}_${item.id}_${Math.random().toString(36).substring(2, 6)}`;

    return {
      id: uniqueId,
      bookingId,
      functionId: subEventId,
      functionName: subEventName,
      name: item.name,
      category: item.category,
      requiredQty: item.requiredQty,
      completedQty: 0,
      unit: item.unit,
      deliveryMethod: (item.category === 'physical' ? 'Physical Album' : 'Google Drive') as any,
      deadlineType: 'relative_to_shoot',
      deadlineDays: item.offsetDays,
      calculatedDeadline: dueDate,
      priority: item.priority,
      stage: 'not_started' as DeliveryStage,
      isDelivered: false,
      isPartiallyDelivered: false
    };
  });
}
