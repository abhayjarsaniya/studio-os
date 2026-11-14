import React, { useState } from 'react';
import { Task } from '../../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Lock 
} from 'lucide-react';

interface TaskCalendarViewProps {
  tasks: Task[];
  onSelectTask: (taskId: string) => void;
}

export const TaskCalendarView: React.FC<TaskCalendarViewProps> = ({
  tasks,
  onSelectTask
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const getTasksForDay = (day: number) => {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(t => t.dueDate === dayStr);
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-xs overflow-hidden flex flex-col">
      {/* Month Navigation */}
      <div className="p-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-bold text-zinc-900">
            {monthNames[month]} {year}
          </h3>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Header */}
      <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50/60 text-center text-xs font-bold text-zinc-500 py-2.5">
        <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
      </div>

      {/* Day Cells Grid */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-zinc-200/80 min-h-[500px]">
        {days.map((day, idx) => {
          if (!day) {
            return <div key={`empty_${idx}`} className="bg-zinc-50/40 p-2 min-h-[90px]" />;
          }

          const dayTasks = getTasksForDay(day);
          const isToday = 
            day === new Date().getDate() && 
            month === new Date().getMonth() && 
            year === new Date().getFullYear();

          return (
            <div
              key={`day_${day}`}
              className={`p-2 min-h-[90px] flex flex-col justify-between transition-colors ${
                isToday ? 'bg-indigo-50/30' : 'bg-white hover:bg-zinc-50/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                  isToday ? 'bg-indigo-600 text-white' : 'text-zinc-700'
                }`}>
                  {day}
                </span>
                {dayTasks.length > 0 && (
                  <span className="text-[10px] font-semibold text-zinc-400">
                    {dayTasks.length} tasks
                  </span>
                )}
              </div>

              <div className="space-y-1 overflow-y-auto max-h-24 scrollbar-none">
                {dayTasks.map(t => (
                  <div
                    key={t.id}
                    onClick={() => onSelectTask(t.id)}
                    className="p-1.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[10px] font-medium truncate cursor-pointer transition-colors flex items-center justify-between gap-1"
                    title={t.title}
                  >
                    <span className="truncate">{t.title}</span>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      t.status === 'Completed' || t.status === 'Done' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
