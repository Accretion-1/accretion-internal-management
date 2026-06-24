import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    CalendarDays,
    CheckCircle,
    Clock,
    ClipboardList,
    MapPin,
    RefreshCw,
    UserRound,
} from 'lucide-react';
import apiHandler from '../store/api/apiHandler';
import { API_ENDPOINTS } from '../store/api/endpoints';

const WEEK_DAYS = {
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
    7: 'Sunday',
};

const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

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

const DetailItem = ({ label, value }) => (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-2 text-sm font-bold text-slate-800">{value || '-'}</p>
    </div>
);

export const TodoDetailPage = () => {
    const { todoId } = useParams();
    const navigate = useNavigate();
    const [todo, setTodo] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchTodo = async () => {
        setIsLoading(true);
        try {
            const response = await apiHandler({
                method: 'GET',
                url: API_ENDPOINTS.TODOS.BY_ID(todoId),
            });
            setTodo(response?.data || null);
        }
        finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTodo();
    }, [todoId]);

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

                <button
                    id="refresh-todo-detail-btn"
                    onClick={fetchTodo}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-xs transition-all hover:bg-slate-50"
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </button>
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
                                        <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider ${todo.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {todo.is_active ? 'Active' : 'Inactive'}
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
                            <DetailItem label="Schedule" value={scheduleText} />
                            <DetailItem label="Due Time" value={formatTime(todo.due_time)} />
                            <DetailItem label="Start Date" value={formatDate(todo.start_date)} />
                            <DetailItem label="Task Type" value={todo.type} />
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
                                <DetailItem label="Created At" value={formatDateTime(todo.created_at)} />
                                <DetailItem label="Updated At" value={formatDateTime(todo.updated_at)} />
                            </div>
                        </div>

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

                    </div>

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
        </div>
    );
};
