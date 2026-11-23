import React, { useState } from 'react';
import { whatsappService } from '../../services/whatsappService';
import { MessageTemplate } from '../../types/schema';
import { MessageSquare, Plus, Trash2, CheckCircle2, Check, Sparkles } from 'lucide-react';

interface Props {
  studioId: string;
}

export const WhatsAppTemplatesSettings: React.FC<Props> = ({ studioId }) => {
  const [templatesList, setTemplatesList] = useState<MessageTemplate[]>(() => 
    whatsappService.listTemplates(studioId)
  );
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateCategory, setTemplateCategory] = useState('Billing');
  const [templateBody, setTemplateBody] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const handleSetDefaultTemplate = (templateId: string) => {
    try {
      whatsappService.setDefaultQuotationTemplate(studioId, templateId, 'Studio Owner');
      setTemplatesList(whatsappService.listTemplates(studioId));
      setNotice('Default quotation message updated!');
      setTimeout(() => setNotice(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Error updating template');
    }
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateTitle.trim() || !templateBody.trim()) return;
    try {
      whatsappService.createTemplate(studioId, {
        title: templateTitle.trim(),
        category: templateCategory,
        body: templateBody.trim()
      }, 'Studio Owner');
      setTemplatesList(whatsappService.listTemplates(studioId));
      setTemplateTitle('');
      setTemplateBody('');
      setIsAddingTemplate(false);
      setNotice('New message template created!');
      setTimeout(() => setNotice(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Error creating template');
    }
  };

  const handleDeleteTemplate = (id: string) => {
    if (!window.confirm('Delete this message template?')) return;
    try {
      whatsappService.deleteTemplate(studioId, id, 'Studio Owner');
      setTemplatesList(whatsappService.listTemplates(studioId));
      setNotice('Deleted message template.');
      setTimeout(() => setNotice(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Cannot delete template');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {notice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{notice}</span>
        </div>
      )}

      {/* Dynamic Variables Cheatsheet Banner */}
      <div className="p-5 rounded-3xl bg-zinc-900 text-white space-y-3 shadow-xs">
        <div className="flex items-center gap-2 text-amber-400">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Supported Dynamic Template Variables
          </span>
        </div>
        <p className="text-xs text-zinc-300 leading-relaxed">
          Use these single or double curly placeholders inside your messages. They are auto-substituted in real time when generating quotations:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="bg-zinc-800/80 p-2 rounded-xl border border-zinc-700">
            <span className="text-amber-300 block">{'{customer_name}'}</span>
            <span className="text-zinc-400 text-xs font-sans">Client Name</span>
          </div>
          <div className="bg-zinc-800/80 p-2 rounded-xl border border-zinc-700">
            <span className="text-amber-300 block">{'{studio_name}'}</span>
            <span className="text-zinc-400 text-xs font-sans">Studio Name</span>
          </div>
          <div className="bg-zinc-800/80 p-2 rounded-xl border border-zinc-700">
            <span className="text-amber-300 block">{'{event_name}'}</span>
            <span className="text-zinc-400 text-xs font-sans">Event Title</span>
          </div>
          <div className="bg-zinc-800/80 p-2 rounded-xl border border-zinc-700">
            <span className="text-amber-300 block">{'{event_date}'}</span>
            <span className="text-zinc-400 text-xs font-sans">Shoot Date</span>
          </div>
          <div className="bg-zinc-800/80 p-2 rounded-xl border border-zinc-700">
            <span className="text-amber-300 block">{'{event_location}'}</span>
            <span className="text-zinc-400 text-xs font-sans">Venue / City</span>
          </div>
          <div className="bg-zinc-800/80 p-2 rounded-xl border border-zinc-700">
            <span className="text-amber-300 block">{'{total_amount}'}</span>
            <span className="text-zinc-400 text-xs font-sans">Final Total (₹)</span>
          </div>
          <div className="bg-zinc-800/80 p-2 rounded-xl border border-zinc-700 col-span-2">
            <span className="text-emerald-300 block">{'{quotation_link}'}</span>
            <span className="text-zinc-400 text-xs font-sans">Public Customer Proposal View Link</span>
          </div>
        </div>
      </div>

      {/* Templates Management Card */}
      <div className="p-6 rounded-3xl bg-white border border-zinc-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
          <div>
            <h3 className="text-base font-bold text-zinc-900 font-display">
              WhatsApp Message Templates
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Templates for inquiries, quotations, advance payments, reminders, and delivery alerts.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingTemplate(!isAddingTemplate)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Create Template</span>
          </button>
        </div>

        {/* Create Template Form */}
        {isAddingTemplate && (
          <form onSubmit={handleSaveTemplate} className="p-5 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-800 block">
              Create Custom Template
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Template Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wedding Quotation Express"
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 bg-white text-xs focus:ring-1 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Category</label>
                <select
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 bg-white text-xs focus:ring-1 focus:ring-zinc-900"
                >
                  <option value="Billing">Billing & Quotation</option>
                  <option value="Inquiry">Inquiry</option>
                  <option value="Booking">Booking</option>
                  <option value="Post-Production">Post-Production</option>
                  <option value="Delivery">Delivery</option>
                  <option value="Greetings">Greetings</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Message Body *</label>
              <textarea
                rows={4}
                required
                placeholder="Hello {customer_name}, here is your quotation for {event_name}: {quotation_link}..."
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 bg-white text-xs focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingTemplate(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-200/60 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Save Template
              </button>
            </div>
          </form>
        )}

        {/* Templates List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templatesList.map((tmpl) => (
            <div
              key={tmpl.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                tmpl.isDefault && (tmpl.category === 'Billing' || tmpl.title.toLowerCase().includes('quotation'))
                  ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-300'
                  : 'bg-zinc-50/50 border-zinc-200'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900 text-xs">{tmpl.title}</span>
                    <span className="px-2 py-0.5 rounded-md bg-zinc-200/80 text-zinc-700 text-xs font-medium">
                      {tmpl.category}
                    </span>
                  </div>
                  {tmpl.isDefault && (tmpl.category === 'Billing' || tmpl.title.toLowerCase().includes('quotation')) && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-xs font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Default Quotation Msg
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-600 bg-white p-3 rounded-xl border border-zinc-200/80 leading-relaxed whitespace-pre-wrap">
                  {tmpl.body}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60 text-xs">
                <span className="text-zinc-400 text-xs">
                  {tmpl.placeholders?.length || 0} variables
                </span>

                <div className="flex items-center gap-2">
                  {(!tmpl.isDefault || (!tmpl.title.toLowerCase().includes('quotation') && tmpl.category !== 'Billing')) && (
                    <button
                      type="button"
                      onClick={() => handleSetDefaultTemplate(tmpl.id)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-bold transition-all cursor-pointer"
                    >
                      Set as Default Quotation
                    </button>
                  )}

                  {!tmpl.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(tmpl.id)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Delete Template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
