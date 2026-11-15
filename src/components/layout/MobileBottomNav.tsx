import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  LayoutDashboard, 
  Calendar, 
  BookOpen,
  PlusCircle, 
  Users
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab
  } = useApp();

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200/90 px-2 py-2 flex items-center justify-around shadow-lg pb-safe">
      {/* 1. Dashboard */}
      <button
        onClick={() => {
          setActiveTab('dashboard');
          window.location.hash = '#/app/dashboard';
        }}
        className={`flex flex-col items-center justify-center flex-1 min-h-[52px] py-1 transition-transform active:scale-95 cursor-pointer touch-manipulation ${
          activeTab === 'dashboard' ? 'text-zinc-900 font-bold' : 'text-zinc-400 hover:text-zinc-600'
        }`}
      >
        <LayoutDashboard className="w-5 h-5 mb-1" />
        <span className="text-[11px]">Dashboard</span>
      </button>

      {/* 2. Calendar */}
      <button
        onClick={() => {
          setActiveTab('calendar');
          window.location.hash = '#/app/calendar';
        }}
        className={`flex flex-col items-center justify-center flex-1 min-h-[52px] py-1 transition-transform active:scale-95 cursor-pointer touch-manipulation ${
          activeTab === 'calendar' ? 'text-zinc-900 font-bold' : 'text-zinc-400 hover:text-zinc-600'
        }`}
      >
        <Calendar className="w-5 h-5 mb-1" />
        <span className="text-[11px]">Calendar</span>
      </button>

      {/* 3. + New Booking (Elevated Center Button) */}
      <button
        onClick={() => {
          setActiveTab('create-booking');
          window.location.hash = '#/app/bookings/new';
        }}
        className="flex flex-col items-center justify-center flex-1 min-h-[52px] py-1 transition-transform active:scale-95 cursor-pointer group touch-manipulation"
      >
        <div className="w-12 h-12 rounded-full bg-zinc-900 text-white flex items-center justify-center shadow-lg group-hover:bg-zinc-800 transition-colors -mt-5 border-2 border-white">
          <PlusCircle className="w-6 h-6 text-emerald-400" />
        </div>
        <span className="text-[11px] text-zinc-900 font-bold mt-1">New</span>
      </button>

      {/* 4. Bookings */}
      <button
        onClick={() => {
          setActiveTab('bookings');
          window.location.hash = '#/app/bookings';
        }}
        className={`flex flex-col items-center justify-center flex-1 min-h-[52px] py-1 transition-transform active:scale-95 cursor-pointer touch-manipulation ${
          activeTab === 'bookings' || activeTab === 'history' ? 'text-amber-700 font-bold' : 'text-zinc-400 hover:text-zinc-600'
        }`}
      >
        <BookOpen className="w-5 h-5 mb-1" />
        <span className="text-[11px]">Bookings</span>
      </button>

      {/* 5. Crew */}
      <button
        onClick={() => {
          setActiveTab('crew');
          window.location.hash = '#/app/crew';
        }}
        className={`flex flex-col items-center justify-center flex-1 min-h-[52px] py-1 transition-transform active:scale-95 cursor-pointer touch-manipulation ${
          activeTab === 'crew' || activeTab === 'team' ? 'text-indigo-700 font-bold' : 'text-zinc-400 hover:text-zinc-600'
        }`}
      >
        <Users className="w-5 h-5 mb-1" />
        <span className="text-[11px]">Crew</span>
      </button>
    </nav>
  );
};
