import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MessageTemplate } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { 
  MessageSquare, 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Search, 
  Check, 
  Tag, 
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface MessageTemplateManagerProps {
  isOpen?: boolean;
  onClose?: () => void;
  isStandaloneView?: boolean;
}

const COMMON_PLACEHOLDERS = [
  { tag: '{{customer_name}}', desc: "Client's full name" },
  { tag: '{{studio_name}}', desc: 'Active studio name' },
  { tag: '{{event_name}}', desc: 'Main event title' },
  { tag: '{{event_category}}', desc: 'e.g. Wedding, Pre-Wedding' },
  { tag: '{{event_date}}', desc: 'Event date' },
  { tag: '{{event_venue}}', desc: 'Venue location' },
  { tag: '{{pending_balance}}', desc: 'Outstanding amount (₹)' },
  { tag: '{{advance_amount}}', desc: 'Advance required (₹)' },
  { tag: '{{quotation_amount}}', desc: 'Quotation amount (₹)' },
  { tag: '{{assigned_employee}}', desc: 'Lead team member' },
  { tag: '{{delivery_date}}', desc: 'Expected delivery date' },
  { tag: '{{booking_id}}', desc: 'Booking / Event ID' }
];

export const MessageTemplateManager: React.FC<MessageTemplateManagerProps> = ({
  isOpen = true,
  onClose,
  isStandaloneView = false
}) => {
  const { 
    messageTemplates, 
    createMessageTemplate, 
    updateMessageTemplate, 
    duplicateMessageTemplate, 
    deleteMessageTemplate,
    openWhatsAppModal
  } = useApp();

  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<MessageTemplate['category']>('Inquiry');
  const [formBody, setFormBody] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  const categories = ['All', 'Inquiry', 'Booking', 'Billing', 'Post-Production', 'Delivery', 'Greeting', 'General'];

  const filteredTemplates = messageTemplates.filter(t => {
    if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.body.toLowerCase().includes(q);
    }
    return true;
  });

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormTitle('');
    setFormCategory('Inquiry');
    setFormBody('');
    setFormIsActive(true);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (t: MessageTemplate) => {
    setEditingTemplate(t);
    setFormTitle(t.title);
    setFormCategory(t.category);
    setFormBody(t.body);
    setFormIsActive(t.isActive ?? true);
    setIsFormOpen(true);
  };

  const handleInsertPlaceholder = (tag: string) => {
    setFormBody(prev => `${prev} ${tag}`);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 1500);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formBody.trim()) return;

    // Extract placeholders from body
    const matches = formBody.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];
    const extractedPlaceholders = Array.from(new Set(matches.map(m => m.replace(/[{}]/g, ''))));

    if (editingTemplate) {
      updateMessageTemplate(editingTemplate.id, {
        title: formTitle.trim(),
        category: formCategory,
        body: formBody.trim(),
        placeholders: extractedPlaceholders,
        isActive: formIsActive
      });
    } else {
      createMessageTemplate({
        title: formTitle.trim(),
        category: formCategory,
        body: formBody.trim(),
        placeholders: extractedPlaceholders,
        isActive: formIsActive
      });
    }

    setIsFormOpen(false);
    setEditingTemplate(null);
  };

  const content = (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                categoryFilter === cat
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={handleOpenCreate}
          className="shrink-0"
        >
          New Template
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Search templates by title or message content..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
        />
      </div>

      {/* Templates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map(t => (
          <div
            key={t.id}
            className="p-4 rounded-2xl bg-white border border-zinc-200/90 hover:border-zinc-300 shadow-xs flex flex-col justify-between space-y-3 group"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors">
                    {t.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
                      {t.category}
                    </span>
                    {t.isDefault && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        Default
                      </span>
                    )}
                    {!t.isActive && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    title="Duplicate Template"
                    onClick={() => duplicateMessageTemplate(t.id)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    title="Edit Template"
                    onClick={() => handleOpenEdit(t)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  {!t.isDefault && (
                    <button
                      title="Delete Template"
                      onClick={() => {
                        if (confirm(`Delete template "${t.title}"?`)) {
                          deleteMessageTemplate(t.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Body snippet */}
              <p className="text-xs text-zinc-600 line-clamp-3 bg-zinc-50/70 p-2.5 rounded-xl border border-zinc-100 font-sans whitespace-pre-line">
                {t.body}
              </p>
            </div>

            {/* Placeholders chips */}
            {t.placeholders && t.placeholders.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 pt-2 border-t border-zinc-100">
                <span className="text-xs font-medium text-zinc-400 mr-1">Variables:</span>
                {t.placeholders.map(p => (
                  <span
                    key={p}
                    className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-mono"
                  >
                    {`{{${p}}}`}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Template Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingTemplate ? 'Edit WhatsApp Template' : 'Create WhatsApp Template'}
        subtitle="Configure dynamic placeholder tokens for 1-click personal messaging"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Template Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Pre-Event Gear Checklist Confirmation"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              className="w-full text-xs bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Category
              </label>
              <select
                value={formCategory}
                onChange={e => setFormCategory(e.target.value as any)}
                className="w-full text-xs bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 min-h-[44px]"
              >
                {categories.filter(c => c !== 'All').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-700">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={e => setFormIsActive(e.target.checked)}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900/20 w-4 h-4"
                />
                Template Active
              </label>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-zinc-700">
                Message Content <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs text-zinc-400">Click a variable below to insert</span>
            </div>
            <textarea
              required
              rows={5}
              placeholder="Dear {{customer_name}}, greetings from {{studio_name}}..."
              value={formBody}
              onChange={e => setFormBody(e.target.value)}
              className="w-full text-xs bg-white border border-zinc-200 rounded-xl p-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 leading-relaxed font-sans"
            />
          </div>

          {/* Placeholders Cheat-Sheet */}
          <div className="space-y-1.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200/80">
            <span className="text-xs font-bold text-zinc-600 block">Available Dynamic Variables:</span>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_PLACEHOLDERS.map(p => (
                <button
                  type="button"
                  key={p.tag}
                  onClick={() => handleInsertPlaceholder(p.tag)}
                  title={p.desc}
                  className="px-2 py-1 rounded-lg bg-white border border-zinc-200 hover:border-emerald-500 hover:text-emerald-700 text-xs font-mono text-zinc-700 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>{p.tag}</span>
                  {copiedTag === p.tag ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : null}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFormOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingTemplate ? 'Update Template' : 'Save Template'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );

  if (isStandaloneView) {
    return content;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose || (() => {})}
      title="WhatsApp Message Templates"
      subtitle="Standardized client communication templates with smart variables"
    >
      {content}
    </Modal>
  );
};
