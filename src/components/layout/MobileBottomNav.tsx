import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  LayoutDashboard, 
  Calendar, 
  BookOpen,
  PlusCircle, 
  Users,
  FileText
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab,
    can,
    isFeatureEnabled
  } = useApp();

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200/90 px-2 py-2 flex items-center justify-around shadow-lg pb-safe">
      {/* 1. Dashboard */}
      {can('dashboard', 'view') && (
        <button
          onClick={() => {
            setActiveTab('dashboard');
            window.location.hash = '#/app/dashboard';
          }}
          className={`flex flex-col items-center justify-center flex-1 min-h-[52px] py-1 transition-transform active:scale-95 cursor-pointer touch-manipulation ${
            activeTab === 'dashboard' ? 'text-orange-600 font-bold' : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <div className="relative inline-flex flex-col items-center">
            <span className="text-xs font-semibold">Dashboard</span>
            {activeTab === 'dashboard' && <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-orange-500 rounded-full" />}
          </div>
        </button>
      )}

      {/* 2. Quotations */}
      {isFeatureEnabled('finance_billing') && can('quotations' as any, 'view') && (
        <button
          onClick={() => {
            setActiveTab('quotations');
            window.location.hash = '#/app/quotations';
          }}
          className={`flex flex-col items-center justify-center flex-1 min-h-[52px] py-1 transition-transform active:scale-95 cursor-pointer touch-manipulation ${
            activeTab === 'quotations' || activeTab === 'create-quotation' ? 'text-orange-600 font-bold' : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <FileText className="w-5 h-5 mb-0.5" />
          <div className="relative inline-flex flex-col items-center">
            <span className="text-xs font-semibold">Quotes</span>
            {(activeTab === 'quotations' || activeTab === 'create-quotation') && <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-orange-500 rounded-full" />}
          </div>
        </button>
      )}

      {/* 3. + New Booking (Elevated Center Button) */}
      {can('bookings' as any, 'create') && (
        <button
          onClick={() => {
            setActiveTab('create-booking');
            window.location.hash = '#/app/bookings/new';
          }}
          className="flex flex-col items-center justify-center flex-1 min-h-[52px] py-1 transition-transform active:scale-95 cursor-pointer group touch-manipulation"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:from-orange-500 group-hover:to-amber-600 transition-all -mt-5 border-2 border-white">
            <PlusCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs text-orange-600 font-bold mt-0.5">New</span>
        </button>
      )}

      {/* 4. Bookings */}
      {can('bookings' as any, 'view') && (
        <button
          onClick={() => {
            setActiveTab('bookings');
            window.location.hash = '#/app/bookings';
          }}
          className={`flex flex-col items-center justify-center flex-1 min-h-[52px] py-1 transition-transform active:scale-95 cursor-pointer touch-manipulation ${
            activeTab === 'bookings' || activeTab === 'history' ? 'text-orange-600 font-bold' : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <BookOpen className="w-5 h-5 mb-0.5" />
          <div className="relative inline-flex flex-col items-center">
            <span className="text-xs font-semibold">Bookings</span>
            {(activeTab === 'bookings' || activeTab === 'history') && <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-orange-500 rounded-full" />}
          </div>
        </button>
      )}

      {/* 5. Crew */}
      {can('team', 'view') && (
        <button
          onClick={() => {
            setActiveTab('crew');
            window.location.hash = '#/app/crew';
          }}
          className={`flex flex-col items-center justify-center flex-1 min-h-[52px] py-1 transition-transform active:scale-95 cursor-pointer touch-manipulation ${
            activeTab === 'crew' || activeTab === 'team' ? 'text-orange-600 font-bold' : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <div className="relative inline-flex flex-col items-center">
            <span className="text-xs font-semibold">Crew</span>
            {(activeTab === 'crew' || activeTab === 'team') && <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-orange-500 rounded-full" />}
          </div>
        </button>
      )}
    </nav>
  );
};
