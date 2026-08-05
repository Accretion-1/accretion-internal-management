import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit2, X, Eye, Users, Phone, MapPin, ShieldCheck, Layers, Trash2, AlertTriangle } from 'lucide-react';
import { Modal } from '../components/Modal';
import { useAppState } from '../contexts/StateContext';
import apiHandler from '../store/api/apiHandler';
import { API_ENDPOINTS } from '../store/api/endpoints';

const EMPTY_FORM = {
    full_name: '',
    phone_number: '',
    role: 'USER',
    location_id: '',
    panel_ids: [],
    is_active: true,
};

const roleLabelMap = {
    ADMIN: 'Admin',
    MANAGER: 'Manager',
    USER: 'User',
};
const ROLE_RANK = {
    USER: 1,
    MANAGER: 2,
    ADMIN: 3,
};

const toApiRole = (role) => String(role || 'USER').toUpperCase();
const toDisplayRole = (role) => roleLabelMap[toApiRole(role)] || 'User';

const normalizePhoneNumber = (phoneNumber) => String(phoneNumber || '').replace(/[^0-9]/g, '');

const normalizeUser = (user) => ({
    ...user,
    id: String(user.user_id),
    name: user.full_name || user.phone_number || 'Unnamed User',
    phone: user.phone_number || '',
    role: toDisplayRole(user.role),
    roleValue: toApiRole(user.role),
    status: user.is_active ? 'Active' : 'Inactive',
    assignedPanels: Array.isArray(user.panels) ? user.panels : [],
    location: user.location || null,
    locationLabel: user.location?.district
        ? `${user.location.district}${user.location.godown ? ` • ${user.location.godown}` : ''}`
        : '-',
});

export const UserManagementPage = () => {
    const { currentUser } = useAppState();
    const isManager = currentUser?.role === 'Manager';
    const isAdmin = currentUser?.role === 'Admin';
    const currentRoleValue = toApiRole(currentUser?.role);
    const canManageUsers = isAdmin || isManager;
    const canManageRole = (targetRole) => (ROLE_RANK[currentRoleValue] || 0) > (ROLE_RANK[toApiRole(targetRole)] || 0);
    const canManageUser = (user) => canManageRole(user?.roleValue || user?.role);

    const [users, setUsers] = useState([]);
    const [panels, setPanels] = useState([]);
    const [locations, setLocations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [activeUser, setActiveUser] = useState(null);
    const [deleteTargetUser, setDeleteTargetUser] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});

    const normalizedUsers = useMemo(() => users.map(normalizeUser), [users]);

    const filteredUsers = useMemo(() => {
        return normalizedUsers
            .filter((user) => {
                const searchString = `${user.name} ${user.phone} ${user.role} ${user.locationLabel}`.toLowerCase();
                const matchesSearch = searchString.includes(searchQuery.toLowerCase());
                const matchesRole = roleFilter === 'All' || user.role === roleFilter;
                const matchesStatus = statusFilter === 'All' || user.status === statusFilter;
                return matchesSearch && matchesRole && matchesStatus;
            })
            .sort((userA, userB) => {
                const locA = userA.locationLabel || '';
                const locB = userB.locationLabel || '';
                const locCompare = locA.localeCompare(locB);
                if (locCompare !== 0) return locCompare;
                return userA.name.localeCompare(userB.name);
            });
    }, [normalizedUsers, roleFilter, searchQuery, statusFilter]);

    const fetchUsers = async () => {
        const response = await apiHandler({ method: 'GET', url: API_ENDPOINTS.USER.BASE });
        setUsers(Array.isArray(response?.data) ? response.data : []);
    };

    const fetchPageData = async () => {
        setIsLoading(true);
        try {
            const [usersResponse, panelsResponse, locationsResponse] = await Promise.all([
                apiHandler({ method: 'GET', url: API_ENDPOINTS.USER.BASE }),
                apiHandler({ method: 'GET', url: API_ENDPOINTS.PANELS.BASE }),
                apiHandler({ method: 'GET', url: API_ENDPOINTS.LOCATIONS.BASE }),
            ]);

            setUsers(Array.isArray(usersResponse?.data) ? usersResponse.data : []);
            setPanels(Array.isArray(panelsResponse?.data) ? panelsResponse.data : []);
            setLocations(Array.isArray(locationsResponse?.data) ? locationsResponse.data : []);
        }
        finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPageData();
    }, []);



    const validateForm = ({ mode }) => {
        const nextErrors = {};
        const cleanPhone = normalizePhoneNumber(form.phone_number);

        if (!form.full_name || form.full_name.trim().length < 2) {
            nextErrors.full_name = 'Full name must be at least 2 characters.';
        }

        if (cleanPhone.length !== 10) {
            nextErrors.phone_number = 'Phone number must be exactly 10 digits.';
        }

        if (mode === 'create' && form.role === 'USER') {
            if (!form.location_id) {
                nextErrors.location_id = 'Location is required for user role.';
            }

            if (!form.panel_ids.length) {
                nextErrors.panel_ids = 'Assign at least one panel for user role.';
            }
        }

        const isUserRole = String(activeUser?.roleValue || activeUser?.role || form.role || '').toUpperCase() === 'USER';
        if (mode === 'edit' && isUserRole) {
            if (!form.location_id) {
                nextErrors.location_id = 'Location is required for user role.';
            }
            if (!form.panel_ids.length) {
                nextErrors.panel_ids = 'Assign at least one panel for user role.';
            }
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const setField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    const togglePanel = (panelId) => {
        setForm((prev) => ({
            ...prev,
            panel_ids: prev.panel_ids.includes(panelId)
                ? prev.panel_ids.filter((id) => id !== panelId)
                : [...prev.panel_ids, panelId],
        }));
        setErrors((prev) => ({ ...prev, panel_ids: undefined }));
    };

    const handleOpenCreate = () => {
        setForm(EMPTY_FORM);
        setErrors({});
        setActiveUser(null);
        setIsCreateOpen(true);
    };

    const handleOpenEdit = (user) => {
        if (!canManageUser(user)) return;
        setActiveUser(user);
        setForm({
            full_name: user.full_name || '',
            phone_number: normalizePhoneNumber(user.phone_number),
            role: user.roleValue,
            location_id: user.location_id || user.location?.location_id || '',
            panel_ids: user.assignedPanels.map((panel) => panel.panel_id),
            is_active: Boolean(user.is_active),
        });
        setErrors({});
        setIsEditOpen(true);
    };

    const handleOpenView = async (user) => {
        setIsSaving(true);
        try {
            const response = await apiHandler({
                method: 'GET',
                url: API_ENDPOINTS.USER.BY_ID(user.user_id),
            });
            setActiveUser(normalizeUser(response?.data || user));
            setIsViewOpen(true);
        }
        finally {
            setIsSaving(false);
        }
    };

    const handleSaveCreate = async () => {
        if (!validateForm({ mode: 'create' })) return;

        setIsSaving(true);
        try {
            const cleanPhone = normalizePhoneNumber(form.phone_number);
            const payload = {
                full_name: form.full_name.trim(),
                phone_number: cleanPhone,
                role: form.role,
                is_active: form.is_active,
                ...(form.role === 'USER'
                    ? { location_id: Number(form.location_id), panel_ids: form.panel_ids }
                    : { location_id: null, panel_ids: [] }),
            };

            const response = await apiHandler({
                method: 'POST',
                url: API_ENDPOINTS.USER.ADD,
                data: payload,
            });

            if (response?.data?.user_id) {
                setUsers((prev) => [response.data, ...prev]);
            }
            else {
                await fetchUsers();
            }

            setIsCreateOpen(false);
            setForm(EMPTY_FORM);
        }
        finally {
            setIsSaving(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!activeUser || !validateForm({ mode: 'edit' })) return;

        setIsSaving(true);
        try {
            const isUserRole = String(activeUser?.roleValue || activeUser?.role || form.role || '').toUpperCase() === 'USER';
            const payload = {
                full_name: form.full_name.trim(),
                phone_number: normalizePhoneNumber(form.phone_number),
                is_active: form.is_active,
                ...(isUserRole
                    ? { location_id: form.location_id ? Number(form.location_id) : null, panel_ids: form.panel_ids }
                    : {}),
            };

            const response = await apiHandler({
                method: 'PUT',
                url: API_ENDPOINTS.USER.UPDATE(activeUser.user_id),
                data: payload,
            });

            if (response?.data?.user_id) {
                setUsers((prev) => prev.map((user) => user.user_id === response.data.user_id ? response.data : user));
            }
            else {
                await fetchUsers();
            }

            setIsEditOpen(false);
            setActiveUser(null);
        }
        finally {
            setIsSaving(false);
        }
    };

    const handleOpenDelete = (user) => {
        if (!canManageUser(user)) return;
        setDeleteTargetUser(user);
    };

    const handleConfirmDelete = async () => {
        if (!deleteTargetUser) return;

        setIsSaving(true);
        try {
            await apiHandler({
                method: 'DELETE',
                url: API_ENDPOINTS.USER.DELETE(deleteTargetUser.user_id),
            });

            setUsers((prev) => prev.filter((user) => user.user_id !== deleteTargetUser.user_id));
            setSelectedUserIds((prev) => prev.filter((id) => id !== String(deleteTargetUser.user_id)));
            setDeleteTargetUser(null);
        }
        finally {
            setIsSaving(false);
        }
    };

    const handleSelectAll = (event) => {
        setSelectedUserIds(event.target.checked ? filteredUsers.map((user) => user.id) : []);
    };

    const handleSelectOne = (id) => {
        setSelectedUserIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
    };

    const renderPanelPicker = ({ disabled = false } = {}) => (
        <div className="flex flex-col gap-2 text-left">
            <label className="text-xs font-semibold text-slate-750">Assigned Panels</label>
            <div className="grid grid-cols-1 gap-2.5 rounded-xl border border-slate-150 bg-slate-50 p-4 sm:grid-cols-2">
                {panels.length > 0 ? panels.map((panel) => {
                    const checked = form.panel_ids.includes(panel.panel_id);
                    return (
                        <label key={panel.panel_id} className={`flex items-center gap-2 text-xs font-semibold text-slate-650 select-none ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                            <input
                                type="checkbox"
                                checked={checked}
                                disabled={disabled}
                                onChange={() => togglePanel(panel.panel_id)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            {panel.panel_name || `Panel ${panel.panel_id}`}
                        </label>
                    );
                }) : (
                    <p className="text-xs font-semibold text-slate-400 sm:col-span-2">No panels available.</p>
                )}
            </div>
            {errors.panel_ids && <span className="text-[10px] font-semibold text-rose-600">{errors.panel_ids}</span>}
        </div>
    );

    return (
        <div className="flex flex-col gap-6 pb-12 text-left font-sans">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h2 className="font-display flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
                        <Users className="h-6 w-6 text-blue-600" />
                        User Management
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">Manage users, phone access, account status, locations, and assigned panels.</p>
                </div>

                {canManageUsers && (
                    <button id="onboard-user-btn" onClick={handleOpenCreate} className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4.5 py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:bg-blue-700 hover:shadow-md">
                        <Plus className="h-4.5 w-4.5" />
                        Add User
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Users</span>
                    <p className="mt-3 text-3xl font-extrabold text-slate-900">{users.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Users</span>
                    <p className="mt-3 text-3xl font-extrabold text-emerald-600">{users.filter((user) => user.is_active).length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Panel Users</span>
                    <p className="mt-3 text-3xl font-extrabold text-blue-600">{users.filter((user) => user.role === 'USER').length}</p>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                <div className="flex flex-col gap-3 lg:flex-row">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                        <input id="user-search-query" type="text" placeholder="Search by name, phone, role, or location..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" />
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
                            <span className="text-[10px] font-bold uppercase text-slate-400">Role:</span>
                            <select id="role-filter-select" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="cursor-pointer bg-transparent text-xs font-semibold text-slate-700 focus:outline-none">
                                <option value="All">All</option>
                                <option value="Admin">Admin</option>
                                <option value="Manager">Manager</option>
                                <option value="User">User</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
                            <span className="text-[10px] font-bold uppercase text-slate-400">Status:</span>
                            <select id="status-filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="cursor-pointer bg-transparent text-xs font-semibold text-slate-700 focus:outline-none">
                                <option value="All">All States</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-left text-sm text-slate-500">
                        <thead className="select-none border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            <tr>
                                <th className="w-12 px-6 py-4 text-center">
                                    <input type="checkbox" onChange={handleSelectAll} checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length} className="cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                </th>
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Location</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Assigned Panels</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-xs font-semibold text-slate-400">Loading users...</td>
                                </tr>
                            ) : filteredUsers.length > 0 ? filteredUsers.map((user) => {
                                const isSelected = selectedUserIds.includes(user.id);
                                return (
                                    <tr key={user.id} className={`transition-colors hover:bg-slate-50/50 ${isSelected ? 'bg-blue-50/15' : ''}`}>
                                        <td className="px-6 py-4 text-center">
                                            <input type="checkbox" checked={isSelected} onChange={() => handleSelectOne(user.id)} className="cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold tracking-tight text-slate-700">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-sm font-semibold text-slate-900">{user.name}</span>
                                                    <span className="flex items-center gap-1 text-[11px] font-mono text-slate-400"><Phone className="h-3 w-3" />{user.phone || '-'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${user.role === 'Admin' ? 'border-rose-100 bg-rose-50 text-rose-700' : user.role === 'Manager' ? 'border-amber-100 bg-amber-50 text-amber-700' : 'border-blue-100 bg-blue-50 text-blue-700'}`}>
                                                <ShieldCheck className="h-3.5 w-3.5" />
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                                            <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" />{user.locationLabel}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${user.status === 'Active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                <span className={`h-2 w-2 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-350'}`} />
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex max-w-xs flex-wrap gap-1">
                                                {user.assignedPanels.length > 0 ? user.assignedPanels.slice(0, 3).map((panel) => (
                                                    <span key={panel.panel_id} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                                                        {panel.panel_name || `Panel ${panel.panel_id}`}
                                                    </span>
                                                )) : <span className="text-[11px] font-semibold text-slate-350">No panels</span>}
                                                {user.assignedPanels.length > 3 && <span className="rounded bg-blue-50 px-1 text-[10px] font-bold text-blue-600">+{user.assignedPanels.length - 3} more</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button id={`inspect-user-${user.id}`} onClick={() => handleOpenView(user)} className="cursor-pointer rounded-lg p-1.5 text-slate-450 transition-colors hover:bg-slate-100 hover:text-slate-800" title="Inspect user">
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                {canManageUser(user) && (
                                                    <button id={`edit-user-${user.id}`} onClick={() => handleOpenEdit(user)} className="cursor-pointer rounded-lg p-1.5 text-blue-500 transition-colors hover:bg-blue-50 hover:text-blue-700" title="Edit user">
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                                {canManageUser(user) && (
                                                    <button id={`delete-user-${user.id}`} onClick={() => handleOpenDelete(user)} disabled={isSaving} className="cursor-pointer rounded-lg p-1.5 text-orange-500 transition-colors disabled:opacity-50 hover:bg-orange-50 hover:text-orange-700" title="Delete user">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Users className="h-6 w-6" /></div>
                                            <div>
                                                <h4 className="font-display text-sm font-semibold text-slate-800">No users found</h4>
                                                <p className="mt-1 text-xs text-slate-400">Adjust filters or add a new user.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between border-t border-slate-150 bg-slate-50 px-6 py-4 text-xs font-medium text-slate-500">
                    <span>Showing <strong className="text-slate-800">{filteredUsers.length}</strong> of {users.length} users</span>
                    <span>{selectedUserIds.length} selected</span>
                </div>
            </div>

            <Modal isOpen={isCreateOpen} onClose={() => !isSaving && setIsCreateOpen(false)} title="Add User" maxWidthClass="max-w-2xl" footerButtons={[
                { label: 'Cancel', onClick: () => setIsCreateOpen(false) },
                { label: 'Create User', onClick: handleSaveCreate, variant: 'primary', isLoading: isSaving },
            ]}>
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5 text-left">
                            <label className="text-xs font-semibold text-slate-750">Full Name</label>
                            <input id="create-form-name" type="text" value={form.full_name} onChange={(event) => setField('full_name', event.target.value)} placeholder="Enter full name" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50" />
                            {errors.full_name && <span className="text-[10px] font-semibold text-rose-600">{errors.full_name}</span>}
                        </div>
                        <div className="flex flex-col gap-1.5 text-left">
                            <label className="text-xs font-semibold text-slate-750">Phone Number</label>
                            <input id="create-form-phone" type="tel" maxLength={10} value={form.phone_number} onChange={(event) => setField('phone_number', event.target.value.replace(/[^0-9]/g, ''))} placeholder="Enter 10-digit phone" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50" />
                            {errors.phone_number && <span className="text-[10px] font-semibold text-rose-600">{errors.phone_number}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5 text-left">
                            <label className="text-xs font-semibold text-slate-750">Role</label>
                            <select id="create-form-role" value={form.role} onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value, location_id: event.target.value === 'USER' ? prev.location_id : '', panel_ids: event.target.value === 'USER' ? prev.panel_ids : [] }))} className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none">
                                <option value="USER">User</option>
                                {canManageRole('MANAGER') && <option value="MANAGER">Manager</option>}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5 text-left">
                            <label className="text-xs font-semibold text-slate-750">Status</label>
                            <select id="create-form-status" value={form.is_active ? 'Active' : 'Inactive'} onChange={(event) => setField('is_active', event.target.value === 'Active')} className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none">
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    {form.role === 'USER' && (
                        <>
                            <div className="flex flex-col gap-1.5 text-left">
                                <label className="text-xs font-semibold text-slate-750">Location</label>
                                <select id="create-form-location" value={form.location_id} onChange={(event) => setField('location_id', event.target.value)} className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none">
                                    <option value="">Select location</option>
                                    {locations.map((location) => (
                                        <option key={location.location_id} value={location.location_id}>{location.district || 'Unnamed'}{location.godown ? ` • ${location.godown}` : ''}</option>
                                    ))}
                                </select>
                                {errors.location_id && <span className="text-[10px] font-semibold text-rose-600">{errors.location_id}</span>}
                            </div>
                            {renderPanelPicker()}
                        </>
                    )}
                </div>
            </Modal>

            <Modal isOpen={isEditOpen} onClose={() => {
                setIsEditOpen(false);
                setActiveUser(null);
            }} title="Update User" maxWidthClass="max-w-2xl" footerButtons={[
                { label: 'Cancel', onClick: () => setIsEditOpen(false) },
                { label: 'Save Changes', onClick: handleSaveEdit, variant: 'primary', isLoading: isSaving },
            ]}>
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5 text-left">
                            <label className="text-xs font-semibold text-slate-750">Full Name</label>
                            <input id="edit-form-name" type="text" value={form.full_name} onChange={(event) => setField('full_name', event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50" />
                            {errors.full_name && <span className="text-[10px] font-semibold text-rose-600">{errors.full_name}</span>}
                        </div>
                        <div className="flex flex-col gap-1.5 text-left">
                            <label className="text-xs font-semibold text-slate-750">Phone Number</label>
                            <input id="edit-form-phone" type="tel" maxLength={10} value={form.phone_number} onChange={(event) => setField('phone_number', event.target.value.replace(/[^0-9]/g, ''))} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-50" />
                            {errors.phone_number && <span className="text-[10px] font-semibold text-rose-600">{errors.phone_number}</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5 text-left">
                            <label className="text-xs font-semibold text-slate-750">Role</label>
                            <input value={activeUser?.role || ''} disabled className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-500" />
                        </div>
                        <div className="flex flex-col gap-1.5 text-left">
                            <label className="text-xs font-semibold text-slate-750">Status</label>
                            <select id="edit-form-status" value={form.is_active ? 'Active' : 'Inactive'} onChange={(event) => setField('is_active', event.target.value === 'Active')} className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none">
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    {(String(activeUser?.roleValue || activeUser?.role || form.role || '').toUpperCase() === 'USER') && (
                        <>
                            <div className="flex flex-col gap-1.5 text-left">
                                <label className="text-xs font-semibold text-slate-750">Location</label>
                                <select id="edit-form-location" value={form.location_id} onChange={(event) => setField('location_id', event.target.value)} className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none">
                                    <option value="">Select location</option>
                                    {locations.map((location) => (
                                        <option key={location.location_id} value={location.location_id}>{location.district || 'Unnamed'}{location.godown ? ` • ${location.godown}` : ''}</option>
                                    ))}
                                </select>
                                {errors.location_id && <span className="text-[10px] font-semibold text-rose-600">{errors.location_id}</span>}
                            </div>
                            {renderPanelPicker()}
                        </>
                    )}
                </div>
            </Modal>

            <Modal isOpen={isViewOpen} onClose={() => {
                setIsViewOpen(false);
                setActiveUser(null);
            }} title="User Details" maxWidthClass="max-w-lg" footerButtons={[
                { label: 'Close', onClick: () => setIsViewOpen(false) },
            ]}>
                {activeUser && (
                    <div className="flex flex-col gap-4">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-lg font-bold text-slate-900">{activeUser.name}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">{activeUser.phone || '-'}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-slate-100 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Role</p><p className="mt-1 text-sm font-semibold text-slate-800">{activeUser.role}</p></div>
                            <div className="rounded-xl border border-slate-100 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Status</p><p className="mt-1 text-sm font-semibold text-slate-800">{activeUser.status}</p></div>
                            <div className="rounded-xl border border-slate-100 p-3 sm:col-span-2">
                                <p className="text-[10px] font-bold uppercase text-slate-400">Location</p>
                                <p className="mt-1 text-sm font-semibold text-slate-800">{activeUser.locationLabel}</p>
                                {activeUser.location && (
                                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-500 sm:grid-cols-3">
                                        <span><strong className="text-slate-700">SLOC:</strong> {activeUser.location.sloc ?? '-'}</span>
                                        <span><strong className="text-slate-700">Capacity:</strong> {activeUser.location.cap ?? '-'}</span>
                                        <span><strong className="text-slate-700">Remark:</strong> {activeUser.location.remark || '-'}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400"><Layers className="h-4 w-4" /> Assigned Panels</p>
                            <div className="flex flex-wrap gap-2">
                                {activeUser.assignedPanels.length > 0 ? activeUser.assignedPanels.map((panel) => (
                                    <span key={panel.panel_id} className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{panel.panel_name || `Panel ${panel.panel_id}`}</span>
                                )) : <span className="text-xs font-semibold text-slate-400">No panels assigned.</span>}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={Boolean(deleteTargetUser)}
                onClose={() => !isSaving && setDeleteTargetUser(null)}
                title="Delete User"
                maxWidthClass="max-w-md"
                footerButtons={[
                    { label: 'Cancel', onClick: () => setDeleteTargetUser(null) },
                    { label: 'Delete User', onClick: handleConfirmDelete, variant: 'primary', isLoading: isSaving },
                ]}
            >
                {deleteTargetUser && (
                    <div className="flex flex-col gap-4 text-left">
                        <div className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-orange-800">
                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                            <div>
                                <p className="text-sm font-bold">Are you sure?</p>
                                <p className="mt-1 text-xs font-medium">
                                    Are you sure you want to delete <span className="font-semibold">{deleteTargetUser.name}</span>? The user will no longer be able to log in.
                                </p>
                            </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">User</p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">{deleteTargetUser.name}</p>
                            <p className="text-xs text-slate-500">{deleteTargetUser.phone || '-'}</p>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
