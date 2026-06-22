import React, { useState } from 'react';
import { useAppState } from '../contexts/StateContext';
import { Reminder, ReminderPriority, ReminderCategory, ReminderRecurrence } from '../types';
import { 
  Clock, Plus, CheckSquare, Bell, Calendar, ClipboardList, 
  UserPlus, AlertOctagon, Trash, RefreshCw, Paperclip, CheckCircle, BellRing
} from 'lucide-react';
import { Modal } from '../components/Modal';

export const ReminderPage: React.FC = () => {
  const { 
    currentUser, users, reminders, createReminder, snoozeReminder, completeReminder, deleteReminder, isLoading 
  } = useAppState();

  const isUserOnly = currentUser?.role === 'User';
  const isAdminOrManager = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';

  // Active filter tab
  const [activeTab, setActiveTab] = useState<'All' | 'Active' | 'Snoozed' | 'Completed'>('Active');
  
  // Create reminder modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<ReminderPriority>('Medium');
  const [category, setCategory] = useState<ReminderCategory>('General');
  const [recurrence, setRecurrence] = useState<ReminderRecurrence>('One-Time');
  const [assignedUsers, setAssignedUsers] = useState<string[]>([]);
  const [attachment, setAttachment] = useState<string>('');

  const [formError, setFormError] = useState('');



  // Filter reminders list
  const filteredReminders = reminders.filter((r) => {
    // If operational user, they can only view duty items assigned to them
    const belongsToMe = isUserOnly ? r.assignedUsers.includes(currentUser?.id || '') : true;
    
    if (!belongsToMe) return false;

    if (activeTab === 'All') return true;
    return r.status === activeTab;
  });

  const handleOpenCreate = () => {
    setTitle('');
    setDescription('');
    setDueDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]); // Tomorrow as default
    setDueTime('09:00');
    setPriority('Medium');
    setCategory('General');
    setRecurrence('One-Time');
    setAssignedUsers([currentUser?.id || '']);
    setAttachment('');
    setFormError('');
    setIsCreateOpen(true);
  };

  const handleSaveReminder = async () => {
    if (!title || title.trim().length < 5) {
      setFormError('Reminder Title must be at least 5 characters.');
      return;
    }
    if (assignedUsers.length === 0) {
      setFormError('Please allocate at least one team member to this task.');
      return;
    }
    setFormError('');

    const success = await createReminder({
      title,
      description,
      date: dueDate,
      time: dueTime,
      priority,
      category,
      assignedUsers,
      recurrence,
      attachments: attachment ? [attachment] : []
    });

    if (success) {
      setIsCreateOpen(false);
    }
  };

  const handleToggleAssignee = (userId: string) => {
    setAssignedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="flex flex-col gap-6 font-sans text-left pb-12">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BellRing className="w-6 h-6 text-blue-600" />
            Reminder Schedule Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">Configure scheduled notifications to be dispatched to designated team members.</p>
        </div>

        {/* Admins & Managers can schedule reminders */}
        {isAdminOrManager && (
          <button
            id="schedule-reminder-btn"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs hover:shadow-md cursor-pointer transition-all shrink-0"
          >
            <Plus className="w-4.5 h-4.5" />
            Schedule New Reminder
          </button>
        )}
      </div>

      {/* Main tab headers rows */}
      <div className="flex justify-between items-center border-b border-slate-200 overflow-x-auto hide-scrollbar">
        <div className="flex gap-4 p-1 whitespace-nowrap">
          {(['Active', 'Snoozed', 'Completed', 'All'] as const).map((tab) => (
            <button
              key={tab}
              id={`reminder-tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab} (
              {tab === 'All' 
                ? reminders.length 
                : reminders.filter(r => r.status === tab).length
              })
            </button>
          ))}
        </div>
      </div>

      {/* Reminder cards list mapping */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredReminders.length > 0 ? (
          filteredReminders.map((rem) => {
            return (
              <div 
                key={rem.id} 
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 flex flex-col justify-between gap-6 transition-all hover:shadow-md hover:scale-[1.01]"
              >
                
                {/* Header identifier info column */}
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                        {rem.recurrence}
                      </span>
                    </div>

                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {rem.time}
                    </span>
                  </div>

                  <div className="text-left select-none">
                    <h4 className={`text-md font-extrabold ${rem.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      {rem.title}
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1.5">{rem.description}</p>
                  </div>
                </div>

                {/* Footers controls indicators */}
                <div className="flex flex-col gap-4 border-t border-slate-100 pt-4 text-xs font-medium">
                  
                  {/* Grid tracking assignee profiles */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Notifications routing to:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {rem.assignedUsers.map((userId) => {
                        const user = users.find(u => u.id === userId);
                        return (
                          <span key={userId} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-750 border border-slate-200/60 rounded-xl text-[11px] font-semibold">
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                            {user ? user.name : 'Unknown Coordinator'}
                          </span>
                        );
                      })}
                    </div>
                  </div>



                  {/* Operational buttons row */}
                  <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-3 pt-1">
                    <div className="flex items-center gap-1 text-slate-505 text-[11px] font-semibold">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      Due Date: <span className="text-slate-800 font-bold font-mono">{rem.date}</span> at <span className="text-slate-805 font-bold font-mono">{rem.time}</span>
                    </div>

                    {/* Operational Action buttons: Snooze, Complete, Delete */}
                    {rem.status !== 'Completed' && (
                      <div className="flex items-center gap-1.5 self-end">
                        
                        {/* Snooze button (only for Active items) */}
                        {rem.status === 'Active' && (
                          <button
                            id={`snooze-reminder-${rem.id}`}
                            onClick={() => snoozeReminder(rem.id)}
                            className="px-3 py-1.5 text-slate-650 hover:bg-slate-100 rounded-lg cursor-pointer border border-slate-200 transition-colors font-semibold text-[11px]"
                          >
                            Snooze 30M
                          </button>
                        )}

                        {/* Complete button */}
                        <button
                          id={`complete-reminder-${rem.id}`}
                          onClick={() => completeReminder(rem.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer shadow-xs transition-colors font-bold text-[11px]"
                        >
                          Resolve Duty
                        </button>

                      </div>
                    )}

                    {/* Admin Delete trigger */}
                    {isAdminOrManager && rem.status === 'Completed' && (
                      <button
                        id={`delete-reminder-${rem.id}`}
                        onClick={() => deleteReminder(rem.id)}
                        className="px-3 py-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors font-bold text-[11px] inline-flex items-center gap-1 border border-rose-100 ml-auto"
                      >
                        <Trash className="w-3.5 h-3.5" /> Remove Log
                      </button>
                    )}

                  </div>

                </div>

              </div>
            );
          })
        ) : (
          <div className="col-span-full py-16 text-center bg-white border border-slate-200 rounded-3xl">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <ClipboardList className="w-6 h-6" />
            </div>
            <h4 className="font-display font-semibold text-slate-800 text-sm">No Reminders allocated here</h4>
            <p className="text-xs text-slate-400 mt-1">Excellent! There are no outstanding schedules on this workspace pipeline.</p>
          </div>
        )}
      </div>

      {/* SCHEDULE DYNAMIC REMINDERS MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Schedule WorkSphere Duty Reminder"
        footerButtons={[
          { label: 'Cancel', onClick: () => setIsCreateOpen(false) },
          { label: 'Launch Schedule Duty', onClick: handleSaveReminder, variant: 'primary', isLoading }
        ]}
      >
        <div className="flex flex-col gap-4 text-left">
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-750">Reminder Title Requirement</label>
            <input
              id="rem-create-title"
              type="text"
              placeholder="e.g. OSHA Safety Certificate Submission"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white text-xs font-semibold text-slate-800"
            />
            {formError && <span className="text-[11px] text-rose-600 font-semibold">{formError}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-750">Detailed Operational instructions</label>
            <textarea
              id="rem-create-desc"
              rows={3}
              placeholder="Detailed guidelines describing key duties to perform..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white text-xs font-medium text-slate-800 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-755">Limit Date</label>
              <input
                id="rem-create-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-xs font-semibold text-slate-805"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-755">Limit Time</label>
              <input
                id="rem-create-time"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-xs font-semibold text-slate-805"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-755">Recurrence Routine</label>
            <select
              id="rem-create-recurrence"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as ReminderRecurrence)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-xs font-semibold text-slate-800 cursor-pointer"
            >
              <option value="One-Time">One-Time Event</option>
              <option value="Daily">Daily Routine</option>
            </select>
          </div>


          {/* User allocation selection Checklist */}
          <div className="flex flex-col gap-2.5 mt-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-750">
              <UserPlus className="w-4 h-4 text-blue-600" />
              Allocate Responsible Staff Members
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-4 border border-slate-150 rounded-xl bg-slate-50 max-h-36 overflow-y-auto">
              {users.map((u) => {
                const checked = assignedUsers.includes(u.id);
                return (
                  <label key={u.id} className="flex items-center gap-2 text-xs font-semibold text-slate-650 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleAssignee(u.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    {u.name}
                  </label>
                );
              })}
            </div>
          </div>

        </div>
      </Modal>

    </div>
  );
};
