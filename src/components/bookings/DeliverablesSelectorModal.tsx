import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  CheckSquare, 
  Search, 
  X, 
  Check, 
  Sparkles, 
  Camera, 
  Film, 
  BookOpen, 
  Cloud, 
  Plus,
  Trash2,
  Filter
} from 'lucide-react';
import { DeliverableSpecification, DeliverableCategory } from '../../types/bookingProduction';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { useModalLifecycle } from '../../hooks/useModalLifecycle';
import { useStudio } from '../../context/StudioContext';
import { studioCatalogService } from '../../services/studioCatalogService';

export interface DeliverableCatalogItem {
  id: string;
  name: string;
  category: DeliverableCategory;
  unit: string;
  defaultQty: number;
  description: string;
  presetTags: ('wedding' | 'pre_wedding' | 'corporate' | 'birthday')[];
}

export const MASTER_DELIVERABLES_CATALOG: DeliverableCatalogItem[] = [
  // Photography
  { 
    id: 'raw_photos', 
    name: 'RAW Photographs Backup', 
    category: 'photography', 
    unit: 'drive', 
    defaultQty: 1, 
    description: 'Complete unedited camera captures on SSD / cloud drive',
    presetTags: ['wedding', 'pre_wedding', 'corporate', 'birthday']
  },
  { 
    id: 'edited_stills', 
    name: 'Master Retouched Photos', 
    category: 'photography', 
    unit: 'photos', 
    defaultQty: 250, 
    description: 'Color graded, skin-retouched high-resolution stills for album & print',
    presetTags: ['wedding', 'pre_wedding', 'birthday']
  },
  { 
    id: 'traditional_stills', 
    name: 'Stage & Family Group Photos', 
    category: 'photography', 
    unit: 'photos', 
    defaultQty: 150, 
    description: 'Traditional formal group portraits of guests and family members',
    presetTags: ['wedding']
  },
  { 
    id: 'candid_moments', 
    name: 'Candid Moments & Bridal Portraits', 
    category: 'photography', 
    unit: 'photos', 
    defaultQty: 100, 
    description: 'Spontaneous emotional frames, rituals, and creative portraits',
    presetTags: ['wedding', 'pre_wedding']
  },
  { 
    id: 'same_day_stills', 
    name: 'Same-Day Press / PR Stills', 
    category: 'photography', 
    unit: 'photos', 
    defaultQty: 25, 
    description: 'Instant 24-hour turnaround stills for social media and newspaper releases',
    presetTags: ['wedding', 'corporate']
  },

  // Video & Cinema
  { 
    id: 'cinematic_teaser', 
    name: 'Cinematic Teaser / Trailer (4K)', 
    category: 'video', 
    unit: 'videos', 
    defaultQty: 1, 
    description: '3 to 5-minute high-energy music trailer with highlights',
    presetTags: ['wedding', 'pre_wedding']
  },
  { 
    id: 'full_cinematic_film', 
    name: 'Full Cinematic Highlight Film', 
    category: 'video', 
    unit: 'videos', 
    defaultQty: 1, 
    description: '20 to 40-minute documentary style film capturing ceremonies & vows',
    presetTags: ['wedding']
  },
  { 
    id: 'traditional_video', 
    name: 'Full Event Traditional Video', 
    category: 'video', 
    unit: 'videos', 
    defaultQty: 1, 
    description: '2 to 3-hour comprehensive stage and ritual coverage',
    presetTags: ['wedding']
  },
  { 
    id: 'social_reels', 
    name: 'Instagram Reels & YouTube Shorts (9:16)', 
    category: 'video', 
    unit: 'reels', 
    defaultQty: 3, 
    description: 'Vertical viral cut-downs formatted for mobile viewing and sharing',
    presetTags: ['wedding', 'pre_wedding', 'birthday']
  },
  { 
    id: 'drone_aerial_clips', 
    name: 'Aerial Drone 4K Footage', 
    category: 'video', 
    unit: 'clips', 
    defaultQty: 1, 
    description: 'Grand venue, procession, and outdoor drone establishing clips',
    presetTags: ['wedding']
  },
  { 
    id: 'live_stream_recording', 
    name: 'Live Stream Master Recording', 
    category: 'video', 
    unit: 'archive', 
    defaultQty: 1, 
    description: 'Full uncompressed recording of multi-camera live broadcast',
    presetTags: ['wedding', 'corporate']
  },

  // Albums & Physical
  { 
    id: 'premium_photobook', 
    name: 'Premium Flush Mount Album', 
    category: 'physical', 
    unit: 'albums', 
    defaultQty: 1, 
    description: '12x36 inch flush mount album with 35 sheets and acrylic/leatherette box',
    presetTags: ['wedding']
  },
  { 
    id: 'parents_mini_albums', 
    name: 'Parents Mini Album Copies', 
    category: 'physical', 
    unit: 'copies', 
    defaultQty: 2, 
    description: 'Matching compact replica albums for parents and in-laws',
    presetTags: ['wedding']
  },
  { 
    id: 'wall_canvas_frame', 
    name: 'Large Wall Canvas Mount Frame', 
    category: 'physical', 
    unit: 'frame', 
    defaultQty: 1, 
    description: '24x36 inch textured matte canvas with wooden backing frame',
    presetTags: ['wedding', 'pre_wedding']
  },
  { 
    id: 'wooden_usb_box', 
    name: 'Custom Wooden USB Keepsake Box', 
    category: 'physical', 
    unit: 'box', 
    defaultQty: 1, 
    description: 'Laser engraved personalized wooden box with 64GB USB 3.0 drive',
    presetTags: ['wedding', 'pre_wedding']
  },
  { 
    id: 'table_calendar_folio', 
    name: 'Desk Calendar & Photo Folio', 
    category: 'physical', 
    unit: 'item', 
    defaultQty: 1, 
    description: 'Custom 12-month desktop calendar with curated couple portraits',
    presetTags: ['pre_wedding']
  },

  // Digital & Cloud
  { 
    id: 'cloud_gallery_1yr', 
    name: 'Private Cloud Gallery (1 Year)', 
    category: 'digital', 
    unit: 'link', 
    defaultQty: 1, 
    description: 'Password-protected online gallery with unlimited high-res downloads',
    presetTags: ['wedding', 'pre_wedding', 'corporate', 'birthday']
  },
  { 
    id: 'mobile_gallery_app', 
    name: 'Mobile App Gallery Share Link', 
    category: 'digital', 
    unit: 'app', 
    defaultQty: 1, 
    description: 'Fast mobile webview link for wedding guests and family sharing',
    presetTags: ['wedding', 'birthday']
  },
  { 
    id: 'whatsapp_bundle', 
    name: 'WhatsApp Web-Optimized Bundle', 
    category: 'digital', 
    unit: 'zip', 
    defaultQty: 1, 
    description: 'Lightweight, pre-compressed image package formatted for fast WhatsApp sends',
    presetTags: ['wedding', 'pre_wedding', 'birthday', 'corporate']
  }
];

interface DeliverablesSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (selectedItems: DeliverableCatalogItem[]) => void;
  initialSelectedIds?: string[];
  bookingId?: string;
  functionName?: string;
}

export const DeliverablesSelectorModal: React.FC<DeliverablesSelectorModalProps> = ({
  isOpen,
  onClose,
  onApply,
  initialSelectedIds = [],
  bookingId,
  functionName
}) => {
  const { currentStudio } = useStudio();
  const studioId = currentStudio?.id || '';
  const modalRef = useRef<HTMLDivElement>(null);
  useOutsideClick(modalRef, onClose, isOpen);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | DeliverableCategory>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelectedIds));
  const [catalogVersion, setCatalogVersion] = useState(0);

  // Inline "+ Add Deliverable" state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<DeliverableCategory>('photography');
  const [newQty, setNewQty] = useState<number>(1);
  const [newUnit, setNewUnit] = useState('items');

  const studioCatalog: DeliverableCatalogItem[] = useMemo(() => {
    const saved = studioId ? studioCatalogService.listDeliverables(studioId) : [];
    const mapped: DeliverableCatalogItem[] = saved.map(d => ({
      id: d.id,
      name: d.name,
      category: d.category,
      unit: d.unit || 'items',
      defaultQty: d.defaultQty || 1,
      description: d.description || '',
      presetTags: []
    }));
    const isDemo = studioId === 'studio_shreeji_films' || studioId === 'std_demo_royal';
    if (mapped.length === 0 && isDemo) {
      return MASTER_DELIVERABLES_CATALOG;
    }
    return mapped;
  }, [studioId, catalogVersion, isOpen]);

  // Sync initialSelectedIds when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(initialSelectedIds));
      setSearchQuery('');
      setSelectedCategory('all');
      setIsAddingNew(false);
    }
  }, [isOpen, initialSelectedIds]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter items by category and search
  const filteredCatalog = useMemo(() => {
    return studioCatalog.filter(item => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.name.toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [studioCatalog, selectedCategory, searchQuery]);

  const handleAddInlineDeliverable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !studioId) return;
    const created = studioCatalogService.createDeliverable(studioId, {
      name: newName.trim(),
      category: newCategory,
      defaultQty: Math.max(1, Number(newQty) || 1),
      unit: newUnit.trim() || 'items'
    });
    setCatalogVersion(v => v + 1);
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.add(created.id);
      return next;
    });
    setNewName('');
    setNewQty(1);
    setNewUnit('items');
    setIsAddingNew(false);
  };

  const toggleItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredCatalog.forEach(item => next.add(item.id));
      return next;
    });
  };

  const clearAllFiltered = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredCatalog.forEach(item => next.delete(item.id));
      return next;
    });
  };

  const applyPreset = (tag: 'wedding' | 'pre_wedding') => {
    const presetItemIds = filteredCatalog
      .filter(item => item.presetTags?.includes(tag))
      .map(item => item.id);
    setSelectedIds(prev => new Set([...prev, ...presetItemIds]));
  };

  const handleConfirm = () => {
    const selectedItems = studioCatalog.filter(i => selectedIds.has(i.id));
    onApply(selectedItems);
    onClose();
  };

  const { handleAttemptClose, handleBackdropClick } = useModalLifecycle({
    isOpen,
    onClose
  });

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-2xl w-full flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-orange-600 shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-zinc-900 font-display">
                  Select Deliverables
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                  {selectedIds.size} Selected
                </span>
              </div>
              {functionName ? (
                <p className="text-xs text-zinc-500">For function: <strong className="text-zinc-800">{functionName}</strong></p>
              ) : (
                <p className="text-xs text-zinc-500">Select multi-item outputs for this shoot</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleAttemptClose}
            className="min-w-[44px] min-h-[44px] rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Search, Category Tabs & Quick Presets */}
        <div className="p-3.5 sm:p-4 border-b border-zinc-100 bg-zinc-50/50 space-y-3 shrink-0">
          {/* Search input */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search deliverables by name or format (e.g. reel, raw, album)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[46px]"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 p-1 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Tabs & Quick Preset Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none text-xs touch-scroll">
              {[
                { id: 'all', label: 'All', icon: <CheckSquare className="w-3.5 h-3.5" /> },
                { id: 'photography', label: 'Photos', icon: <Camera className="w-3.5 h-3.5" /> },
                { id: 'video', label: 'Videos', icon: <Film className="w-3.5 h-3.5" /> },
                { id: 'physical', label: 'Albums & Prints', icon: <BookOpen className="w-3.5 h-3.5" /> },
                { id: 'digital', label: 'Digital', icon: <Cloud className="w-3.5 h-3.5" /> }
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Quick Actions: Select All / Clear / + Add Deliverable */}
            <div className="flex items-center gap-1.5 text-xs">
              {filteredCatalog.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    className="min-h-[36px] px-2.5 py-1 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 font-semibold cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={clearAllFiltered}
                    className="min-h-[36px] px-2.5 py-1 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 font-semibold cursor-pointer"
                  >
                    Clear All
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('wedding')}
                    className="min-h-[36px] px-2.5 py-1 rounded-lg border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 font-semibold cursor-pointer hidden md:inline-flex items-center"
                  >
                    Wedding Preset
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('pre_wedding')}
                    className="min-h-[36px] px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold cursor-pointer hidden md:inline-flex items-center"
                  >
                    Pre-Wedding Preset
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setIsAddingNew(!isAddingNew)}
                className="min-h-[36px] px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-bold cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>+ Add Deliverable</span>
              </button>
            </div>
          </div>

          {/* Inline Add Studio Deliverable Form */}
          {isAddingNew && (
            <form onSubmit={handleAddInlineDeliverable} className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 space-y-2.5 text-xs">
              <div className="font-bold text-amber-950">Add Deliverable to Your Studio Catalog</div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. Edited Photos, Teaser Video"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="sm:col-span-2 px-3 py-2 rounded-lg border border-amber-300 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as DeliverableCategory)}
                  className="px-2.5 py-2 rounded-lg border border-amber-300 bg-white text-xs"
                >
                  <option value="photography">Photography</option>
                  <option value="video">Video</option>
                  <option value="physical">Album / Print</option>
                  <option value="digital">Digital / Cloud</option>
                </select>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    value={newQty}
                    onChange={e => setNewQty(Number(e.target.value) || 1)}
                    className="w-16 px-2 py-2 rounded-lg border border-amber-300 bg-white font-mono text-xs"
                    placeholder="Qty"
                  />
                  <input
                    type="text"
                    value={newUnit}
                    onChange={e => setNewUnit(e.target.value)}
                    className="flex-1 min-w-0 px-2 py-2 rounded-lg border border-amber-300 bg-white text-xs"
                    placeholder="Unit"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsAddingNew(false)} className="px-3 py-1.5 rounded-lg text-zinc-600 font-semibold hover:bg-zinc-200/50 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-3.5 py-1.5 rounded-lg bg-zinc-900 text-white font-bold hover:bg-zinc-800 cursor-pointer">
                  Save & Select
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Scrollable Checklist Items with large 48px touch rows */}
        <div className="p-3.5 sm:p-4 overflow-y-auto flex-1 space-y-2 touch-scroll">
          {filteredCatalog.map(item => {
            const isSelected = selectedIds.has(item.id);

            return (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`min-h-[52px] p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected 
                    ? 'border-orange-500 bg-orange-50/60 shadow-2xs ring-1 ring-orange-500/20' 
                    : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Large 24px checkbox with touch padding */}
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                    isSelected 
                      ? 'bg-orange-500 border-orange-500 text-white' 
                      : 'border-zinc-300 bg-white'
                  }`}>
                    {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-zinc-900 truncate">{item.name}</span>
                      <span className="text-[12px] font-semibold px-2 py-0.2 rounded-md bg-zinc-100 text-zinc-600 capitalize hidden sm:inline">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-1">{item.description}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-bold text-zinc-600 px-2 py-1 rounded bg-zinc-100 border border-zinc-200">
                    {item.defaultQty} {item.unit}
                  </span>
                </div>
              </div>
            );
          })}

          {filteredCatalog.length === 0 && (
            <div className="p-8 text-center space-y-2">
              <p className="text-xs sm:text-sm font-bold text-zinc-700">
                {studioCatalog.length === 0
                  ? 'No deliverables configured in your studio yet'
                  : `No deliverables matching "${searchQuery}".`}
              </p>
              <p className="text-xs text-zinc-500">
                Add deliverables using "+ Add Deliverable" above — they save directly to your studio catalog.
              </p>
              {!isAddingNew && (
                <button
                  type="button"
                  onClick={() => setIsAddingNew(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold cursor-pointer mt-1"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>+ Add Your First Deliverable</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer: Compact Selected Summary & Apply Button */}
        <div className="p-3.5 sm:p-4 border-t border-zinc-100 bg-zinc-50/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-zinc-600 font-medium">
            <strong className="text-zinc-900 font-bold">{selectedIds.size} deliverables</strong> selected for fulfillment
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial min-h-[48px] px-5 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-sm font-semibold text-zinc-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 sm:flex-initial min-h-[50px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Apply Deliverables ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
