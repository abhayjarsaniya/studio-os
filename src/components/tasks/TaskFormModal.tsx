import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TaskStatus, Priority } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({ isOpen, onClose }) => {
  const { events, users, createTask } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventId, setEventId] = useState('');
  const [assignedToId, setAssignedToId] = useState(users[0]?.id || '');
  const [priority, setPriority] = useState<Priority>('High');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<TaskStatus>('Todo');
  const [isDirty, setIsDirty] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a task title');
      return;
    }

    const assignedUser = users.find(u => u.id === assignedToId);
    const linkedEvent = events.find(ev => ev.id === eventId);

    createTask({
      title,
      description,
      eventId: eventId || undefined,
      eventName: linkedEvent ? linkedEvent.name : undefined,
      assignedToId,
      assignedToName: assignedUser ? assignedUser.name : 'Crew Member',
      priority,
      dueDate,
      status
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Studio Task"
      subtitle="Assign workflow and post-production duties to photography crew"
      maxWidth="md"
      isDirty={isDirty}
      confirmMessage="Discard unsaved task details?"
    >
      <form 
        onSubmit={handleSubmit} 
        onChange={() => !isDirty && setIsDirty(true)}
        className="space-y-4"
      >
        <div>
          <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1">
            Task Title *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. SD Card Dual Ingestion & Cloud Backup"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-none min-h-[44px]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1">
            Linked Event / Shoot (Optional)
          </label>
          <select
            value={eventId}
            onChange={e => setEventId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-none min-h-[44px]"
          >
            <option value="">-- Standalone Studio Task --</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev.eventNumber})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1">
              Assignee *
            </label>
            <select
              value={assignedToId}
              onChange={e => setAssignedToId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-none min-h-[44px]"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.roleTitle})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1">
              Due Date *
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white focus:outline-none min-h-[44px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as Priority)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white focus:outline-none min-h-[44px]"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1">
              Initial Status
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as TaskStatus)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white focus:outline-none min-h-[44px]"
            >
              <option value="Todo">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Review">Under Review</option>
              <option value="Done">Done</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1">
            Task Description / Instructions
          </label>
          <textarea
            rows={3}
            placeholder="Detailed instructions for the photographer or video editor..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
        </div>

        <div className="pt-2 border-t border-zinc-100 flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Create Task
          </Button>
        </div>
      </form>
    </Modal>
  );
};
