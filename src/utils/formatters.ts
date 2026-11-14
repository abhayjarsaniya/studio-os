import { EventCategory, EventStatus, Priority } from '../types';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${minutes} ${ampm}`;
}

export function getCategoryBadgeColor(category: string): string {
  const map: Record<string, string> = {
    'Wedding': 'bg-rose-50 text-rose-700 border-rose-200',
    'Pre-Wedding': 'bg-pink-50 text-pink-700 border-pink-200',
    'Engagement': 'bg-amber-50 text-amber-700 border-amber-200',
    'Reception': 'bg-purple-50 text-purple-700 border-purple-200',
    'Haldi': 'bg-yellow-50 text-yellow-800 border-yellow-300',
    'Mehndi': 'bg-emerald-50 text-emerald-800 border-emerald-200',
    'Sangeet': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Birthday': 'bg-orange-50 text-orange-700 border-orange-200',
    'Baby Shower': 'bg-teal-50 text-teal-700 border-teal-200',
    'Maternity': 'bg-violet-50 text-violet-700 border-violet-200',
    'Newborn': 'bg-sky-50 text-sky-700 border-sky-200',
    'Corporate Event': 'bg-blue-50 text-blue-700 border-blue-200',
    'Corporate': 'bg-blue-50 text-blue-700 border-blue-200',
    'Product Photography': 'bg-zinc-100 text-zinc-800 border-zinc-200',
    'Product Shoot': 'bg-zinc-100 text-zinc-800 border-zinc-200',
    'Fashion Photography': 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    'Fashion Shoot': 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    'School Event': 'bg-cyan-50 text-cyan-700 border-cyan-200',
    'College Event': 'bg-blue-50 text-blue-800 border-blue-200',
    'Anniversary': 'bg-red-50 text-red-700 border-red-200',
    'Family Photoshoot': 'bg-lime-50 text-lime-800 border-lime-200',
    'Family Shoot': 'bg-lime-50 text-lime-800 border-lime-200',
    'Religious Event': 'bg-amber-100 text-amber-900 border-amber-300',
    'Portfolio Shoot': 'bg-purple-100 text-purple-800 border-purple-300',
    'Drone Photography': 'bg-sky-100 text-sky-800 border-sky-300',
    'Cinematography': 'bg-rose-100 text-rose-800 border-rose-300',
    'Exhibition': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'Conference': 'bg-slate-100 text-slate-800 border-slate-300',
    'Custom Event': 'bg-zinc-100 text-zinc-700 border-zinc-300'
  };
  return map[category] || 'bg-zinc-100 text-zinc-700 border-zinc-200';
}

export function getStatusBadgeColor(status: EventStatus): string {
  switch (status) {
    case 'Enquiry':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Tentative':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Confirmed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold';
    case 'In Progress':
    case 'Shooting':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse';
    case 'On Hold':
    case 'Under Review':
      return 'bg-yellow-50 text-yellow-800 border-yellow-200';
    case 'Completed':
    case 'Delivered':
      return 'bg-teal-50 text-teal-800 border-teal-200 font-semibold';
    case 'Cancelled':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'Draft':
    case 'Post-Production':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    default:
      return 'bg-zinc-100 text-zinc-600 border-zinc-200';
  }
}

export function getPriorityBadgeColor(priority: Priority): string {
  switch (priority) {
    case 'Urgent':
      return 'bg-red-100 text-red-800 font-semibold';
    case 'High':
      return 'bg-orange-100 text-orange-800';
    case 'Medium':
      return 'bg-blue-100 text-blue-800';
    case 'Low':
      return 'bg-zinc-100 text-zinc-700';
  }
}
