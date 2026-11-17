import React, { useState, useMemo } from 'react';
import { platformAnnouncementService } from '../../services/platformAnnouncementService';
import { masterAdminService } from '../../services/masterAdminService';
import { masterExportService, ExportColumn } from '../../services/masterExportService';
import { platformAuditService } from '../../services/platformAuditService';
import { TenantStore } from '../../services/tenantStore';
import { PlatformAnnouncement } from '../../types/schema';
import { 
  Bell, 
  Search, 
  Filter, 
  Download, 
  FileText, 
  Plus, 
  Calendar, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Edit3, 
  X, 
  Send, 
  Sparkles,
  Info,
  ShieldAlert,
  Radio,
  Eye,
  CheckCheck
} from 'lucide-react';

export const MasterNotificationsPage: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<PlatformAnnouncement | null>(null);
  const [deletingNotification, setDeletingNotification] = useState<PlatformAnnouncement | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'general' as PlatformAnnouncement['type'],
    priority: 'normal' as PlatformAnnouncement['priority'],
    targetScope: 'all' as PlatformAnnouncement['targetScope'],
    status: 'published' as 'draft' | 'published'
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const studios = useMemo(() => {
    return masterAdminService.getAllStudios();
  }, [refreshKey]);

  // Load real notifications from platformAnnouncementService
  const notifications = useMemo(() => {
    return platformAnnouncementService.listAnnouncements();
  }, [refreshKey]);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (selectedType !== 'all' && n.type !== selectedType) return false;
      if (selectedPriority !== 'all' && n.priority !== selectedPriority) return false;
      if (selectedStatus !== 'all' && n.status !== selectedStatus) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.description.toLowerCase().includes(q) ||
          n.type.toLowerCase().includes(q) ||
          n.createdBy.toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [notifications, selectedType, selectedPriority, selectedStatus, searchTerm]);

  // KPIs
  const kpis = useMemo(() => {
    const totalAnnouncements = notifications.length;
    const publishedCount = notifications.filter(n => n.status === 'published').length;
    const urgentCount = notifications.filter(n => n.priority === 'urgent' || n.priority === 'high').length;
    const deliveredCount = publishedCount * studios.length;
    return { totalAnnouncements, publishedCount, urgentCount, deliveredCount };
  }, [notifications, studios]);

  // Pagination
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage) || 1;
  const paginatedNotifications = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredNotifications.slice(start, start + itemsPerPage);
  }, [filteredNotifications, currentPage]);

  const handleSaveNotification = () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please enter a notification title and description.');
      return;
    }

    if (editingNotification) {
      const all = platformAnnouncementService.listAnnouncements();
      const updated = all.map(n => {
        if (n.id === editingNotification.id) {
          return {
            ...n,
            title: formData.title,
            description: formData.description,
            type: formData.type,
            priority: formData.priority,
            targetScope: formData.targetScope,
            status: formData.status
          };
        }
        return n;
      });
      TenantStore.set('platform_system', 'platform_announcements', updated);
      platformAuditService.logAction('Master Admin', 'UPDATE_NOTIFICATION', 'announcement', editingNotification.id, `Updated broadcast: ${formData.title}`);
      showToast('Notification broadcast updated.');
    } else {
      const created = platformAnnouncementService.createAnnouncement({
        title: formData.title,
        description: formData.description,
        type: formData.type,
        priority: formData.priority,
        targetScope: formData.targetScope,
        status: formData.status,
        createdBy: 'Abhay Jarsaniya (Master Admin)'
      });
      platformAuditService.logAction('Master Admin', 'CREATE_NOTIFICATION', 'announcement', created.id, `Dispatched broadcast: ${formData.title}`);
      showToast('New platform notification broadcasted.');
    }

    setIsAddModalOpen(false);
    setEditingNotification(null);
    setRefreshKey(k => k + 1);
  };

  const handleToggleStatus = (n: PlatformAnnouncement) => {
    const nextStatus = n.status === 'published' ? 'draft' : 'published';
    const all = platformAnnouncementService.listAnnouncements();
    const updated = all.map(item => item.id === n.id ? { ...item, status: nextStatus } : item);
    TenantStore.set('platform_system', 'platform_announcements', updated);
    platformAuditService.logAction('Master Admin', 'TOGGLE_NOTIFICATION_STATUS', 'announcement', n.id, `Set status of ${n.title} to ${nextStatus}`);
    showToast(`Broadcast "${n.title}" is now ${nextStatus.toUpperCase()}.`);
    setRefreshKey(k => k + 1);
  };

  const handleDeleteNotification = () => {
    if (!deletingNotification) return;
    const all = platformAnnouncementService.listAnnouncements();
    const filtered = all.filter(n => n.id !== deletingNotification.id);
    TenantStore.set('platform_system', 'platform_announcements', filtered);
    platformAuditService.logAction('Master Admin', 'DELETE_NOTIFICATION', 'announcement', deletingNotification.id, `Deleted notification ${deletingNotification.title}`);
    showToast(`Notification deleted.`);
    setDeletingNotification(null);
    setRefreshKey(k => k + 1);
  };

  const handleExport = (type: 'pdf' | 'excel') => {
    const exportColumns: ExportColumn[] = [
      { key: 'title', label: 'Broadcast Title' },
      { key: 'type', label: 'Type' },
      { key: 'priority', label: 'Priority' },
      { key: 'targetScope', label: 'Target Audience' },
      { key: 'status', label: 'Delivery Status' },
      { key: 'createdBy', label: 'Author' },
      { key: 'createdAt', label: 'Broadcast Date' }
    ];

    const options = {
      filename: 'Platform_Notifications_Audit',
      title: 'Platform System Broadcasts & Notifications Log',
      subtitle: `Audit of administrative announcements dispatched across studios`,
      filterSummary: `Type: ${selectedType} | Priority: ${selectedPriority} | Status: ${selectedStatus}`,
      columns: exportColumns,
      rows: filteredNotifications,
      summaryMetrics: [
        { label: 'Total Broadcasts', value: kpis.totalAnnouncements },
        { label: 'Active Broadcasts', value: kpis.publishedCount },
        { label: 'Urgent Alerts', value: kpis.urgentCount },
        { label: 'Delivered Messages', value: kpis.deliveredCount }
      ]
    };

    if (type === 'excel') masterExportService.exportToExcel(options);
    else masterExportService.exportToPDF(options);
  };

  return (
    <div className="space-y-6 pb-20 w-full font-sans">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-orange-500/30 text-xs">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-50 text-orange-800 border border-orange-200">
              Platform Communications
            </span>
            <span className="text-xs text-zinc-500 font-medium">{notifications.length} Announcements Logged</span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 font-display tracking-tight mt-1">
            Platform Notifications
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Global studio announcements, maintenance banners, urgent security broadcasts, and delivery telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleExport('excel')}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 text-xs font-bold flex items-center gap-2 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 text-xs font-bold flex items-center gap-2 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={() => {
              setEditingNotification(null);
              setFormData({
                title: '',
                description: '',
                type: 'general',
                priority: 'normal',
                targetScope: 'all',
                status: 'published'
              });
              setIsAddModalOpen(true);
            }}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Announcement</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Total Broadcasts</span>
          <div className="text-2xl font-black text-zinc-900 mt-1 font-display">{kpis.totalAnnouncements}</div>
          <span className="text-xs text-zinc-500 mt-0.5 block">Administrative notices</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Live on Portals</span>
          <div className="text-2xl font-black text-emerald-600 mt-1 font-display">{kpis.publishedCount}</div>
          <span className="text-xs text-emerald-600 font-bold mt-0.5 block">Currently displayed</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">High Priority</span>
          <div className="text-2xl font-black text-rose-600 mt-1 font-display">{kpis.urgentCount}</div>
          <span className="text-xs text-zinc-500 mt-0.5 block">Urgent / security alerts</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Total Delivered</span>
          <div className="text-2xl font-black text-orange-600 mt-1 font-display">{kpis.deliveredCount}</div>
          <span className="text-xs text-zinc-500 mt-0.5 block">Delivered across studios</span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-2xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search notifications by title, content, or author..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:outline-none focus:bg-white min-h-[40px]"
          />
        </div>

        <select
          value={selectedType}
          onChange={e => { setSelectedType(e.target.value); setCurrentPage(1); }}
          className="min-h-[40px] px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:bg-white capitalize"
        >
          <option value="all">All Types</option>
          <option value="general">General</option>
          <option value="feature">Feature Update</option>
          <option value="maintenance">Maintenance</option>
          <option value="billing">Billing & Mandates</option>
          <option value="security">Security Alert</option>
        </select>

        <select
          value={selectedPriority}
          onChange={e => { setSelectedPriority(e.target.value); setCurrentPage(1); }}
          className="min-h-[40px] px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:bg-white capitalize"
        >
          <option value="all">All Priorities</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
          <option value="low">Low</option>
        </select>

        <select
          value={selectedStatus}
          onChange={e => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
          className="min-h-[40px] px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {paginatedNotifications.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 font-medium bg-white rounded-2xl border border-zinc-200 shadow-2xs">
            No notifications found matching your filter criteria.
          </div>
        ) : (
          paginatedNotifications.map(n => (
            <div key={n.id} className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-2xs hover:border-orange-300 transition-all space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                    n.priority === 'urgent' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    n.priority === 'high' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {n.priority}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-zinc-100 text-zinc-700 border border-zinc-200 uppercase">
                    {n.type}
                  </span>
                  <span className="text-xs text-zinc-400">Target: {n.targetScope}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleStatus(n)}
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase border cursor-pointer ${
                      n.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                    }`}
                  >
                    {n.status}
                  </button>
                  <button
                    onClick={() => {
                      setEditingNotification(n);
                      setFormData({
                        title: n.title,
                        description: n.description,
                        type: n.type,
                        priority: n.priority,
                        targetScope: n.targetScope,
                        status: (n.status === 'archived' ? 'draft' : n.status) as 'draft' | 'published'
                      });
                      setIsAddModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 cursor-pointer"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingNotification(n)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-zinc-900">{n.title}</h3>
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">{n.description}</p>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-100">
                <div className="flex items-center gap-1.5">
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Delivered to {studios.length} studios • Created by {n.createdBy}</span>
                </div>
                <div>{new Date(n.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
            </div>
          ))
        )}

        {/* Pagination */}
        <div className="p-3.5 bg-white border border-zinc-200 rounded-2xl shadow-2xs flex items-center justify-between text-xs text-zinc-500">
          <span>Showing page {currentPage} of {totalPages} ({filteredNotifications.length} announcements)</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  {editingNotification ? 'Edit Platform Broadcast' : 'Dispatch New Notification'}
                </h3>
                <p className="text-xs text-zinc-500">Visible to Studio Owners & Employee Portals</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Broadcast Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData(d => ({ ...d, title: e.target.value }))}
                  placeholder="e.g. Scheduled System Upgrade: Sunday 2:00 AM"
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Detailed Message</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData(d => ({ ...d, description: e.target.value }))}
                  placeholder="Provide complete instructions or details for studio operators..."
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Announcement Type</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData(d => ({ ...d, type: e.target.value as any }))}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl capitalize"
                  >
                    <option value="general">General Update</option>
                    <option value="feature">New Feature</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="billing">Billing & GST</option>
                    <option value="security">Security Alert</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Priority Level</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData(d => ({ ...d, priority: e.target.value as any }))}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl capitalize"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Target Audience</label>
                  <select
                    value={formData.targetScope}
                    onChange={e => setFormData(d => ({ ...d, targetScope: e.target.value as any }))}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  >
                    <option value="all">All Studios & Staff</option>
                    <option value="active_only">Active Subscribers Only</option>
                    <option value="specific_studios">Specific Studios</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData(d => ({ ...d, status: e.target.value as any }))}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold"
                  >
                    <option value="published">Publish Immediately</option>
                    <option value="draft">Save as Draft</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotification}
                className="px-5 py-2 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{editingNotification ? 'Save Changes' : 'Broadcast Message'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingNotification && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-200">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">Delete Notification</h3>
                <p className="text-xs text-zinc-500">Remove broadcast from platform archives</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-1">
              <div><strong>Title:</strong> {deletingNotification.title}</div>
              <div><strong>Type:</strong> {deletingNotification.type}</div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeletingNotification(null)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteNotification}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer active:scale-95"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
