import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CalendarDays,
    CheckCircle,
    CheckSquare,
    Clock,
    ClipboardList,
    MapPin,
    Eye,
    Pencil,
    Plus,
    RefreshCw,
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { useAppState } from '../contexts/StateContext';
import apiHandler from '../store/api/apiHandler';
import { API_ENDPOINTS } from '../store/api/endpoints';

const EMPTY_FORM = {
    type: 'checkbox',
    schedule: 'daily',
    title: '',
    description: '',
    location_ids: [],
    due_time: '09:00',
    start_date: '',
    day_of_week: '',
    day_of_month: '',
    is_active: true,
};

const TODO_TYPES = [
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'stock', label: 'Stock' },
    { value: 'photo', label: 'Photo' },
    { value: 'video', label: 'Video' },
];

const TODO_SCHEDULES = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'single', label: 'Single' },
];

const WEEK_DAYS = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 7, label: 'Sunday' },
];

const formatTime = (value) => {
    if (!value) return 'Any time';
    return String(value).slice(0, 5);
};

const getLocationLabel = (location) => {
    if (!location) return '-';
    return [location.district, location.godown, location.sloc].filter(Boolean).join(' • ') || '-';
};

const getTodoLocations = (todo) => (
    Array.isArray(todo.locations) && todo.locations.length
        ? todo.locations
        : [todo.location].filter(Boolean)
);

const getDateInputValue = (value) => {
    if (!value) return '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const localDateToUtcISOString = (value) => {
    if (!value || !isValidDateValue(value)) return null;

    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day).toISOString();
};

const formatDate = (value) => {
    const dateValue = getDateInputValue(value);
    if (!dateValue) return '-';

    const [year, month, day] = dateValue.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

const getTodayDateValue = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const isValidDateValue = (value) => {
    if (!value) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
};

const normalizeTodoPayload = (form) => {
    const payload = {
        type: form.type,
        schedule: form.schedule,
        title: form.title.trim(),
        description: form.description.trim() || null,
        location_ids: form.location_ids.map((locationId) => Number(locationId)),
        due_time: form.due_time || null,
        start_date: localDateToUtcISOString(form.start_date),
        is_active: true,
    };

    if (form.schedule === 'weekly') {
        payload.day_of_week = Number(form.day_of_week);
    }

    if (form.schedule === 'monthly') {
        payload.day_of_month = Number(form.day_of_month);
    }

    return payload;
};

const normalizeTodoUpdatePayload = (form) => {
    const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        schedule: form.schedule,
        location_ids: form.location_ids.map((locationId) => Number(locationId)),
        start_date: localDateToUtcISOString(form.start_date),
        is_active: Boolean(form.is_active),
    };

    if (form.schedule === 'weekly') {
        payload.day_of_week = Number(form.day_of_week);
    }

    if (form.schedule === 'monthly') {
        payload.day_of_month = Number(form.day_of_month);
    }

    return payload;
};

export const TodoPage = () => {
    const { currentUser } = useAppState();
    const navigate = useNavigate();
    const [todos, setTodos] = useState([]);
    const [locations, setLocations] = useState([]);
    const [statusFilter, setStatusFilter] = useState('active');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingTodo, setEditingTodo] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});

    const isAdminOrManager = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';
    const isEditMode = Boolean(editingTodo);

    const fetchTodos = async () => {
        setIsLoading(true);
        try {
            const response = await apiHandler({
                method: 'GET',
                url: API_ENDPOINTS.TODOS.BASE,
            });
            setTodos(Array.isArray(response?.data) ? response.data : []);
        }
        finally {
            setIsLoading(false);
        }
    };

    const fetchLocations = async () => {
        const response = await apiHandler({
            method: 'GET',
            url: API_ENDPOINTS.LOCATIONS.BASE,
        });
        setLocations(Array.isArray(response?.data) ? response.data : []);
    };

    useEffect(() => {
        fetchTodos();
    }, []);

    useEffect(() => {
        fetchLocations();
    }, []);

    const filteredTodos = useMemo(() => {
        if (statusFilter === 'all') return todos;
        if (statusFilter === 'inactive') return todos.filter((todo) => !todo.is_active);
        return todos.filter((todo) => todo.is_active);
    }, [statusFilter, todos]);

    const validateForm = () => {
        const nextErrors = {};

        if (!form.title.trim() || form.title.trim().length < 2) {
            nextErrors.title = 'Title must be at least 2 characters.';
        }

        if (!isEditMode && !form.type) {
            nextErrors.type = 'Task type is required.';
        }

        if (!form.schedule) {
            nextErrors.schedule = 'Schedule is required.';
        }

        if (!form.location_ids.length) {
            nextErrors.location_ids = 'At least one location is required.';
        }

        if (!form.start_date) {
            nextErrors.start_date = 'Start date is required.';
        } else if (!isValidDateValue(form.start_date)) {
            nextErrors.start_date = 'Select a valid start date.';
        } else if (form.start_date && form.start_date < getTodayDateValue()) {
            nextErrors.start_date = 'Start date cannot be a previous date.';
        }

        if (!isEditMode && !form.due_time) {
            nextErrors.due_time = 'Due time is required.';
        }

        if (form.schedule === 'weekly' && !form.day_of_week) {
            nextErrors.day_of_week = 'Day of week is required for weekly tasks.';
        }

        if (form.schedule === 'monthly' && !form.day_of_month) {
            nextErrors.day_of_month = 'Day of month is required for monthly tasks.';
        } else if (
            form.schedule === 'monthly' &&
            (Number(form.day_of_month) < 1 || Number(form.day_of_month) > 31)
        ) {
            nextErrors.day_of_month = 'Day of month must be between 1 and 31.';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleChange = (field, value) => {
        setForm((prev) => {
            const next = { ...prev, [field]: value };

            if (field === 'schedule') {
                next.day_of_week = '';
                next.day_of_month = '';
            }

            return next;
        });
        setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    const handleLocationToggle = (locationId) => {
        setForm((prev) => {
            const locationIdValue = String(locationId);
            const nextLocationIds = prev.location_ids.includes(locationIdValue)
                ? prev.location_ids.filter((existingLocationId) => existingLocationId !== locationIdValue)
                : [...prev.location_ids, locationIdValue];

            return {
                ...prev,
                location_ids: nextLocationIds,
            };
        });
        setErrors((prev) => ({ ...prev, location_ids: undefined }));
    };

    const handleOpenCreate = () => {
        setEditingTodo(null);
        setForm({ ...EMPTY_FORM });
        setErrors({});
        setIsCreateOpen(true);
    };

    const handleOpenEdit = (todo) => {
        const todoLocations = getTodoLocations(todo);

        setEditingTodo(todo);
        setForm({
            ...EMPTY_FORM,
            type: todo.type || EMPTY_FORM.type,
            schedule: todo.schedule || EMPTY_FORM.schedule,
            title: todo.title || '',
            description: todo.description || '',
            location_ids: todoLocations.map((location) => String(location.location_id)).filter(Boolean),
            due_time: todo.due_time ? String(todo.due_time).slice(0, 5) : EMPTY_FORM.due_time,
            start_date: getDateInputValue(todo.start_date),
            day_of_week: todo.day_of_week ? String(todo.day_of_week) : '',
            day_of_month: todo.day_of_month ? String(todo.day_of_month) : '',
            is_active: Boolean(todo.is_active),
        });
        setErrors({});
        setIsCreateOpen(true);
    };

    const handleCloseCreate = () => {
        if (isSaving) return;
        setIsCreateOpen(false);
        setEditingTodo(null);
        setErrors({});
    };

    const handleSaveTodo = async () => {
        if (!isAdminOrManager || !validateForm()) return;

        setIsSaving(true);
        try {
            await apiHandler({
                method: 'POST',
                url: API_ENDPOINTS.TODOS.ADD,
                data: normalizeTodoPayload(form),
            });

            await fetchTodos();

            setIsCreateOpen(false);
            setErrors({});
        }
        finally {
            setIsSaving(false);
        }
    };

    const handleUpdateTodo = async () => {
        if (!isAdminOrManager || !editingTodo || !validateForm()) return;

        setIsSaving(true);
        try {
            await apiHandler({
                method: 'PUT',
                url: API_ENDPOINTS.TODOS.UPDATE(editingTodo.todo_id),
                data: normalizeTodoUpdatePayload(form),
            });

            await fetchTodos();

            setIsCreateOpen(false);
            setEditingTodo(null);
            setErrors({});
        }
        finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 pb-12 text-left font-sans">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="font-display flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
                        <CheckSquare className="h-6 w-6 text-blue-600" />
                        To-Dos Management
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">Create and monitor location-based operational tasks.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        id="refresh-todos-btn"
                        onClick={fetchTodos}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-xs transition-all hover:bg-slate-50"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>

                    {isAdminOrManager && (
                        <button
                            id="create-todo-btn"
                            onClick={handleOpenCreate}
                            className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4.5 py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:bg-blue-700 hover:shadow-md"
                        >
                            <Plus className="h-4.5 w-4.5" />
                            Create New To-Do
                        </button>
                    )}
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Filter by Status</label>
                        <select
                            id="todo-status-filter"
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value)}
                            className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                        >
                            <option value="active">Active todos</option>
                            <option value="inactive">Inactive todos</option>
                            <option value="all">All todos</option>
                        </select>
                    </div>

                    {statusFilter !== 'active' && (
                        <button
                            id="clear-todo-status-filter"
                            type="button"
                            onClick={() => setStatusFilter('active')}
                            className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50"
                        >
                            Clear Filter
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-4">
                {isLoading ? (
                    <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-sm font-semibold text-slate-400">
                        Loading To-Dos...
                    </div>
                ) : filteredTodos.length > 0 ? (
                    filteredTodos.map((todo) => {
                        const todoLocations = getTodoLocations(todo);
                        const visibleLocations = todoLocations.slice(0, 4);
                        const hiddenLocationCount = Math.max(todoLocations.length - visibleLocations.length, 0);

                        return (
                            <div key={todo.todo_id} className="relative rounded-3xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-300 hover:border-slate-300 hover:shadow-md">
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-base font-extrabold tracking-tight text-slate-900">{todo.title}</h3>
                                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${todo.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                    {todo.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            {todo.description && (
                                                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{todo.description}</p>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-bold capitalize text-blue-700">
                                                <ClipboardList className="h-3.5 w-3.5" />
                                                {todo.type}
                                            </div>
                                            <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold capitalize text-slate-600">
                                                <RefreshCw className="h-3.5 w-3.5" />
                                                {todo.schedule}
                                            </div>
                                            <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                                                <Clock className="h-3.5 w-3.5" />
                                                {formatTime(todo.due_time)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                                Locations
                                            </div>
                                            {hiddenLocationCount > 0 && (
                                                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold text-blue-700">
                                                    +{hiddenLocationCount} more
                                                </span>
                                            )}
                                        </div>
                                        <ul className="grid grid-cols-1 gap-1.5 text-xs font-bold leading-relaxed text-slate-700 md:grid-cols-2">
                                            {visibleLocations.map((location) => (
                                                <li key={location.todo_location_id || location.location_id} className="flex gap-2">
                                                    <span className="text-blue-500">•</span>
                                                    <span>{getLocationLabel(location)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <CalendarDays className="h-4 w-4 text-slate-400" />
                                                <span>{formatDate(todo.start_date)}</span>
                                            </div>
                                            {(todo.day_of_week || todo.day_of_month) && (
                                                <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                                                    {todo.day_of_week ? `Weekly on ${WEEK_DAYS.find((day) => day.value === Number(todo.day_of_week))?.label || `Day ${todo.day_of_week}`}` : ''}
                                                    {todo.day_of_month ? `Monthly on day ${todo.day_of_month}` : ''}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                                            {isAdminOrManager && (
                                                <button
                                                    id={`edit-todo-${todo.todo_id}`}
                                                    onClick={() => handleOpenEdit(todo)}
                                                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-700 transition-all hover:bg-slate-50 sm:w-auto"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                    Edit
                                                </button>
                                            )}
                                            <button
                                                id={`view-todo-${todo.todo_id}`}
                                                onClick={() => navigate(`/todos/${todo.todo_id}`)}
                                                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-xs font-extrabold text-blue-700 transition-all hover:bg-blue-100 sm:w-auto"
                                            >
                                                <Eye className="h-4 w-4" />
                                                View Details
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                            <CheckCircle className="h-6 w-6" />
                        </div>
                        <h4 className="font-bold text-slate-800">No To-Dos found in this view</h4>
                        <p className="mt-1 max-w-sm text-xs text-slate-500">
                            {isAdminOrManager
                                ? 'Create a location-based task to start tracking operational work.'
                                : 'No tasks are available for your current view.'}
                        </p>
                    </div>
                )}
            </div>

            <Modal
                isOpen={isCreateOpen}
                onClose={handleCloseCreate}
                title={isEditMode ? 'Update To-Do Task' : 'Create New To-Do Task'}
                maxWidthClass="max-w-3xl"
                footerButtons={[
                    { label: 'Cancel', onClick: handleCloseCreate },
                    {
                        label: isEditMode ? 'Update To-Do' : 'Schedule To-Do',
                        onClick: isEditMode ? handleUpdateTodo : handleSaveTodo,
                        variant: 'primary',
                        isLoading: isSaving,
                    },
                ]}
            >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-600">Task Title</label>
                        <input
                            value={form.title}
                            onChange={(event) => handleChange('title', event.target.value)}
                            placeholder="Enter task title"
                            className={`rounded-xl border bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${errors.title ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-blue-100'}`}
                        />
                        {errors.title && <span className="text-xs text-rose-600">{errors.title}</span>}
                    </div>

                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-600">Description</label>
                        <textarea
                            value={form.description}
                            onChange={(event) => handleChange('description', event.target.value)}
                            rows={3}
                            placeholder="Add optional instructions"
                            className="resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Task Type</label>
                        <select
                            value={form.type}
                            onChange={(event) => handleChange('type', event.target.value)}
                            disabled={isEditMode}
                            className={`cursor-pointer rounded-xl border bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${errors.type ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-blue-100'}`}
                        >
                            {TODO_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                        </select>
                        {isEditMode && <span className="text-xs font-semibold text-slate-400">Task type cannot be changed after creation.</span>}
                        {errors.type && <span className="text-xs text-rose-600">{errors.type}</span>}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Schedule</label>
                        <select
                            value={form.schedule}
                            onChange={(event) => handleChange('schedule', event.target.value)}
                            className={`cursor-pointer rounded-xl border bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${errors.schedule ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-blue-100'}`}
                        >
                            {TODO_SCHEDULES.map((schedule) => <option key={schedule.value} value={schedule.value}>{schedule.label}</option>)}
                        </select>
                        {errors.schedule && <span className="text-xs text-rose-600">{errors.schedule}</span>}
                    </div>

                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-600">Locations</label>
                        <div className={`grid max-h-44 grid-cols-1 gap-2 overflow-y-auto rounded-xl border bg-slate-50 p-2 ${errors.location_ids ? 'border-rose-300' : 'border-slate-200'}`}>
                            {locations.length > 0 ? (
                                locations.map((location) => {
                                    const locationId = String(location.location_id);
                                    const isSelected = form.location_ids.includes(locationId);

                                    return (
                                        <label
                                            key={location.location_id}
                                            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-xs font-bold transition-all ${isSelected ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleLocationToggle(locationId)}
                                                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                                            />
                                            <span>{getLocationLabel(location)}</span>
                                        </label>
                                    );
                                })
                            ) : (
                                <p className="px-3 py-2 text-xs font-semibold text-slate-400">No locations available.</p>
                            )}
                        </div>
                        {errors.location_ids && <span className="text-xs text-rose-600">{errors.location_ids}</span>}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-600">Start Date</label>
                        <input
                            type="date"
                            min={getTodayDateValue()}
                            value={form.start_date}
                            onChange={(event) => handleChange('start_date', event.target.value)}
                            className={`rounded-xl border bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${errors.start_date ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-blue-100'}`}
                        />
                        {errors.start_date && <span className="text-xs text-rose-600">{errors.start_date}</span>}
                    </div>

                    {!isEditMode && (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-600">Due Time</label>
                            <input
                                type="time"
                                value={form.due_time}
                                onChange={(event) => handleChange('due_time', event.target.value)}
                                className={`rounded-xl border bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${errors.due_time ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-blue-100'}`}
                            />
                            {errors.due_time && <span className="text-xs text-rose-600">{errors.due_time}</span>}
                        </div>
                    )}

                    {isEditMode && (
                        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                            <span>
                                <span className="block text-xs font-bold text-slate-600">Todo Status</span>
                                <span className="block text-xs font-semibold text-slate-400">Toggle active or inactive</span>
                            </span>
                            <input
                                type="checkbox"
                                checked={form.is_active}
                                onChange={(event) => handleChange('is_active', event.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                            />
                        </label>
                    )}

                    {form.schedule === 'weekly' && (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-600">Day of Week</label>
                            <select
                                value={form.day_of_week}
                                onChange={(event) => handleChange('day_of_week', event.target.value)}
                                className={`cursor-pointer rounded-xl border bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${errors.day_of_week ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-blue-100'}`}
                            >
                                <option value="">Select day</option>
                                {WEEK_DAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
                            </select>
                            {errors.day_of_week && <span className="text-xs text-rose-600">{errors.day_of_week}</span>}
                        </div>
                    )}

                    {form.schedule === 'monthly' && (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-600">Day of Month</label>
                            <input
                                type="number"
                                min="1"
                                max="31"
                                value={form.day_of_month}
                                onChange={(event) => handleChange('day_of_month', event.target.value)}
                                className={`rounded-xl border bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${errors.day_of_month ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-blue-100'}`}
                                placeholder="1-31"
                            />
                            {errors.day_of_month && <span className="text-xs text-rose-600">{errors.day_of_month}</span>}
                        </div>
                    )}

                </div>
            </Modal>
        </div>
    );
};
