import React, { useState } from 'react';
import { useAppState } from '../contexts/StateContext';
import { TodoItem } from '../types';
import { 
  CheckSquare, Plus, CheckCircle, 
  UserPlus, Trash, RefreshCw
} from 'lucide-react';
import { Modal } from '../components/Modal';

export const TodoPage: React.FC = () => {
  const { 
    currentUser, users, todos, createTodo, completeTodo, deleteTodo, isLoading 
  } = useAppState();

  const isUserOnly = currentUser?.role === 'User';
  const isAdminOrManager = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';

  // Active filter tab
  const [activeTab, setActiveTab] = useState<'All' | 'Active' | 'Completed'>('Active');
  
  // Create modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [assignedUser, setAssignedUser] = useState<string>('');
  const [type, setType] = useState<'One-Time' | 'Daily'>('One-Time');
  const [formError, setFormError] = useState('');

  // Filter list
  const filteredTodos = todos.filter((t) => {
    // Operational user sees only their own tasks
    const belongsToMe = isUserOnly ? t.assignedUser === currentUser?.id : true;
    
    if (!belongsToMe) return false;

    if (activeTab === 'All') return true;
    return t.status === activeTab;
  });

  const handleOpenCreate = () => {
    setTitle('');
    setDescription('');
    setDueDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]); // Tomorrow as default
    setDueTime('09:00');
    setAssignedUser(currentUser?.id || '');
    setType('One-Time');
    setFormError('');
    setIsCreateOpen(true);
  };

  const handleSaveTodo = async () => {
    if (!title || title.trim().length < 5) {
      setFormError('To-Do Title must be at least 5 characters.');
      return;
    }
    if (!assignedUser) {
      setFormError('Please allocate a team member to this task.');
      return;
    }
    setFormError('');

    const success = await createTodo({
      title,
      description,
      date: dueDate,
      time: dueTime,
      assignedUser,
      type
    });

    if (success) {
      setIsCreateOpen(false);
    }
  };

  const getUserName = (id: string) => {
    const u = users.find(u => u.id === id);
    return u ? u.name : 'Unknown User';
  };

  return (
    <div className="flex flex-col gap-6 font-sans text-left pb-12">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-blue-600" />
            To-Dos Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">Assign specific tasks to individual team members.</p>
        </div>

        {/* Admins & Managers can schedule todos */}
        {isAdminOrManager && (
          <button
            id="create-todo-btn"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs hover:shadow-md cursor-pointer transition-all shrink-0"
          >
            <Plus className="w-4.5 h-4.5" />
            Create New To-Do
          </button>
        )}
      </div>

      {/* Main tab headers rows */}
      <div className="flex justify-between items-center border-b border-slate-200 overflow-x-auto hide-scrollbar">
        <div className="flex gap-4 p-1 whitespace-nowrap">
          {(['Active', 'Completed', 'All'] as const).map((tab) => (
            <button
              key={tab}
              id={`todo-tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab} (
              {tab === 'All' 
                ? todos.length 
                : todos.filter(t => t.status === tab).length
              })
            </button>
          ))}
        </div>
      </div>

      {/* Content grid for Todo Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredTodos.length > 0 ? (
          filteredTodos.map((todo) => {
            const isCompleted = todo.status === 'Completed';

            return (
              <div 
                key={todo.id} 
                className={`relative flex flex-col bg-white border rounded-2xl p-5 shadow-xs transition-all duration-300 ${
                  isCompleted ? 'border-slate-200 opacity-60' : 'border-slate-200 hover:shadow-md hover:border-slate-300'
                }`}
              >
                {isCompleted && (
                  <div className="absolute top-4 right-4 text-emerald-500 bg-emerald-50 p-1 rounded-full">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                )}

                <div className="flex flex-col gap-3 flex-1 pr-8">
                  {/* Title & Description */}
                  <div>
                    <h3 className={`font-bold text-sm tracking-tight mb-1 ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                      {todo.title}
                    </h3>
                    {todo.description && (
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                        {todo.description}
                      </p>
                    )}
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-[10px] font-semibold text-slate-600">
                      <span>{todo.type}</span>
                    </div>

                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-[10px] font-semibold text-slate-600">
                      <span>{todo.date} at {todo.time}</span>
                    </div>
                  </div>

                  {/* Assigned User */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">
                        {getUserName(todo.assignedUser).charAt(0)}
                      </div>
                      <span>{getUserName(todo.assignedUser)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions bottom bar */}
                {!isCompleted && isAdminOrManager && (
                  <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => completeTodo(todo.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Complete
                    </button>
                    <button
                      onClick={() => deleteTodo(todo.id)}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                      title="Delete To-Do"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Users only mark completion */}
                {!isCompleted && isUserOnly && (
                  <div className="flex items-center mt-5 pt-3 border-t border-slate-100">
                     <button
                      onClick={() => completeTodo(todo.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Mark Completed
                    </button>
                  </div>
                )}

              </div>
            );
          })
        ) : (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-white border border-slate-200 border-dashed rounded-2xl">
            <div className="w-14 h-14 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
              <CheckSquare className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800">No To-Dos found in this view</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Adjust your filters or assign new tasks to the team to see them populate here.
            </p>
          </div>
        )}
      </div>

      {/* CREATE TODO MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New To-Do Task"
        footerButtons={[
          { label: 'Cancel', onClick: () => setIsCreateOpen(false) },
          { label: 'Schedule To-Do', onClick: handleSaveTodo, variant: 'primary', isLoading }
        ]}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-semibold text-slate-750">Task Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-50 text-sm font-medium"
            />
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-semibold text-slate-750">Detailed Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Any specific instructions..."
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-50 text-sm font-medium resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold text-slate-750">Target Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-50 text-sm font-medium"
              />
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold text-slate-750">Target Time</label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-50 text-sm font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold text-slate-750">Recurrence</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'One-Time' | 'Daily')}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none cursor-pointer text-sm font-medium text-slate-800"
              >
                <option value="One-Time">One-Time Only</option>
                <option value="Daily">Daily Routine</option>
              </select>
            </div>

             <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold text-slate-750">Assign To</label>
              <select
                value={assignedUser}
                onChange={(e) => setAssignedUser(e.target.value)}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none cursor-pointer text-sm font-medium text-slate-800"
              >
                <option value="" disabled>Select User</option>
                {users.filter(u => u.status === 'Active').map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-xs font-bold mt-2">
              {formError}
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
};
