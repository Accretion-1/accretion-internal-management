import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    CalendarDays,
    CheckCircle,
    Clock,
    ClipboardList,
    Download,
    Eye,
    FileVideo,
    ImageIcon,
    MapPin,
    Pencil,
    Plus,
    RefreshCw,
    Trash2,
    UserRound,
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { TodoCompletionModal } from '../components/TodoCompletionModal';
import { useAppState } from '../contexts/StateContext';
import apiHandler from '../store/api/apiHandler';
import { API_ENDPOINTS } from '../store/api/endpoints';

const EMPTY_FORM = {
    type: 'checkbox',
    schedule: 'daily',
    is_ocr: null,
    title: '',
    description: '',
    checkbox_items: [{ key: 'checkbox_1', label: '' }],
    location_ids: [],
    start_date: '',
    day_of_week: '',
    day_of_month: '',
    is_active: true,
};

const WEEK_DAYS = {
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
    7: 'Sunday',
};

const TODO_SCHEDULES = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'single', label: 'Single' },
];

const WEEK_DAY_OPTIONS = Object.entries(WEEK_DAYS).map(([value, label]) => ({
    value,
    label,
}));

const STOCK_FIELDS = [
    ['ppc', 'PPC'],
    ['wp', 'WP'],
    ['super', 'Super'],
    ['cnt_ppc', 'CNT PPC'],
    ['cnt_wp', 'CNT WP'],
    ['cnt_super', 'CNT Super'],
    ['damage_ppc', 'Damage PPC'],
    ['damage_wp', 'Damage WP'],
    ['damage_super', 'Damage Super'],
];

const formatDateTime = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatTime = (value) => {
    if (!value) return 'Any time';
    return String(value).slice(0, 5);
};

const getLocationLabel = (location) => {
    if (!location) return '-';
    return [location.district, location.godown, location.sloc].filter(Boolean).join(' • ') || '-';
};

const getTodoLocations = (todo) => (
    Array.isArray(todo?.locations) && todo.locations.length
        ? todo.locations
        : [todo?.location].filter(Boolean)
);

const getDateInputValue = (value) => {
    if (!value) return '';
    if (typeof value === 'string') {
        const dateMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) return dateMatch[1];
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
    return value;
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

const getBackendFileUrl = (fileUrl) => {
    if (!fileUrl) return '';
    if (/^https?:\/\//i.test(fileUrl)) return fileUrl;

    try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/';
        const filePath = fileUrl.startsWith('/public/') ? fileUrl : `/public/${fileUrl.replace(/^\/+/, '')}`;
        return `${new URL(apiBaseUrl).origin}${filePath}`;
    } catch {
        return fileUrl;
    }
};

const getCompletionDateKey = (completion) => getDateInputValue(completion?.completion_date || completion?.completed_at) || 'unknown';

const downloadAttachment = (url, fileName = 'attachment') => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

const normalizeTodoUpdatePayload = (form) => {
    const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        is_ocr: form.type === 'photo' ? Boolean(form.is_ocr) : null,
        schedule: form.schedule,
        location_ids: form.location_ids.map((locationId) => Number(locationId)),
        start_date: localDateToUtcISOString(form.start_date),
        is_active: Boolean(form.is_active),
    };

    if (form.type === 'checkbox') {
        payload.checkbox_items = form.checkbox_items
            .map((item, index) => ({
                key: item.key || `checkbox_${index + 1}`,
                label: item.label.trim(),
            }))
            .filter((item) => item.label);
    }

    if (form.schedule === 'weekly') {
        payload.day_of_week = Number(form.day_of_week);
    }

    if (form.schedule === 'monthly') {
        payload.day_of_month = Number(form.day_of_month);
    }

    return payload;
};

const DetailItem = ({ label, value }) => (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-2 text-sm font-bold text-slate-800">{value ?? '-'}</p>
    </div>
);

const CompletionMediaPreview = ({ file, onPreview }) => {
    const fileUrl = getBackendFileUrl(file?.file_url);
    const isPhoto = file?.file_type === 'photo';
    const fileName = file?.file_name || (isPhoto ? 'photo-attachment' : 'video-attachment');
    const previewPayload = { url: fileUrl, type: isPhoto ? 'photo' : 'video', name: fileName };

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
                <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    {isPhoto ? <ImageIcon className="h-4 w-4 text-blue-600" /> : <FileVideo className="h-4 w-4 text-violet-600" />}
                    {isPhoto ? 'Photo' : 'Video'}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => onPreview(previewPayload)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-blue-50 hover:text-blue-600"
                        title="Preview attachment"
                    >
                        <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => downloadAttachment(fileUrl, fileName)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-emerald-50 hover:text-emerald-600"
                        title="Download attachment"
                    >
                        <Download className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
            <button type="button" onClick={() => onPreview(previewPayload)} className="block w-full overflow-hidden">
                {isPhoto ? (
                <img src={fileUrl} alt="Completion attachment" className="h-36 w-full object-cover transition-transform hover:scale-[1.02]" />
            ) : (
                <video src={fileUrl} muted playsInline className="h-36 w-full bg-slate-950 object-cover" />
                )}
            </button>
        </div>
    );
};

const CompletionRecordCard = ({ completion, todoType, onPreviewAttachment }) => {
    const files = Array.isArray(completion.files) ? completion.files : [];
    const stockSections = Array.isArray(completion.stock_item_sections) ? completion.stock_item_sections : [];

    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                            Completed
                        </span>
                        <span className="text-xs font-bold text-slate-400">{formatDateTime(completion.completed_at)}</span>
                    </div>
                    <h4 className="mt-3 text-sm font-extrabold text-slate-900">
                        {completion.completed_by_user?.full_name || `User #${completion.completed_by}`}
                    </h4>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                        {completion.completed_by_user?.phone_number || 'No phone number'}
                    </p>
                </div>
                <div className="rounded-2xl bg-blue-50 px-3 py-2 text-xs font-extrabold text-blue-700">
                    {getLocationLabel(completion.location)}
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <DetailItem label="Completion Date" value={formatDate(completion.completion_date)} />
                {todoType === 'checkbox' && (
                    <DetailItem
                        label="Checklist"
                        value={`${(completion.checkbox_items_response || []).filter((item) => item.response).length}/${(completion.checkbox_items_response || []).length} completed`}
                    />
                )}
            </div>

            {todoType === 'stock' && stockSections.length > 0 && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Stock Entries</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {stockSections.map((section) => {
                            const stockLabel = STOCK_FIELDS.find(([field]) => field === section.stock_name)?.[1] || section.stock_name;

                            return (
                            <div key={`stock-section-${completion.completion_id}-${section.stock_name}`} className="rounded-2xl border border-slate-200 bg-white p-3">
                                <div className="mb-3 inline-flex rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-blue-700">
                                    {stockLabel}
                                </div>
                                <div className="grid gap-2">
                                    {section.items.map((item, index) => (
                                        <div key={item.todo_completion_item_id || `${section.stock_name}-${index}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Week {Number(item.stock_value || 0) > 0 ? item.week : '-'}</p>
                                            <p className="text-sm font-extrabold text-slate-900">{Number(item.stock_value || 0).toFixed(2)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {todoType === 'checkbox' && Array.isArray(completion.checkbox_items_response) && completion.checkbox_items_response.length > 0 && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Checklist Responses</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {completion.checkbox_items_response.map((item) => (
                            <div key={item.key} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700">
                                <span>{item.label}</span>
                                <span className={item.response ? 'text-emerald-600' : 'text-rose-600'}>
                                    {item.response ? 'Yes' : 'No'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {completion.remarks && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Remarks</p>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">{completion.remarks}</p>
                </div>
            )}

            {files.length > 0 && (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {files.map((file) => (
                        <CompletionMediaPreview
                            key={file.file_id || file.file_url}
                            file={file}
                            onPreview={onPreviewAttachment}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const TodoDetailPage = () => {
    const { todoId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAppState();
    const [todo, setTodo] = useState(null);
    const [locations, setLocations] = useState([]);
    const [form, setForm] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isCompleteOpen, setIsCompleteOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [completions, setCompletions] = useState([]);
    const [completionLocationFilter, setCompletionLocationFilter] = useState('');
    const [completionDateFilter, setCompletionDateFilter] = useState('');
    const [completionPagination, setCompletionPagination] = useState({
        total_records: 0,
        total_pages: 1,
        current_page: 1,
        limit: 10,
    });
    const [isCompletionsLoading, setIsCompletionsLoading] = useState(false);
    const [activeAttachment, setActiveAttachment] = useState(null);

    const isAdminOrManager = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';
    const isUserRole = currentUser?.role === 'User';

    const fetchTodo = async () => {
        setIsLoading(true);
        try {
            const response = await apiHandler({
                method: 'GET',
                url: currentUser?.role === 'User'
                    ? API_ENDPOINTS.TODOS.MY_BY_ID(todoId)
                    : API_ENDPOINTS.TODOS.BY_ID(todoId),
            });
            setTodo(response?.data || null);
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

    const fetchCompletions = async (page = completionPagination.current_page) => {
        if (!isAdminOrManager || !todoId) return;

        setIsCompletionsLoading(true);
        try {
            const response = await apiHandler({
                method: 'GET',
                    url: API_ENDPOINTS.TODOS.COMPLETIONS(todoId),
                    params: {
                        page,
                        limit: completionPagination.limit,
                        ...(completionLocationFilter ? { location_id: completionLocationFilter } : {}),
                        ...(completionDateFilter ? { date: completionDateFilter } : {}),
                    },
                });
            const payload = response?.data || {};

            setCompletions(Array.isArray(payload.records) ? payload.records : []);
            setCompletionPagination((prev) => ({
                ...prev,
                total_records: Number(payload.total_records || 0),
                total_pages: Math.max(Number(payload.total_pages || 1), 1),
                current_page: Number(payload.current_page || page || 1),
                limit: Number(payload.limit || prev.limit),
            }));
        }
        finally {
            setIsCompletionsLoading(false);
        }
    };

    useEffect(() => {
        fetchTodo();
    }, [todoId, currentUser?.role]);

    useEffect(() => {
        if (isAdminOrManager) {
            fetchLocations();
        }
    }, [isAdminOrManager]);

    useEffect(() => {
        if (isAdminOrManager) {
            fetchCompletions(completionPagination.current_page);
        }
    }, [isAdminOrManager, todoId, completionLocationFilter, completionDateFilter, completionPagination.current_page]);

    const scheduleText = useMemo(() => {
        if (!todo) return '-';
        if (todo.schedule === 'weekly') {
            return `Weekly on ${WEEK_DAYS[Number(todo.day_of_week)] || `Day ${todo.day_of_week}`}`;
        }
        if (todo.schedule === 'monthly') {
            return `Monthly on day ${todo.day_of_month}`;
        }
        return String(todo.schedule || '-').replace(/^\w/, (letter) => letter.toUpperCase());
    }, [todo]);

    const completionsByDate = useMemo(() => {
        const groupedCompletions = completions.reduce((groups, completion) => {
            const dateKey = getCompletionDateKey(completion);
            const existingGroup = groups[dateKey] || {
                dateKey,
                label: dateKey === 'unknown' ? 'Unknown date' : formatDate(dateKey),
                records: [],
            };

            existingGroup.records.push(completion);
            return {
                ...groups,
                [dateKey]: existingGroup,
            };
        }, {});

        return Object.values(groupedCompletions);
    }, [completions]);

    const assignedTodoLocations = useMemo(() => getTodoLocations(todo), [todo]);

    const validateForm = () => {
        const nextErrors = {};

        if (!form.title.trim() || form.title.trim().length < 2) {
            nextErrors.title = 'Title must be at least 2 characters.';
        }

        if (!form.schedule) {
            nextErrors.schedule = 'Schedule is required.';
        }

        if (form.type === 'checkbox') {
            const validCheckboxItems = form.checkbox_items.filter((item) => item.label.trim());
            if (!validCheckboxItems.length) {
                nextErrors.checkbox_items = 'Add at least one checkbox item.';
            }
        }

        if (!form.location_ids.length) {
            nextErrors.location_ids = 'At least one location is required.';
        }

        if (!form.start_date) {
            nextErrors.start_date = 'Start date is required.';
        } else if (!isValidDateValue(form.start_date)) {
            nextErrors.start_date = 'Select a valid start date.';
        } else if (form.start_date < getTodayDateValue()) {
            nextErrors.start_date = 'Start date cannot be a previous date.';
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

    const handleCheckboxItemChange = (index, value) => {
        setForm((prev) => ({
            ...prev,
            checkbox_items: prev.checkbox_items.map((item, itemIndex) => (
                itemIndex === index ? { ...item, label: value } : item
            )),
        }));
        setErrors((prev) => ({ ...prev, checkbox_items: undefined }));
    };

    const handleAddCheckboxItem = () => {
        setForm((prev) => ({
            ...prev,
            checkbox_items: [
                ...prev.checkbox_items,
                { key: `checkbox_${Date.now()}`, label: '' },
            ],
        }));
        setErrors((prev) => ({ ...prev, checkbox_items: undefined }));
    };

    const handleRemoveCheckboxItem = (index) => {
        setForm((prev) => ({
            ...prev,
            checkbox_items: prev.checkbox_items.length > 1
                ? prev.checkbox_items.filter((_, itemIndex) => itemIndex !== index)
                : [{ key: 'checkbox_1', label: '' }],
        }));
        setErrors((prev) => ({ ...prev, checkbox_items: undefined }));
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

    const handleOpenEdit = () => {
        if (!todo) return;
        const todoLocations = getTodoLocations(todo);

        setForm({
            ...EMPTY_FORM,
            type: todo.type || EMPTY_FORM.type,
            schedule: todo.schedule || EMPTY_FORM.schedule,
            is_ocr: todo.type === 'photo' ? Boolean(todo.is_ocr) : null,
            title: todo.title || '',
            description: todo.description || '',
            checkbox_items: Array.isArray(todo.checkbox_items) && todo.checkbox_items.length
                ? todo.checkbox_items.map((item, index) => ({
                    key: item.key || `checkbox_${index + 1}`,
                    label: item.label || '',
                }))
                : [{ key: 'checkbox_1', label: '' }],
            location_ids: todoLocations.map((location) => String(location.location_id)).filter(Boolean),
            start_date: getDateInputValue(todo.start_date),
            day_of_week: todo.day_of_week ? String(todo.day_of_week) : '',
            day_of_month: todo.day_of_month ? String(todo.day_of_month) : '',
            is_active: Boolean(todo.is_active),
        });
        setErrors({});
        setIsEditOpen(true);
    };

    const handleCloseEdit = () => {
        if (isSaving) return;
        setIsEditOpen(false);
        setErrors({});
    };

    const handleUpdateTodo = async () => {
        if (!isAdminOrManager || !todo || !validateForm()) return;

        setIsSaving(true);
        try {
            const response = await apiHandler({
                method: 'PUT',
                url: API_ENDPOINTS.TODOS.UPDATE(todo.todo_id),
                data: normalizeTodoUpdatePayload(form),
            });

            setTodo(response?.data || null);
            setIsEditOpen(false);
            setErrors({});
        }
        finally {
            setIsSaving(false);
        }
    };

    const handleCompletionDone = (completion) => {
        setTodo(completion?.todo || todo);
        setIsCompleteOpen(false);
    };

    const handleCompletionLocationFilterChange = (value) => {
        setCompletionLocationFilter(value);
        setCompletionPagination((prev) => ({ ...prev, current_page: 1 }));
    };

    const handleCompletionDateFilterChange = (value) => {
        setCompletionDateFilter(value);
        setCompletionPagination((prev) => ({ ...prev, current_page: 1 }));
    };

    const handleClearCompletionDateFilter = () => {
        setCompletionDateFilter('');
        setCompletionPagination((prev) => ({ ...prev, current_page: 1 }));
    };

    const handleCompletionPageChange = (page) => {
        setCompletionPagination((prev) => ({
            ...prev,
            current_page: Math.min(Math.max(page, 1), prev.total_pages || 1),
        }));
    };

    return (
        <div className="flex flex-col gap-6 pb-12 text-left font-sans">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <button
                        id="back-to-todos-btn"
                        onClick={() => navigate('/todos')}
                        className="mb-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to To-Dos
                    </button>
                    <h2 className="font-display flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
                        <ClipboardList className="h-6 w-6 text-blue-600" />
                        To-Do Details
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">Review full task schedule, location, and creator information.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {isUserRole && todo && !todo.is_completed && (
                        <button
                            id="complete-todo-detail-btn"
                            onClick={() => setIsCompleteOpen(true)}
                            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:bg-emerald-700"
                        >
                            <CheckCircle className="h-4 w-4" />
                            Complete Task
                        </button>
                    )}
                    {isAdminOrManager && todo && (
                        <button
                            id="edit-todo-detail-btn"
                            onClick={handleOpenEdit}
                            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:bg-blue-700"
                        >
                            <Pencil className="h-4 w-4" />
                            Edit To-Do
                        </button>
                    )}
                    <button
                        id="refresh-todo-detail-btn"
                        onClick={fetchTodo}
                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-xs transition-all hover:bg-slate-50"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="rounded-3xl border border-slate-200 bg-white py-20 text-center text-sm font-semibold text-slate-400">
                    Loading To-Do details...
                </div>
            ) : todo ? (
                <>
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
                        <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white p-6">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-blue-600 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
                                            {todo.type}
                                        </span>
                                        {todo.type === 'photo' && (
                                            <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider ${todo.is_ocr ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                OCR {todo.is_ocr ? 'Enabled' : 'Disabled'}
                                            </span>
                                        )}
                                        <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider ${todo.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {isUserRole ? (todo.is_completed ? 'Completed' : 'Pending') : (todo.is_active ? 'Active' : 'Inactive')}
                                        </span>
                                    </div>
                                    <h3 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">{todo.title}</h3>
                                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
                                        {todo.description || 'No description added for this task.'}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-right shadow-xs">
                                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Todo ID</p>
                                    <p className="mt-1 font-mono text-lg font-black text-blue-600">#{todo.todo_id}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
                            {!isUserRole && <DetailItem label="Schedule" value={scheduleText} />}
                            <DetailItem label="Due Time" value={formatTime(todo.due_time)} />
                            <DetailItem label="Task Type" value={todo.type} />
                            {isUserRole ? (
                                <DetailItem label="Status" value={todo.is_completed ? 'Completed' : 'Pending'} />
                            ) : (
                                <DetailItem label="Start Date" value={formatDate(todo.start_date)} />
                            )}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                            <div className="mb-5 flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                                    <UserRound className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-slate-900">Creator Details</h3>
                                    <p className="text-xs text-slate-500">User who created this task</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <DetailItem label="Created By" value={todo.created_by_user?.full_name || `User #${todo.created_by}`} />
                                <DetailItem label="Phone Number" value={todo.created_by_user?.phone_number} />
                                {!isUserRole && <DetailItem label="Created At" value={formatDateTime(todo.created_at)} />}
                                {!isUserRole && <DetailItem label="Updated At" value={formatDateTime(todo.updated_at)} />}
                            </div>
                        </div>

                    {!isUserRole && (
                        <div className="grid grid-cols-1 gap-5">
                            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                                <div className="mb-5 flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                        <MapPin className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-extrabold text-slate-900">Assigned Locations</h3>
                                        <p className="text-xs text-slate-500">
                                            {Array.isArray(todo.locations) ? `${todo.locations.length} mapped location(s)` : getLocationLabel(todo.location)}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                    {(Array.isArray(todo.locations) && todo.locations.length ? todo.locations : [todo.location].filter(Boolean)).map((location) => (
                                        <div key={location.todo_location_id || location.location_id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                            <p className="text-sm font-extrabold text-slate-900">{getLocationLabel(location)}</p>
                                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <DetailItem label="District" value={location.district} />
                                                <DetailItem label="Godown" value={location.godown} />
                                                <DetailItem label="SLOC" value={location.sloc} />
                                                <DetailItem label="Capacity" value={location.cap} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                            <CheckCircle className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-extrabold text-slate-900">Completed Submissions</h3>
                                            <p className="text-xs text-slate-500">
                                                Date-wise completion history with media, remarks, and location filters.
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => fetchCompletions(completionPagination.current_page)}
                                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-xs transition-all hover:bg-slate-50"
                                    >
                                        <RefreshCw className={`h-4 w-4 ${isCompletionsLoading ? 'animate-spin' : ''}`} />
                                        Refresh
                                    </button>
                                </div>

                                <div className="mb-5 grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr_auto] xl:items-end">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Filter by Location</label>
                                        <select
                                            value={completionLocationFilter}
                                            onChange={(event) => handleCompletionLocationFilterChange(event.target.value)}
                                            className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                                        >
                                            <option value="">All locations</option>
                                            {assignedTodoLocations.map((location) => (
                                                <option key={location.location_id} value={location.location_id}>
                                                    {getLocationLabel(location)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Filter by Date</label>
                                        <div className="flex items-center gap-2">
                                            <div className="relative min-w-0 flex-1">
                                                <input
                                                    type="date"
                                                    value={completionDateFilter}
                                                    max={getTodayDateValue()}
                                                    onChange={(event) => handleCompletionDateFilterChange(event.target.value)}
                                                    className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 pr-10 text-sm font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                                                />
                                                <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            </div>
                                            {completionDateFilter && (
                                                <button
                                                    type="button"
                                                    onClick={handleClearCompletionDateFilter}
                                                    className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 transition-all hover:bg-slate-50"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500">
                                        {completionPagination.total_records} completed record(s)
                                    </div>
                                </div>

                                {(completionLocationFilter || completionDateFilter) && (
                                    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Active Filters</span>
                                        {completionLocationFilter && (
                                            <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700">
                                                {assignedTodoLocations.find((location) => String(location.location_id) === String(completionLocationFilter))
                                                    ? getLocationLabel(assignedTodoLocations.find((location) => String(location.location_id) === String(completionLocationFilter)))
                                                    : 'Selected location'}
                                            </span>
                                        )}
                                        {completionDateFilter && (
                                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                                                {formatDate(completionDateFilter)}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {isCompletionsLoading ? (
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm font-semibold text-slate-400">
                                        Loading completed submissions...
                                    </div>
                                ) : completionsByDate.length > 0 ? (
                                    <div className="space-y-6">
                                        {completionsByDate.map((group) => (
                                            <div key={group.dateKey} className="space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                                        <CalendarDays className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-extrabold text-slate-900">{group.label}</h4>
                                                        <p className="text-xs font-semibold text-slate-400">{group.records.length} submission(s)</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    {group.records.map((completion) => (
                                                        <CompletionRecordCard
                                                            key={completion.completion_id}
                                                            completion={completion}
                                                            todoType={todo.type}
                                                            onPreviewAttachment={setActiveAttachment}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}

                                        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                            <p className="text-xs font-bold text-slate-500">
                                                Page {completionPagination.current_page} of {completionPagination.total_pages}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    disabled={completionPagination.current_page <= 1}
                                                    onClick={() => handleCompletionPageChange(completionPagination.current_page - 1)}
                                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    Previous
                                                </button>
                                                <button
                                                    disabled={completionPagination.current_page >= completionPagination.total_pages}
                                                    onClick={() => handleCompletionPageChange(completionPagination.current_page + 1)}
                                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-300">
                                            <CheckCircle className="h-5 w-5" />
                                        </div>
                                        <h4 className="text-sm font-extrabold text-slate-800">No completed submissions found</h4>
                                        <p className="mt-1 text-xs text-slate-500">Try changing the location filter or refresh after users complete this task.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                        <CheckCircle className="h-6 w-6" />
                    </div>
                    <h4 className="font-bold text-slate-800">To-Do not found</h4>
                    <p className="mt-1 max-w-sm text-xs text-slate-500">The requested task could not be loaded.</p>
                </div>
            )}

            <Modal
                isOpen={isEditOpen}
                onClose={handleCloseEdit}
                title="Update To-Do Task"
                maxWidthClass="max-w-3xl"
                footerButtons={[
                    { label: 'Cancel', onClick: handleCloseEdit },
                    { label: 'Update To-Do', onClick: handleUpdateTodo, variant: 'primary', isLoading: isSaving },
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
                            disabled
                            className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm font-medium text-slate-400"
                        >
                            <option value={form.type}>{form.type}</option>
                        </select>
                        <span className="text-xs font-semibold text-slate-400">Task type cannot be changed after creation.</span>
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

                    {form.type === 'checkbox' && (
                        <div className="flex flex-col gap-2 sm:col-span-2">
                            <div className="flex items-center justify-between gap-3">
                                <label className="text-xs font-bold text-slate-600">Checkbox Items</label>
                                <button
                                    type="button"
                                    onClick={handleAddCheckboxItem}
                                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-blue-700 transition-all hover:bg-blue-100"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add Item
                                </button>
                            </div>
                            <div className={`grid gap-2 rounded-xl border bg-slate-50 p-2 ${errors.checkbox_items ? 'border-rose-300' : 'border-slate-200'}`}>
                                {form.checkbox_items.map((item, index) => (
                                    <div key={item.key || index} className="flex items-center gap-2">
                                        <input
                                            value={item.label}
                                            onChange={(event) => handleCheckboxItemChange(index, event.target.value)}
                                            placeholder={`Checkbox item ${index + 1}`}
                                            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveCheckboxItem(index)}
                                            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-rose-500 transition-all hover:bg-rose-50"
                                            title="Remove checkbox item"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            {errors.checkbox_items && <span className="text-xs text-rose-600">{errors.checkbox_items}</span>}
                        </div>
                    )}

                    {form.type === 'photo' && (
                        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                            <span>
                                <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-500">OCR Verification</span>
                                <span className="mt-1 block text-xs font-semibold text-slate-500">
                                    If enabled, users must capture a photo that passes OCR before completing this task.
                                </span>
                            </span>
                            <input
                                type="checkbox"
                                checked={Boolean(form.is_ocr)}
                                onChange={(event) => handleChange('is_ocr', event.target.checked)}
                                className="h-5 w-5 rounded border-slate-300 text-blue-600"
                            />
                        </label>
                    )}

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

                    {form.schedule === 'weekly' && (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-600">Day of Week</label>
                            <select
                                value={form.day_of_week}
                                onChange={(event) => handleChange('day_of_week', event.target.value)}
                                className={`cursor-pointer rounded-xl border bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${errors.day_of_week ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-blue-100'}`}
                            >
                                <option value="">Select day</option>
                                {WEEK_DAY_OPTIONS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
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

            <TodoCompletionModal
                isOpen={isCompleteOpen}
                todo={todo}
                onClose={() => setIsCompleteOpen(false)}
                onCompleted={handleCompletionDone}
            />

            <Modal
                isOpen={Boolean(activeAttachment)}
                onClose={() => setActiveAttachment(null)}
                title={`Verification ${activeAttachment?.type === 'video' ? 'Video' : 'Photo'} Attachment`}
                maxWidthClass="max-w-3xl"
                footerButtons={[
                    { label: 'Close', onClick: () => setActiveAttachment(null) },
                    {
                        label: 'Download',
                        onClick: () => downloadAttachment(activeAttachment?.url, activeAttachment?.name),
                    },
                    {
                        label: 'Open in New Tab',
                        onClick: () => window.open(activeAttachment?.url, '_blank'),
                        variant: 'primary',
                    },
                ]}
            >
                <div className="flex justify-center overflow-hidden rounded-2xl bg-slate-950 p-2">
                    {activeAttachment?.type === 'video' ? (
                        <video src={activeAttachment.url} controls playsInline className="max-h-[60vh] w-full object-contain" />
                    ) : (
                        <img src={activeAttachment?.url} alt="Verification attachment preview" className="max-h-[60vh] object-contain" />
                    )}
                </div>
            </Modal>
        </div>
    );
};
