import React, { useState, useEffect } from 'react';
import { useAppState } from '../contexts/StateContext';
import {
  Users, UserCheck, Shield, ClipboardList, Package, Bell, TrendingUp, Activity, CheckSquare, Layers, Clock, AlertTriangle, ArrowUpRight, Calendar,
  MapPin, ChevronLeft, ChevronRight, Image as ImageIcon, Video as VideoIcon, FileText, CheckCircle2, HelpCircle, ExternalLink, RefreshCw, Download
} from 'lucide-react';
import apiHandler from '../store/api/apiHandler';
import { API_ENDPOINTS } from '../store/api/endpoints';
import { Modal } from '../components/Modal';
export const DashboardPage = () => {
  const { currentUser, users, stocks, reminders, activities, notifications } = useAppState();
  const [hoveredMetric, setHoveredMetric] = useState(null);

  const [todayTasks, setTodayTasks] = useState([]);
  const [locationsList, setLocationsList] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [tasksLoading, setTasksLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeAttachment, setActiveAttachment] = useState(null);
  const [taskStats, setTaskStats] = useState({ total: 0, completed: 0, pending: 0 });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const role = currentUser?.role;

  const fetchLocations = async () => {
    setLocationsLoading(true);
    try {
      const response = await apiHandler({
        method: 'GET',
        url: API_ENDPOINTS.LOCATIONS.BASE,
      });
      setLocationsList(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLocationsLoading(false);
    }
  };

  const fetchTodayTasks = async () => {
    setTasksLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: 5,
      };
      if (selectedLocationId) {
        params.location_id = selectedLocationId;
      }
      if (selectedStatus && selectedStatus !== 'all') {
        params.status = selectedStatus;
      }
      const response = await apiHandler({
        method: 'GET',
        url: API_ENDPOINTS.TODOS.TODAY_TASKS,
        params,
      });
      setTodayTasks(response?.data?.records || []);
      setTotalPages(response?.data?.total_pages || 1);
      if (response?.data?.stats) {
        setTaskStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching today tasks:', error);
    } finally {
      setTasksLoading(false);
    }
  };

  useEffect(() => {
    if (role === 'Admin' || role === 'Manager') {
      fetchLocations();
    }
  }, [role]);

  useEffect(() => {
    if (role === 'Admin' || role === 'Manager') {
      fetchTodayTasks();
    }
  }, [role, selectedLocationId, selectedStatus, currentPage]);

  const handleLocationChange = (e) => {
    setSelectedLocationId(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (e) => {
    setSelectedStatus(e.target.value);
    setCurrentPage(1);
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

  if (!currentUser)
    return null;
  // Global calculations
  const totalEmployees = users.length;
  const totalManagers = users.filter((u) => u.role === 'Manager').length;
  const activeUsers = users.filter((u) => u.status === 'Active').length;
  const pendingReminders = reminders.filter((r) => r.status === 'Active').length;
  const lowStockCount = stocks.filter((s) => s.quantity <= s.minThreshold).length;
  const recentActivities = activities.slice(0, 5);
  // Stats for dashboards
  const userAssignedReminders = reminders.filter(r => r.assignedUsers.includes(currentUser.id) && r.status === 'Active');
  const completedRemindersCount = reminders.filter(r => r.status === 'Completed').length;
  return (<div className="flex flex-col gap-8 pb-12 font-sans">

    {/* Top Welcome Title */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/40 rounded-full blur-2xl pointer-events-none" />
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white text-2xl font-bold font-display shadow-md">
          {currentUser.name.charAt(0)}
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {currentUser.name}!
          </h2>
          <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded-lg text-[10px] border border-blue-100">
              <Shield className="w-3 h-3" /> {currentUser.role} Account
            </span>
          </p>
        </div>
      </div>
      <div className="bg-slate-55 border border-slate-100 p-2.5 rounded-2xl flex items-center gap-3">
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Clock</p>
          <p className="text-sm font-semibold text-slate-800 font-mono">
            {currentTime.toLocaleString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true
            })}
          </p>
        </div>
        <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
      </div>
    </div>

    {/* Dynamic Metrics Cards for Admin/Manager */}
    {(role === 'Admin' || role === 'Manager') && (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Card 1: Total Tasks */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all hover:shadow-md cursor-pointer group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Today's Tasks</p>
              <h3 className="font-display text-3xl font-extrabold text-slate-900 mt-2">{taskStats.total}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>Assigned for today</span>
          </div>
        </div>

        {/* Card 2: Completed Tasks */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all hover:shadow-md cursor-pointer group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Completed Tasks</p>
              <h3 className="font-display text-3xl font-extrabold text-slate-900 mt-2">{taskStats.completed}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span className="text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-lg">
              {taskStats.total > 0 ? `${Math.round((taskStats.completed / taskStats.total) * 100)}%` : '0%'} Completion Rate
            </span>
          </div>
        </div>

        {/* Card 3: Pending Tasks */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-300 transition-all hover:shadow-md cursor-pointer group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Tasks</p>
              <h3 className="font-display text-3xl font-extrabold text-slate-900 mt-2">{taskStats.pending}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>Awaiting worker action</span>
          </div>
        </div>
      </div>
    )}

    {/* ADMIN DASHBOARD VIEW */}
    {role === 'Admin' && false && (<div className="flex flex-col gap-8">

      {/* Admin Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Total Employees */}
        <div onMouseEnter={() => setHoveredMetric('employees')} onMouseLeave={() => setHoveredMetric(null)} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all hover:shadow-md cursor-pointer group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Workforce</p>
              <h3 className="font-display text-3xl font-extrabold text-slate-900 mt-2">{totalEmployees}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1 text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded-lg">
              <ArrowUpRight className="w-3 h-3" /> +12%
            </span>
            <span>Includes {totalManagers} Managers</span>
          </div>
        </div>

        {/* Active Users */}
        <div onMouseEnter={() => setHoveredMetric('active')} onMouseLeave={() => setHoveredMetric(null)} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all hover:shadow-md cursor-pointer group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Live Seats</p>
              <h3 className="font-display text-3xl font-extrabold text-slate-900 mt-2">{activeUsers}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1 text-emerald-600 font-medium">92% Engagement</span>
            <span>Active this hour</span>
          </div>
        </div>

        {/* Pending Reminders */}
        <div onMouseEnter={() => setHoveredMetric('reminders')} onMouseLeave={() => setHoveredMetric(null)} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-indigo-300 transition-all hover:shadow-md cursor-pointer group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Scheduled Reminders</p>
              <h3 className="font-display text-3xl font-extrabold text-slate-900 mt-2">{pendingReminders}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span className="text-indigo-600 font-medium">{completedRemindersCount} completed</span>
            <span>Due today or tomorrow</span>
          </div>
        </div>

        {/* Asset Low-stock indicator */}
        <div onMouseEnter={() => setHoveredMetric('assets')} onMouseLeave={() => setHoveredMetric(null)} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-rose-300 transition-all hover:shadow-md cursor-pointer group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Low Stock Hazards</p>
              <h3 className="font-display text-3xl font-extrabold text-slate-900 mt-2">{lowStockCount}</h3>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${lowStockCount > 0 ? 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white' : 'bg-slate-50 text-slate-600'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            {lowStockCount > 0 ? (<span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded-lg animate-pulse">Needs Procurement</span>) : (<span className="text-slate-500">All modules stable</span>)}
            <span>In 2 warehouse nodes</span>
          </div>
        </div>

      </div>

      {/* Graphical Section & Activity Block */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* SVG Interactive Chart Widget (User Growth & Module Usage combined) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-6">
          <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-4 border-b border-slate-100 pb-4">
            <div>
              <h4 className="font-display text-lg font-bold text-slate-900">Workforce Growth Rates</h4>
              <p className="text-xs text-slate-500 mt-0.5">Dynamic month-over-month onboarding stats and database seats</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg border border-blue-100">
                <TrendingUp className="w-3.5 h-3.5" /> High Velocity
              </span>
            </div>
          </div>

          {/* Polished Custom Modern SVG Area Chart */}
          <div className="w-full h-64 relative flex items-end">
            {/* Horizontal grid guide lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-slate-400 font-mono select-none">
              <div className="border-b border-slate-100 pt-1 w-full text-right pr-2">20 Users</div>
              <div className="border-b border-slate-100/60 pb-1 w-full text-right pr-2">15 Users</div>
              <div className="border-b border-slate-100/40 pb-1 w-full text-right pr-2">10 Users</div>
              <div className="border-b border-slate-100/20 pb-1 w-full text-right pr-2">5 Users</div>
              <div className="pt-2 w-full text-right pr-2">0</div>
            </div>

            {/* SVG Curve lines drawing */}
            <svg className="w-full h-56 z-10 overflow-visible" viewBox="0 0 600 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Chart Fill Under Shadow Area */}
              <path d="M 10 200 Q 150 160 300 120 T 590 30 L 590 200 Z" fill="url(#chartGlow)" />

              {/* Top Neon Bold Line */}
              <path d="M 10 200 Q 150 160 300 120 T 590 30" fill="none" stroke="#2563EB" strokeWidth="4.5" strokeLinecap="round" />

              {/* Hot Dots on key milestones */}
              <circle cx="10" cy="200" r="6" fill="#1D4ED8" stroke="#FFFFFF" strokeWidth="2" className="cursor-pointer" />
              <circle cx="150" cy="170" r="6" fill="#1D4ED8" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="300" cy="120" r="6" fill="#1D4ED8" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="450" cy="70" r="6" fill="#1D4ED8" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="590" cy="30" r="7" fill="#1D4ED8" stroke="#FFFFFF" strokeWidth="2" className="animate-pulse" />
            </svg>
          </div>

          {/* X Axis Timestamps Labels */}
          <div className="flex justify-between items-center px-2 sm:px-4 font-mono text-[9px] sm:text-[11px] text-slate-400 border-t border-slate-150 pt-3">
            <span>Jan '26</span>
            <span className="hidden sm:block">Mar (3 Seats)</span>
            <span className="hidden sm:block">May (5 Seats)</span>
            <span>Jun '26 ({totalEmployees} Seats)</span>
          </div>
        </div>

        {/* Activity Stream Feed */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h4 className="font-display text-md font-bold text-slate-900">System Activity Audit</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Real-time action streaming logs</p>
            </div>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>

          <div className="flex flex-col gap-4 overflow-y-auto max-h-72 pr-1">
            {recentActivities.map((log) => (<div key={log.id} className="relative pl-6 pb-2 border-l border-slate-100 last:border-0 last:pb-0">
              {/* Small action timeline dot indicator */}
              <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-blue-50" />

              <div className="flex flex-col gap-0.5 text-left">
                <div className="flex items-center justify-between text-xs">
                  <strong className="text-slate-800 font-semibold">{log.userName}</strong>
                  <span className="font-mono text-[9px] text-slate-400">{log.timestamp.split(' ')[1] || log.timestamp}</span>
                </div>
                <p className="text-xs text-slate-600 font-medium italic">"{log.action}"</p>
                <p className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 w-fit mt-1">{log.details}</p>
              </div>
            </div>))}
          </div>
        </div>

      </div>

      {/* Module allocations snapshot (Bento Layout widgets) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Stock Levels Status Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-5 text-left">
          <div className="flex items-center justify-between">
            <span className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
              <Package className="w-6 h-6" />
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">{stocks.length} catalogued items</span>
          </div>
          <div>
            <h4 className="font-display text-md font-bold text-slate-900">Stock Operations Status</h4>
            <p className="text-xs text-slate-500 mt-1 leading-normal">
              Warehouse units allocation monitoring. Alerts prompt instantly upon lower quantities.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 mt-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-slate-600">Threshold Safety level:</span>
              <strong className="text-emerald-600">72% Compliant</strong>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '72%' }} />
            </div>
          </div>
        </div>



        {/* Notification alert snapshot info */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-5 text-left">
          <div className="flex items-center justify-between">
            <span className="p-3 bg-amber-50 text-amber-600 rounded-2xl relative">
              <Bell className="w-6 h-6" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
            </span>
            <span className="text-xs font-semibold text-amber-700">Live Broadcast Signals</span>
          </div>
          <div>
            <h4 className="font-display text-md font-bold text-slate-900">Communications Center</h4>
            <p className="text-xs text-slate-500 mt-1 leading-normal">
              Notifications dispatch upon system triggers. Unread alerts prompt focus alerts immediately.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 mt-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-slate-600">Unread warnings active:</span>
              <strong className="text-amber-600">{notifications.filter(n => !n.read).length} items</strong>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-amber-400 h-2 rounded-full" style={{ width: '45%' }} />
            </div>
          </div>
        </div>

      </div>

    </div>)}

    {/* MANAGER DASHBOARD VIEW */}
    {role === 'Manager' && false && (<div className="flex flex-col gap-8">

      {/* Manager Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Workforce count designated to Management */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned Workspace Users</p>
              <h3 className="font-display text-3xl font-extrabold text-slate-900 mt-2">{totalEmployees - 1}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">Authorized for profile edit assignments</p>
        </div>

        {/* Active Seats */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Operational Active Now</p>
              <h3 className="font-display text-3xl font-extrabold text-slate-900 mt-2">{activeUsers}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">90% of local staff online</p>
        </div>

        {/* Pending duties reminders count */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Team Pending Duties</p>
              <h3 className="font-display text-3xl font-extrabold text-slate-900 mt-2">{pendingReminders}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">Duties tracked across operations</p>
        </div>

        {/* Alerts warning */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Unresolved Reminders</p>
              <h3 className="font-display text-3xl font-extrabold text-slate-900 mt-2">{userAssignedReminders.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">Personal tasks slated for resolution</p>
        </div>

      </div>

      {/* Quick task action stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-4 text-left">
          <h4 className="font-display text-lg font-bold text-slate-900">Asset Tracking Snapshot</h4>
          <p className="text-xs text-slate-500">View safety threshold reserves of products on your active operations floor</p>

          <div className="flex flex-col gap-4 mt-2">
            {stocks.slice(0, 3).map((item) => (<div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
              <div>
                <p className="text-xs font-bold text-slate-800">{item.name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Asset Code: {item.sku} • Warehouse: {item.warehouse}</p>
              </div>
              <div className="text-left sm:text-right mt-2 sm:mt-0">
                <p className="text-xs font-semibold text-slate-800">{item.quantity} {item.unit} available</p>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold mt-1 inline-block ${item.quantity <= item.minThreshold ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {item.quantity <= item.minThreshold ? 'Low Safety Guard' : 'Healthy Allocation'}
                </span>
              </div>
            </div>))}
          </div>
        </div>

        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-3 text-left">
          <h4 className="font-display text-md font-bold text-slate-900">Operations Feed</h4>
          <p className="text-xs text-slate-500">Live operational actions dispatched under your scope</p>
          <div className="flex flex-col gap-3 mt-2 font-sans">
            {activities.filter(a => a.userName !== 'Sarah Jenkins').slice(0, 3).map((act) => (<div key={act.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-1 text-xs">
              <div className="flex justify-between items-center font-bold text-slate-700">
                <span>{act.userName}</span>
                <span className="font-mono text-[9px] font-normal text-slate-400">{act.timestamp.split(' ')[1]}</span>
              </div>
              <p className="text-slate-600 italic">"{act.action}"</p>
              <p className="text-[10px] text-slate-400">{act.details}</p>
            </div>))}
          </div>
        </div>
      </div>

    </div>)}

    {/* OPERATIONAL USER DASHBOARD VIEW */}
    {role === 'User' && (<div className="flex flex-col gap-8">

      {/* User Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Assigned modules counts */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned Platform Panels</p>
              <h3 className="font-display text-3xl font-extrabold text-slate-900 mt-2">{currentUser.assignedModules.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">Authorized for operational usage</p>
        </div>

        {/* Total personal reminders assigned */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Unresolved To-Dos</p>
              <h3 className="font-display text-3xl font-extrabold text-slate-900 mt-2">{userAssignedReminders.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">Due across operations cycle</p>
        </div>

        {/* Tasks resolved recently */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Tasks Completed</p>
              <h3 className="font-display text-3xl font-extrabold text-slate-900 mt-2">{completedRemindersCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">Fully resolved with status logged</p>
        </div>

        {/* Alerts warning */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Warehouse Safe Products</p>
              <h3 className="font-display text-3xl font-extrabold text-slate-900 mt-2">
                {stocks.filter(s => s.quantity > s.minThreshold).length}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">Asset stocks safe above thresholds</p>
        </div>

      </div>

      {/* User Task Allocation panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">

        {/* Active individual list */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
          <h4 className="font-display text-lg font-bold text-slate-900">Your Action Duty List</h4>
          <p className="text-xs text-slate-500">Tasks designated to your account by system administrators or leads</p>

          <div className="flex flex-col gap-3 mt-2">
            {userAssignedReminders.length > 0 ? (userAssignedReminders.map((rem) => (<div key={rem.id} className="p-4 bg-slate-55 rounded-2xl border border-slate-200/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div>
                <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-black font-mono tracking-wider ${rem.priority === 'Critical' || rem.priority === 'High' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                  {rem.priority} Priority
                </span>
                <h5 className="text-xs font-bold text-slate-800 mt-1.5">{rem.title}</h5>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">{rem.description}</p>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0 self-start sm:self-auto">Due: {rem.date}</span>
            </div>))) : (<div className="p-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
              Excellent! All assigned duties are fully sorted.
            </div>)}
          </div>
        </div>

        {/* Announcements Panel */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
          <h4 className="font-display text-md font-bold text-slate-900">Corporate Announcements</h4>
          <p className="text-xs text-slate-500">Enterprise news and permission notifications</p>

          <div className="flex flex-col gap-3 mt-2">
            {notifications.filter(n => n.type === 'Announcement' || n.type === 'Permission').slice(0, 3).map((ntf) => (<div key={ntf.id} className="p-3 bg-blue-50/40 rounded-xl border border-blue-100/40 flex flex-col gap-1 text-xs text-left">
              <p className="font-bold text-blue-900">{ntf.title}</p>
              <p className="text-[11px] text-slate-600">{ntf.description}</p>
              <span className="font-mono text-[9px] text-slate-400 mt-1">{ntf.timestamp}</span>
            </div>))}
          </div>
        </div>

      </div>

    </div>)}

    {/* Today's Tasks Section for Admin/Manager */}
    {(role === 'Admin' || role === 'Manager') && (
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-6 text-left mt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display text-lg font-extrabold text-slate-900">Today's Tasks Status by Location</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitor daily checklist performance, location coverage, and verification files uploaded by operators.
              </p>
            </div>
          </div>
          <button
            id="refresh-today-tasks-btn"
            onClick={fetchTodayTasks}
            className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-xs transition-all hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${tasksLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-600">Filter by Location</label>
            <div className="relative">
              <select
                id="dashboard-location-filter"
                value={selectedLocationId}
                onChange={handleLocationChange}
                className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All Locations</option>
                {locationsList.map((loc) => (
                  <option key={loc.location_id} value={loc.location_id}>
                    {loc.district} • {loc.godown} ({loc.sloc || 'No SLOC'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-600">Filter by Status</label>
            <select
              id="dashboard-status-filter"
              value={selectedStatus}
              onChange={handleStatusChange}
              className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All Statuses</option>
              <option value="active">Pending Completion</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Tasks Content */}
        {tasksLoading ? (
          <div className="py-12 text-center text-xs font-semibold text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            Loading today's tasks...
          </div>
        ) : todayTasks.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <CheckCircle2 className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-700">No tasks active today for the selected filters</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting the filters or check back later.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Responsive Card List (stacked layout) */}
            <div className="flex flex-col gap-4">
              {todayTasks.map((task) => {
                const isCompleted = task.is_completed;
                return (
                  <div
                    key={`${task.todo_id}-${task.todo_location_id}`}
                    className="p-5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/80 transition-all shadow-xs flex flex-col gap-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${task.schedule === 'daily' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                              task.schedule === 'weekly' ? 'bg-violet-50 text-violet-700 border border-violet-100' :
                                task.schedule === 'monthly' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                  'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                            {task.schedule}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-slate-200/80 text-slate-700">
                            {task.type}
                          </span>
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold rounded-lg text-[10px] border border-emerald-100">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Completed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 font-extrabold rounded-lg text-[10px] border border-amber-100">
                              <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-slate-800 mt-2">{task.title}</h4>
                        {task.description && (
                          <p className="text-xs text-slate-500 mt-1 leading-normal max-w-2xl">{task.description}</p>
                        )}
                      </div>

                      {/* Location Details */}
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left sm:text-right shrink-0">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Location</p>
                        <p className="text-xs font-bold text-slate-800 mt-0.5">
                          {task.location?.godown || 'N/A'}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {task.location?.district || 'N/A'} {task.location?.sloc ? `• ${task.location.sloc}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Completion Metadata & Files */}
                    {isCompleted && task.completion && (
                      <div className="mt-2 pt-3 border-t border-slate-200/60 flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="text-slate-600 font-medium">
                            Completed by <span className="font-bold text-slate-800">{task.completion.completed_by_user?.full_name || `User #${task.completion.completed_by}`}</span>
                            {task.completion.completed_by_user?.phone_number && ` (${task.completion.completed_by_user.phone_number})`}
                          </div>
                          <div className="text-slate-400 font-mono text-[11px]">
                            {formatDateTime(task.completion.completed_at)}
                          </div>
                        </div>

                        {/* Remarks */}
                        {task.completion.remarks && (
                          <div className="bg-white p-3 rounded-xl border border-slate-200/60 text-xs">
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Worker Remarks</p>
                            <p className="text-slate-700 italic mt-1 font-medium">"{task.completion.remarks}"</p>
                          </div>
                        )}

                        {/* Metrics data for Stock or Checkbox type */}
                        {(task.type === 'stock' || task.type === 'checkbox') && (
                          <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
                            {task.type === 'stock' && (
                              <>
                                <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">PPC</p>
                                  <p className="text-xs font-extrabold text-slate-800 mt-0.5">{task.completion.ppc ?? '-'}</p>
                                </div>
                                <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">WP</p>
                                  <p className="text-xs font-extrabold text-slate-800 mt-0.5">{task.completion.wp ?? '-'}</p>
                                </div>
                                <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">Super</p>
                                  <p className="text-xs font-extrabold text-slate-800 mt-0.5">{task.completion.super ?? '-'}</p>
                                </div>
                                <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">CNT PPC</p>
                                  <p className="text-xs font-extrabold text-slate-800 mt-0.5">{task.completion.cnt_ppc ?? '-'}</p>
                                </div>
                                <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">CNT WP</p>
                                  <p className="text-xs font-extrabold text-slate-800 mt-0.5">{task.completion.cnt_wp ?? '-'}</p>
                                </div>
                                <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">CNT Super</p>
                                  <p className="text-xs font-extrabold text-slate-800 mt-0.5">{task.completion.cnt_super ?? '-'}</p>
                                </div>
                                <div className="bg-white p-2 rounded-xl border border-slate-200/60 sm:col-span-3">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">Week</p>
                                  <p className="text-xs font-extrabold text-slate-800 mt-0.5">{task.completion.week ?? '-'}</p>
                                </div>
                              </>
                            )}
                            {task.type === 'checkbox' && (
                              <div className="col-span-3 bg-white p-2 rounded-xl border border-slate-200/60">
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Checklist Responses</p>
                                <div className="mt-2 grid gap-1.5">
                                  {(task.completion.checkbox_items_response || []).map((item) => (
                                    <div key={item.key} className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] font-bold text-slate-700">
                                      <span>{item.label}</span>
                                      <span className={item.response ? 'text-emerald-600' : 'text-rose-600'}>
                                        {item.response ? 'Yes' : 'No'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Media attachments */}
                        {Array.isArray(task.completion.files) && task.completion.files.length > 0 && (
                          <div className="flex flex-col gap-1.5">
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Attached Media Files</p>
                            <div className="flex flex-wrap gap-3">
                              {task.completion.files.map((file) => {
                                const fileUrl = getBackendFileUrl(file.file_url);
                                const isPhoto = file.file_type === 'photo';
                                const fileName = file.file_name || (isPhoto ? 'photo-attachment' : 'video-attachment');

                                return (
                                  <div key={file.file_id || file.file_url} className="relative group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                                    {isPhoto ? (
                                      <button
                                        type="button"
                                        className="relative block h-20 w-20 cursor-pointer overflow-hidden"
                                        onClick={() => setActiveAttachment({ url: fileUrl, type: 'photo', name: fileName })}
                                      >
                                        <img src={fileUrl} alt={fileName} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                                        <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <ImageIcon className="w-5 h-5 text-white filter drop-shadow-md" />
                                        </div>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setActiveAttachment({ url: fileUrl, type: 'video', name: fileName })}
                                        className="flex h-20 w-20 flex-col items-center justify-center p-2 text-center hover:bg-slate-50 transition-colors"
                                      >
                                        <VideoIcon className="w-6 h-6 text-violet-500 mb-1" />
                                        <span className="text-[9px] font-bold text-slate-500 line-clamp-1 w-full px-1">{fileName}</span>
                                        <ExternalLink className="w-2.5 h-2.5 text-slate-400 mt-0.5" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => downloadAttachment(fileUrl, fileName)}
                                      className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-lg bg-white/95 text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-blue-600 hover:text-white"
                                      title="Download attachment"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
                <p className="text-xs font-bold text-slate-500">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                  </button>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )}

    {/* Modal for Previewing Attached Media */}
    <Modal
      isOpen={Boolean(activeAttachment)}
      onClose={() => setActiveAttachment(null)}
      title={`Verification ${activeAttachment?.type === 'video' ? 'Video' : 'Photo'} Attachment`}
      maxWidthClass="max-w-3xl"
      footerButtons={[
        { label: 'Close', onClick: () => setActiveAttachment(null) },
        { label: 'Download', onClick: () => downloadAttachment(activeAttachment?.url, activeAttachment?.name), variant: 'secondary' },
        { label: 'Open in New Tab', onClick: () => window.open(activeAttachment?.url, '_blank'), variant: 'primary' }
      ]}
    >
      <div className="flex justify-center bg-slate-950 rounded-2xl overflow-hidden p-2">
        {activeAttachment?.type === 'video' ? (
          <video src={activeAttachment.url} controls playsInline className="max-h-[60vh] w-full object-contain" />
        ) : (
          <img src={activeAttachment?.url} alt="Verification attachment preview" className="max-h-[60vh] object-contain" />
        )}
      </div>
    </Modal>

  </div>);
};
