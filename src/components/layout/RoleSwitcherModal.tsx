import React from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { Modal } from '../ui/Modal';
import { Shield, CheckCircle2, Info } from 'lucide-react';

export const RoleSwitcherModal: React.FC = () => {
  const { isRoleSwitcherOpen, setIsRoleSwitcherOpen, currentRole, setCurrentRole, users } = useApp();

  const rolesList: { role: UserRole; title: string; desc: string; badge: string }[] = [
    {
      role: 'owner',
      title: 'Studio Founder / Creative Director',
      desc: 'Full administrative access: billing, financials, customer records, workflow, team assignments, and system settings.',
      badge: 'Full Access'
    },
    {
      role: 'manager',
      title: 'Studio Operations Manager',
      desc: 'Manages operational schedules, budgets, event timelines, client communication, and crew assignments.',
      badge: 'Operations'
    },
    {
      role: 'lead_photographer',
      title: 'Senior Lead Photographer',
      desc: 'Shoots on-location events, reviews shot lists, logs camera gear, updates event milestones.',
      badge: 'Creative'
    },
    {
      role: 'cinematographer',
      title: 'Lead Cinematographer & Drone Pilot',
      desc: 'Coordinates multi-cam setups, gimbal moves, FPV drone clearances, and raw video ingestion.',
      badge: 'Video'
    },
    {
      role: 'editor',
      title: 'Head of Color Grading & Album Design',
      desc: 'Handles post-production tasks, Lightroom & DaVinci pipelines, client revision requests.',
      badge: 'Post-Prod'
    },
    {
      role: 'client_relations',
      title: 'Client Relations & Bookings',
      desc: 'Manages incoming inquiries, WhatsApp follow-ups, payment reminders, contracts.',
      badge: 'CRM'
    }
  ];

  return (
    <Modal
      isOpen={isRoleSwitcherOpen}
      onClose={() => setIsRoleSwitcherOpen(false)}
      title="Team Perspective Switcher"
      subtitle="Preview Studio OS from different staff perspectives and roles."
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200/80 flex items-start gap-3 text-xs text-amber-900 leading-relaxed">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold">Team Role Preview:</strong> Switch roles below to preview how different team members interact with the dashboard, tasks, shoots, and calendar.
          </div>
        </div>

        <div className="space-y-2">
          {rolesList.map(r => {
            const userForRole = users.find(u => u.role === r.role);
            const isSelected = currentRole === r.role;

            return (
              <div
                key={r.role}
                onClick={() => {
                  setCurrentRole(r.role);
                  setIsRoleSwitcherOpen(false);
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'border-zinc-900 bg-zinc-900/5 shadow-xs ring-1 ring-zinc-900'
                    : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={userForRole?.avatar}
                    alt={userForRole?.name}
                    className="w-10 h-10 rounded-full object-cover border border-zinc-200"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-zinc-900">{userForRole?.name}</span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
                        {r.badge}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-600 mt-0.5 font-medium">{r.title}</div>
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{r.desc}</p>
                  </div>
                </div>

                <div className="shrink-0">
                  {isSelected ? (
                    <CheckCircle2 className="w-5 h-5 text-zinc-900 fill-zinc-900/10" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-zinc-300" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-600" /> Secure Studio Workspace Active
          </span>
          <span className="text-xs text-zinc-400">Production Mode</span>
        </div>
      </div>
    </Modal>
  );
};
