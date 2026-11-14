import React, { useState, useMemo } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { platformAnnouncementService } from '../../services/platformAnnouncementService';
import { PlatformAnnouncement } from '../../types/schema';
import { Megaphone, Plus, Trash2, Send, CheckCircle, Clock } from 'lucide-react';

export const PlatformAnnouncementsPage: React.FC = () => {
  const { triggerRefresh, refreshTrigger, canAdmin, currentAdmin } = usePlatform();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<any>('general');
  const [targetScope, setTargetScope] = useState<any>('all');
  const [priority, setPriority] = useState<any>('normal');
  const [status, setStatus] = useState<any>('published');

  const announcements = useMemo(() => {
    return platformAnnouncementService.listAnnouncements();
  }, [refreshTrigger]);

  const handleCreate = () => {
    if (!title.trim() || !description.trim()) return;

    platformAnnouncementService.createAnnouncement({
      title: title.trim(),
      description: description.trim(),
      type,
      targetScope,
      priority,
      status,
      createdBy: currentAdmin.name
    });

    setIsModalOpen(false);
    setTitle('');
    setDescription('');
    triggerRefresh();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this platform announcement?')) {
      platformAnnouncementService.deleteAnnouncement(id);
      triggerRefresh();
    }
  };

  const handlePublish = (id: string) => {
    platformAnnouncementService.updateAnnouncement(id, { status: 'published' }, currentAdmin.name);
    triggerRefresh();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-indigo-600" />
            Platform Announcements & Broadcasts
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Broadcast operational notices, billing updates, and new releases directly into tenant studio notification feeds.
          </p>
        </div>

        {canAdmin('manage_announcements') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> New Announcement
          </button>
        )}
      </div>

      {/* Announcements List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {announcements.map(ann => {
          const isPublished = ann.status === 'published';

          return (
            <div
              key={ann.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {ann.type}
                  </span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {ann.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-2">{ann.title}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{ann.description}</p>
                <div className="text-[11px] text-slate-400 mt-3">
                  Scope: <span className="font-semibold text-slate-600 capitalize">{ann.targetScope.replace('_', ' ')}</span>
                  {ann.publishedAt && ` • Published ${new Date(ann.publishedAt).toLocaleDateString('en-IN')}`}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">By {ann.createdBy}</span>
                <div className="flex items-center gap-1.5">
                  {!isPublished && canAdmin('manage_announcements') && (
                    <button
                      onClick={() => handlePublish(ann.id)}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
                    >
                      Publish Now
                    </button>
                  )}
                  {canAdmin('manage_announcements') && (
                    <button
                      onClick={() => handleDelete(ann.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-50"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Create Platform Announcement</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Headline *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Scheduled Platform Maintenance Tonight"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Announcement Body *</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Detailed announcement text..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs h-24"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Notice Type</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
                  >
                    <option value="general">General</option>
                    <option value="feature">New Feature</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="billing">Billing Update</option>
                    <option value="security">Security</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Audience</label>
                  <select
                    value={targetScope}
                    onChange={e => setTargetScope(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
                  >
                    <option value="all">All Studios</option>
                    <option value="active_only">Active Subscribers Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Initial Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
                >
                  <option value="published">Publish Immediately</option>
                  <option value="draft">Save as Draft</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!title.trim() || !description.trim()}
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs disabled:opacity-50"
              >
                Create Announcement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
