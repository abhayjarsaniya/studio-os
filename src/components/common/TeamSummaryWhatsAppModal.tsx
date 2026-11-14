import React, { useState } from 'react';
import { useStudio } from '../../context/StudioContext';
import { useApp } from '../../context/AppContext';
import { teamWhatsAppService } from '../../services/teamWhatsAppService';
import { MessageSquare, Copy, ExternalLink, X, Calendar, Check, ShieldCheck } from 'lucide-react';

interface TeamSummaryWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEventId?: string;
}

export const TeamSummaryWhatsAppModal: React.FC<TeamSummaryWhatsAppModalProps> = ({
  isOpen,
  onClose,
  defaultEventId
}) => {
  const { currentStudio } = useStudio();
  const { events } = useApp();

  const studioId = currentStudio.id;
  const [mode, setMode] = useState<'daily' | 'event'>(defaultEventId ? 'event' : 'daily');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedEventId, setSelectedEventId] = useState<string>(defaultEventId || (events[0]?.id || ''));
  const [targetPhone, setTargetPhone] = useState<string>('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generatedMessage = mode === 'daily'
    ? teamWhatsAppService.generateDailyCrewSummary(studioId, selectedDate)
    : selectedEventId
    ? teamWhatsAppService.generateEventCrewSummary(studioId, selectedEventId)
    : 'Please select an event to generate the crew call sheet.';

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const link = teamWhatsAppService.createWhatsAppShareLink(targetPhone, generatedMessage);
    window.open(link, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <MessageSquare className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">Team WhatsApp Shoot Summary</h3>
              <p className="text-xs text-slate-500">
                Generate pre-formatted crew schedules and launch WhatsApp click-to-chat.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            onClick={() => setMode('daily')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              mode === 'daily' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daily Shoot Schedule
          </button>
          <button
            onClick={() => setMode('event')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              mode === 'event' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Specific Event Call Sheet
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {mode === 'daily' ? (
            <div>
              <label className="font-bold text-slate-700 block mb-1">Select Shoot Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>
          ) : (
            <div>
              <label className="font-bold text-slate-700 block mb-1">Select Event</label>
              <select
                value={selectedEventId}
                onChange={e => setSelectedEventId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 block mb-1">Recipient Phone (Optional)</label>
            <input
              type="text"
              value={targetPhone}
              onChange={e => setTargetPhone(e.target.value)}
              placeholder="e.g. +91 98250 12345 or leave empty to choose chat in WhatsApp"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>
        </div>

        {/* Message Preview */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block flex items-center justify-between">
            <span>WhatsApp Message Preview</span>
            <span className="text-[11px] text-slate-400 font-normal">Formatted for WhatsApp monospace / bold</span>
          </label>
          <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-xs whitespace-pre-wrap max-h-60 overflow-y-auto border border-slate-800 leading-relaxed">
            {generatedMessage}
          </div>
        </div>

        {/* Privacy Shield Notice */}
        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start gap-2.5 text-xs text-emerald-900">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <strong>Strict Privacy Scrubbing Active:</strong> Personal customer phone numbers and financial prices are excluded by default. Only Event Reference, Sub-Event timings, and venue instructions are broadcast to crew.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            onClick={handleCopy}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl inline-flex items-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied to Clipboard!' : 'Copy Text'}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Close
            </button>
            <button
              onClick={handleOpenWhatsApp}
              className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl shadow-xs inline-flex items-center gap-1.5"
            >
              <ExternalLink className="w-4 h-4" />
              Open WhatsApp Web / App
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
