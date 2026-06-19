import React, { useState } from 'react';
import { useAppState } from '../contexts/StateContext';
import { User, UserRole } from '../types';
import { 
  Plus, Search, Filter, Trash2, Edit2, ShieldAlert, CheckCircle, 
  X, Check, Eye, Download, Users, Briefcase, Mail, Phone, Calendar, LogIn 
} from 'lucide-react';
import { Modal } from '../components/Modal';

export const UserManagementPage: React.FC = () => {
  const { 
    currentUser, users, createUser, updateUser, deleteUser, deactivateUser, isLoading 
  } = useAppState();

  const isManager = currentUser?.role === 'Manager';
  const isAdmin = currentUser?.role === 'Admin';

  // State Management
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Sorting
  const [sortField, setSortField] = useState<keyof User>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Row Selection & Bulk Actions
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Modals Toggles
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<User | null>(null);

  // Form Fields State
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('User');
  const [formDept, setFormDept] = useState('Operations');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formModules, setFormModules] = useState<string[]>(['Dashboard']);

  // Error States
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Departments list preconfigured
  const DEPARTMENTS = ['Management', 'Operations', 'Warehouse', 'Compliance', 'Logistics', 'Procurement'];
  const SYSTEM_MODULES = ['Dashboard', 'User Management', 'Permissions', 'Stock Management', 'Reports', 'Reminders', 'Settings'];

  // Sorting Logic
  const handleSort = (field: keyof User) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filter & Search Implementation
  const filteredUsers = users.filter((u) => {
    const searchString = `${u.name} ${u.email} ${u.phone} ${u.department}`.toLowerCase();
    const matchesSearch = searchString.includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    const matchesDept = deptFilter === 'All' || u.department === deptFilter;
    const matchesStatus = statusFilter === 'All' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesDept && matchesStatus;
  }).sort((a, b) => {
    let fieldA = a[sortField];
    let fieldB = b[sortField];

    if (typeof fieldA === 'string' && typeof fieldB === 'string') {
      return sortOrder === 'asc' 
        ? fieldA.localeCompare(fieldB) 
        : fieldB.localeCompare(fieldA);
    }
    return 0;
  });

  // Validation routine
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formName || formName.trim().length < 2) {
      newErrors.name = 'Full Name must be at least 2 characters long.';
    }
    if (!/^\d{10}$/.test(formPhone.replace(/[^0-9]/g, ''))) {
      newErrors.phone = 'Phone number must be exactly 10 digits.';
    }
    if (!/^\S+@\S+\.\S+$/.test(formEmail)) {
      newErrors.email = 'Please provide a valid corporate email format.';
    }
    if (formModules.length === 0) {
      newErrors.modules = 'Select at least 1 authorized module.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Create User Handler
  const handleOpenCreate = () => {
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormRole('User');
    setFormDept('Operations');
    setFormStatus('Active');
    setFormModules(['Dashboard']);
    setErrors({});
    setIsCreateOpen(true);
  };

  const handleSaveCreate = async () => {
    if (!validateForm()) return;
    const cleanPhone = formPhone.replace(/[^0-9]/g, '');
    
    const success = await createUser({
      name: formName,
      phone: cleanPhone,
      email: formEmail,
      role: formRole,
      department: formDept,
      status: formStatus,
      assignedModules: formModules
    });

    if (success) {
      setIsCreateOpen(false);
    }
  };

  // Edit User Handler
  const handleOpenEdit = (user: User) => {
    setActiveUser(user);
    setFormName(user.name);
    setFormPhone(user.phone);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormDept(user.department);
    setFormStatus(user.status);
    setFormModules(user.assignedModules);
    setErrors({});
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!activeUser) return;
    if (!validateForm()) return;

    const success = await updateUser(activeUser.id, {
      name: formName,
      phone: formPhone,
      email: formEmail,
      role: formRole,
      department: formDept,
      status: formStatus,
      assignedModules: formModules
    });

    if (success) {
      setIsEditOpen(false);
      setActiveUser(null);
    }
  };

  // View User Inspector Drawer
  const handleOpenView = (user: User) => {
    setActiveUser(user);
    setIsViewOpen(true);
  };

  // Selection controls
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedUserIds(filteredUsers.map((u) => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Export Mock Trigger
  const handleExport = (format: 'Excel' | 'PDF' | 'CSV') => {
    alert(`[MOCK EXPORT] Commencing system dump. Generated WorkSphere_Employees_Report.${format.toLowerCase()} successfully containing ${filteredUsers.length} records.`);
  };

  return (
    <div className="flex flex-col gap-6 font-sans text-left">
      
      {/* Title block with action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            User Lifecycle Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">Onboard employees, configure system departments, and assign specific operational modules.</p>
        </div>
        
        {/* Only Admin & Manager can onboard employees */}
        {(isAdmin || isManager) && (
          <button
            id="onboard-user-btn"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs hover:shadow-md cursor-pointer transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            Onboard Employee
          </button>
        )}
      </div>

      {/* Database Filter panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row gap-3">
          
          {/* Search field */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              id="user-search-query"
              type="text"
              placeholder="Search by name, email, department, phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-205 rounded-xl text-xs placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all text-slate-800"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter role dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400">Role:</span>
              <select
                id="role-filter-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="All">All</option>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="User">User</option>
              </select>
            </div>

            {/* Filter Department dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400">Dept:</span>
              <select
                id="dept-filter-select"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="All">All Departments</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Filter status dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400">Status:</span>
              <select
                id="status-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="All">All States</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Export data triggers */}
            <div className="relative group">
              <button
                id="export-options-btn"
                className="p-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              >
                <Download className="w-4 h-4 text-slate-400" />
                Export
              </button>
              <div className="absolute right-0 top-11 hidden group-hover:flex flex-col bg-white border border-slate-200 shadow-xl rounded-xl p-1 z-30 w-32">
                <button
                  id="export-excel"
                  onClick={() => handleExport('Excel')}
                  className="px-3 py-1.5 text-xs text-left text-slate-700 hover:bg-slate-50 rounded-lg font-medium cursor-pointer"
                >
                  Excel spreadsheet
                </button>
                <button
                  id="export-pdf"
                  onClick={() => handleExport('PDF')}
                  className="px-3 py-1.5 text-xs text-left text-slate-700 hover:bg-slate-50 rounded-lg font-medium cursor-pointer"
                >
                  Adobe PDF
                </button>
                <button
                  id="export-csv"
                  onClick={() => handleExport('CSV')}
                  className="px-3 py-1.5 text-xs text-left text-slate-700 hover:bg-slate-50 rounded-lg font-medium cursor-pointer"
                >
                  Standard CSV
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Main Database Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-500 text-left min-w-[900px]">
            
            {/* Headers */}
            <thead className="bg-slate-50/75 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400 font-bold select-none">
              <tr>
                <th className="px-6 py-4 w-12 text-center">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 cursor-pointer hover:text-slate-700" onClick={() => handleSort('name')}>
                  Employee
                </th>
                <th className="px-6 py-4 cursor-pointer hover:text-slate-700" onClick={() => handleSort('role')}>
                  Authorization Role
                </th>
                <th className="px-6 py-4 cursor-pointer hover:text-slate-700" onClick={() => handleSort('department')}>
                  Corporate Division
                </th>
                <th className="px-6 py-4 cursor-pointer hover:text-slate-700" onClick={() => handleSort('status')}>
                  Account State
                </th>
                <th className="px-6 py-4">
                  Assigned Panels
                </th>
                <th className="px-6 py-4 text-center">
                  Live Operations
                </th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-slate-150">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const isSelected = selectedUserIds.includes(user.id);
                  return (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-blue-50/15' : ''}`}
                    >
                      {/* Selection Box */}
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(user.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Employee Identity */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 tracking-tight text-xs">
                            {user.name.charAt(0)}
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-slate-900 text-sm">{user.name}</span>
                            <span className="text-[11px] text-slate-400 font-mono">{user.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold ${
                          user.role === 'Admin' 
                            ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                            : user.role === 'Manager' 
                            ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                            : 'bg-blue-50 text-blue-700 border border-blue-105'
                        }`}>
                          {user.role}
                        </span>
                      </td>

                      {/* Division */}
                      <td className="px-6 py-4">
                        <span className="text-slate-700 font-medium">{user.department}</span>
                      </td>

                      {/* State */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                          user.status === 'Active' ? 'text-emerald-600' : 'text-slate-400'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${
                            user.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-350'
                          }`} />
                          {user.status}
                        </span>
                      </td>

                      {/* Assigned Module Badges */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {user.assignedModules.slice(0, 3).map((mod) => (
                            <span key={mod} className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                              {mod}
                            </span>
                          ))}
                          {user.assignedModules.length > 3 && (
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1 rounded">
                              +{user.assignedModules.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Controls Area */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          
                          {/* Inspect Profile */}
                          <button
                            id={`inspect-user-${user.id}`}
                            onClick={() => handleOpenView(user)}
                            className="p-1.5 text-slate-450 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                            title="Inspect Profile credentials"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit permissions - Manager/Admin only. Managers can edit users but not Admins */}
                          {(isAdmin || (isManager && user.role !== 'Admin')) && (
                            <button
                              id={`edit-user-${user.id}`}
                              onClick={() => handleOpenEdit(user)}
                              className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                              title="Modify account privileges"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Deactivate User / Delete - Admin can delete/deactivate, Manager can deactivate */}
                          {(isAdmin || (isManager && user.role !== 'Admin' && user.status === 'Active')) && (
                            <>
                              {user.status === 'Active' ? (
                                <button
                                  id={`deactivate-user-${user.id}`}
                                  onClick={() => deactivateUser(user.id)}
                                  className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg cursor-pointer transition-colors"
                                  title="Deactivate seats"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              ) : null}

                              {isAdmin && (
                                <button
                                  id={`delete-user-${user.id}`}
                                  onClick={() => deleteUser(user.id)}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                  title="Permanently remove records"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-display font-semibold text-slate-800 text-sm">No Employee profiles found</h4>
                        <p className="text-xs text-slate-400 mt-1">Adjust database filters or search queries and re-evaluate.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>

        {/* Database pagination bar mockup */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-150 flex items-center justify-between font-medium text-xs text-slate-500">
          <span>Showing <strong className="text-slate-800">{filteredUsers.length}</strong> of {users.length} enrolled users</span>
          <div className="flex items-center gap-1 text-slate-700 font-semibold select-none">
            <button className="px-3 py-1.5 border border-slate-250 bg-white rounded-lg opacity-50 cursor-not-allowed">Previous</button>
            <button className="px-3 py-1.5 border border-slate-250 bg-white rounded-lg hover:bg-slate-55">Next page</button>
          </div>
        </div>

      </div>

      {/* CREATE ONBOARDS DIALOG */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Onboard Corporate Seat Credentials"
        footerButtons={[
          { label: 'Abrupt Cancellation', onClick: () => setIsCreateOpen(false) },
          { label: 'Register & Launch', onClick: handleSaveCreate, variant: 'primary', isLoading }
        ]}
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-slate-550 leading-relaxed bg-blue-50/50 p-4 border border-blue-100 rounded-xl mb-2">
            <strong>Security Notice:</strong> All created credentials enforce the default passwordless numeric validation loop. Assigned phone numbers authenticate via OTP code <strong>123456</strong>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold text-slate-750">Employee Display Name</label>
              <input
                id="create-form-name"
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Liam Sterling"
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white text-xs font-semibold text-slate-800"
              />
              {errors.name && <span className="text-[10px] text-rose-600 font-semibold">{errors.name}</span>}
            </div>

            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold text-slate-750">Corporate Mobile Number</label>
              <input
                id="create-form-phone"
                type="tel"
                maxLength={10}
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="e.g. 9875550210"
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white text-xs font-semibold text-slate-800"
              />
              {errors.phone && <span className="text-[10px] text-rose-600 font-semibold">{errors.phone}</span>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-semibold text-slate-750">Corporate Email Address</label>
            <input
              id="create-form-email"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="e.g. lsterling@worksphere.co"
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white text-xs font-semibold text-slate-800"
            />
            {errors.email && <span className="text-[10px] text-rose-600 font-semibold">{errors.email}</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold text-slate-750">Authorization Level</label>
              <select
                id="create-form-role"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as UserRole)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none cursor-pointer text-xs font-semibold text-slate-800"
              >
                <option value="User">User (Operational scope)</option>
                <option value="Manager">Manager (Authorized admin scope)</option>
                {isAdmin && <option value="Admin">Admin (Full global core)</option>}
              </select>
            </div>

            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold text-slate-750">Division / Department</label>
              <select
                id="create-form-dept"
                value={formDept}
                onChange={(e) => setFormDept(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none cursor-pointer text-xs font-semibold text-slate-800"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Modules allocation selection */}
          <div className="flex flex-col gap-2 text-left mt-2">
            <label className="text-xs font-semibold text-slate-750">Assigned Workspace Panels</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-4 border border-slate-150 rounded-xl bg-slate-50">
              {SYSTEM_MODULES.map((mod) => {
                const checked = formModules.includes(mod);
                return (
                  <label key={mod} className="flex items-center gap-2 text-xs font-semibold text-slate-650 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        if (checked) {
                          setFormModules((prev) => prev.filter((m) => m !== mod));
                        } else {
                          setFormModules((prev) => [...prev, mod]);
                        }
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    {mod}
                  </label>
                );
              })}
            </div>
            {errors.modules && <span className="text-[10px] text-rose-600 font-semibold">{errors.modules}</span>}
          </div>

        </div>
      </Modal>

      {/* EDIT SEATS DIALOG */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setActiveUser(null);
        }}
        title="Modify Corporate Seat Credentials"
        footerButtons={[
          { label: 'Cancel', onClick: () => setIsEditOpen(false) },
          { label: 'Commit Changes', onClick: handleSaveEdit, variant: 'primary', isLoading }
        ]}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-semibold text-slate-750">Employee Display Name</label>
            <input
              id="edit-form-name"
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white text-xs font-semibold text-slate-800"
            />
            {errors.name && <span className="text-[10px] text-rose-600 font-semibold">{errors.name}</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold text-slate-750">Corporate Mobile Number</label>
              <input
                id="edit-form-phone"
                type="tel"
                maxLength={10}
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value.replace(/[^0-9]/g, ''))}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white text-xs font-semibold text-slate-800"
              />
              {errors.phone && <span className="text-[10px] text-rose-600 font-semibold">{errors.phone}</span>}
            </div>

            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold text-slate-750">Corporate Email Address</label>
              <input
                id="edit-form-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white text-xs font-semibold text-slate-800"
              />
              {errors.email && <span className="text-[10px] text-rose-600 font-semibold">{errors.email}</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold text-slate-750">Account Status State</label>
              <select
                id="edit-form-status"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as 'Active' | 'Inactive')}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none cursor-pointer text-xs font-semibold text-slate-800"
              >
                <option value="Active">Active status</option>
                <option value="Inactive">Inactive status (suspends access)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold text-slate-750">Authorization Level</label>
              <select
                id="edit-form-role"
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as UserRole)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none cursor-pointer text-xs font-semibold text-slate-800"
              >
                <option value="User">User</option>
                <option value="Manager">Manager</option>
                {isAdmin && <option value="Admin">Admin</option>}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-semibold text-slate-750">Division / Department</label>
            <select
              id="edit-form-dept"
              value={formDept}
              onChange={(e) => setFormDept(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none cursor-pointer text-xs font-semibold text-slate-800"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2 text-left mt-2">
            <label className="text-xs font-semibold text-slate-750">Authorized Panels</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-4 border border-slate-150 rounded-xl bg-slate-50">
              {SYSTEM_MODULES.map((mod) => {
                const checked = formModules.includes(mod);
                return (
                  <label key={mod} className="flex items-center gap-2 text-xs font-semibold text-slate-650 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        if (checked) {
                          setFormModules((prev) => prev.filter((m) => m !== mod));
                        } else {
                          setFormModules((prev) => [...prev, mod]);
                        }
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    {mod}
                  </label>
                );
              })}
            </div>
            {errors.modules && <span className="text-[10px] text-rose-600 font-semibold">{errors.modules}</span>}
          </div>
        </div>
      </Modal>

      {/* INSPECT DETAIL MODAL */}
      <Modal
        isOpen={isViewOpen}
        onClose={() => {
          setIsViewOpen(false);
          setActiveUser(null);
        }}
        title="Identity Credentials Inspector"
        footerButtons={[
          { label: 'Close Inspector', onClick: () => setIsViewOpen(false), variant: 'primary' }
        ]}
      >
        {activeUser && (
          <div className="flex flex-col gap-6 text-left">
            
            {/* Identity Profile Header */}
            <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-display font-extrabold text-2xl shadow-lg shadow-blue-100 shrink-0">
                {activeUser.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-display font-extrabold text-slate-900 text-lg tracking-tight">{activeUser.name}</h4>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <span className="font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200">{activeUser.role}</span>
                  <span className="text-slate-400">•</span>
                  <span>IP Sector Enrolled</span>
                </p>
              </div>
            </div>

            {/* Credential items list block */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="p-3.5 bg-slate-50 border border-slate-200/50 rounded-xl flex items-center gap-3">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-400">Email Address</p>
                  <p className="text-xs font-semibold text-slate-800 font-mono mt-0.5">{activeUser.email}</p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200/50 rounded-xl flex items-center gap-3">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-400">Phone Gateway</p>
                  <p className="text-xs font-semibold text-slate-800 font-mono mt-0.5">{activeUser.phone}</p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200/50 rounded-xl flex items-center gap-3">
                <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-400">Department</p>
                  <p className="text-xs font-semibold text-slate-805 mt-0.5">{activeUser.department}</p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200/50 rounded-xl flex items-center gap-3">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-400">Onboarding Date</p>
                  <p className="text-xs font-semibold text-slate-805 font-mono mt-0.5">{activeUser.createdDate}</p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200/50 rounded-xl flex items-center gap-3 sm:col-span-2">
                <LogIn className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-400">Last Verified Session</p>
                  <p className="text-xs font-semibold text-slate-805 font-mono mt-0.5">{activeUser.lastLogin}</p>
                </div>
              </div>

            </div>

            {/* Modules details list */}
            <div className="flex flex-col gap-2.5 mt-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Designated Workspace access Panels</label>
              <div className="flex flex-wrap gap-2">
                {activeUser.assignedModules.map((mod) => (
                  <span key={mod} className="text-xs font-semibold bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl border border-blue-100">
                    {mod}
                  </span>
                ))}
              </div>
            </div>

          </div>
        )}
      </Modal>

    </div>
  );
};
