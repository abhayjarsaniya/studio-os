import React, { useState } from 'react';
import { whatsappService, StudioWhatsAppConfig } from '../../services/whatsappService';
import { featureVisibilityService } from '../../services/featureVisibilityService';
import { TenantStore } from '../../services/tenantStore';
import { MessageTemplate, Studio } from '../../types/schema';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Check, 
  Sparkles, 
  Lock, 
  ShieldAlert, 
  Phone, 
  Globe, 
  MessageCircle, 
  AlertCircle,
  Save
} from 'lucide-react';

interface Props {
  studioId: string;
}

export const WhatsAppTemplatesSettings: React.FC<Props> = ({ studioId }) => {
  const [templatesList, setTemplatesList] = useState<MessageTemplate[]>(() => 
    whatsappService.listTemplates(studioId)
  );

  // Platform Master Admin Feature Status Check
  const platformOverride = featureVisibilityService.getStudioPlatformOverride(studioId);
  const studioProfile = TenantStore.getSingle<Studio>(studioId, 'profile');
  const isPlatformDisabled = platformOverride.featureOverrides['whatsapp'] === false || (studioProfile?.settings as any)?.allowDirectWhatsApp === false;

  // Studio-Specific WhatsApp Configuration
  const [config, setConfig] = useState<StudioWhatsAppConfig>(() => 
    whatsappService.getStudioConfig(studioId)
  );

  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateCategory, setTemplateCategory] = useState('Billing');
  const [templateBody, setTemplateBody] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPlatformDisabled) return;
    setIsSavingConfig(true);
    try {
      const updated = whatsappService.saveStudioConfig(studioId, config, 'Studio Owner');
      setConfig(updated);
      setNotice('WhatsApp studio configuration saved successfully!');
      setTimeout(() => setNotice(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Error saving WhatsApp configuration');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleToggleStudioEnabled = () => {
    if (isPlatformDisabled) return;
    const nextVal = !config.enabled;
    const updated = whatsappService.saveStudioConfig(studioId, { enabled: nextVal }, 'Studio Owner');
    setConfig(updated);
    setNotice(`WhatsApp Click-to-Chat is now ${nextVal ? 'enabled' : 'disabled'} for your studio.`);
    setTimeout(() => setNotice(null), 3000);
  };

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

      {/* PLATFORM GOVERNANCE STATUS CARD */}
      <div className={`p-5 rounded-3xl border shadow-xs transition-all ${
        isPlatformDisabled 
          ? 'bg-rose-50/70 border-rose-200 text-rose-900' 
          : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            {isPlatformDisabled ? (
              <div className="p-2.5 rounded-2xl bg-rose-100 text-rose-700 mt-0.5">
                <Lock className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700 mt-0.5">
                <MessageCircle className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold font-display">
                  WhatsApp Click-to-Chat Feature Status
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase border ${
                  isPlatformDisabled
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  {isPlatformDisabled ? 'Disabled by Platform Admin' : 'Active'}
                </span>
              </div>
              <p className="text-xs mt-1 text-zinc-600 leading-relaxed">
                {isPlatformDisabled
                  ? 'WhatsApp integration has been administratively disabled for this studio by Platform Master Admin. You cannot override this decision or use direct WhatsApp messaging until platform access is re-enabled.'
                  : 'WhatsApp Click-to-Chat is active and governed by Platform Master Admin. You can customize your business phone number and messaging templates below.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* STUDIO OWNER CONFIGURATION CARD */}
      <div className={`p-6 rounded-3xl bg-white border border-zinc-200 shadow-xs space-y-5 transition-all ${
        isPlatformDisabled ? 'opacity-60 pointer-events-none select-none' : ''
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
          <div>
            <h3 className="text-base font-bold text-zinc-900 font-display flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-600" />
              Studio WhatsApp Business Configuration
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Configure your outgoing business contact number and default country code for client communication.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-zinc-700">Studio WhatsApp:</span>
            <button
              type="button"
              disabled={isPlatformDisabled}
              onClick={handleToggleStudioEnabled}
              className={`min-h-[44px] px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer touch-manipulation active:scale-95 shadow-xs ${
                config.enabled && !isPlatformDisabled
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
              }`}
            >
              {config.enabled && !isPlatformDisabled ? 'Enabled for Studio' : 'Disabled for Studio'}
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Default Country Code
              </label>
              <input
                type="text"
                disabled={isPlatformDisabled}
                required
                value={config.countryCode}
                onChange={(e) => setConfig({ ...config, countryCode: e.target.value })}
                placeholder="+91"
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 bg-white text-xs font-mono focus:ring-2 focus:ring-zinc-900"
              />
              <span className="text-xs text-zinc-400 mt-0.5 block">Standard country dialing prefix (default: +91 for India).</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Studio WhatsApp Business Number
              </label>
              <input
                type="tel"
                disabled={isPlatformDisabled}
                required
                value={config.businessNumber}
                onChange={(e) => setConfig({ ...config, businessNumber: e.target.value })}
                placeholder="e.g. 9876543210"
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 bg-white text-xs font-mono focus:ring-2 focus:ring-zinc-900"
              />
              <span className="text-xs text-zinc-400 mt-0.5 block">Used for sending and receiving client inquiries.</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">
              Default Greetings Message
            </label>
            <input
              type="text"
              disabled={isPlatformDisabled}
              value={config.defaultMessage}
              onChange={(e) => setConfig({ ...config, defaultMessage: e.target.value })}
              placeholder="Hello {customer_name}, greetings from {studio_name}!"
              className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 bg-white text-xs focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isPlatformDisabled || isSavingConfig}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer touch-manipulation active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span>{isSavingConfig ? 'Saving...' : 'Save WhatsApp Configuration'}</span>
            </button>
          </div>
        </form>
      </div>

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
            className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs touch-manipulation active:scale-95"
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
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 bg-white text-xs focus:ring-1 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Category</label>
                <select
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 bg-white text-xs focus:ring-1 focus:ring-zinc-900"
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
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 bg-white text-xs focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingTemplate(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-200/60 cursor-pointer touch-manipulation active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer touch-manipulation active:scale-95"
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
                      className="min-h-[44px] px-3.5 py-1.5 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-bold transition-all cursor-pointer touch-manipulation active:scale-95"
                    >
                      Set as Default Quotation
                    </button>
                  )}

                  {!tmpl.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(tmpl.id)}
                      className="min-h-[44px] min-w-[44px] p-2 rounded-lg text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer flex items-center justify-center touch-manipulation active:scale-95"
                      title="Delete Template"
                    >
                      <Trash2 className="w-4 h-4" />
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
