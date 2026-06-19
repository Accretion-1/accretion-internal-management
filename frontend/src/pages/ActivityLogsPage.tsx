import React, { useState } from 'react';
import { useAppState } from '../contexts/StateContext';
import { ActivityLog } from '../types';
import { ClipboardList, Search, Filter, Shield, RefreshCw } from 'lucide-react';

export const ActivityLogsPage: React.FC = () => {
  const { activities, showToast } = useAppState();

  // Search filter params
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');

  const CATEGORIES = ['Auth', 'UserManagement', 'Permission', 'Reminder', 'Stock', 'System'];

  const filteredLogs = activities.filter((act) => {
    const searchStr = `${act.userName} ${act.action} ${act.details} ${act.ipAddress}`.toLowerCase();
    const matchesSearch = searchStr.includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || act.category === categoryFilter;
    const matchesRole = roleFilter === 'All' || act.role === roleFilter;
    return matchesSearch && matchesCategory && matchesRole;
  });

  const getCategoryThemeClass = (cat: string) => {
    switch (cat) {
      case 'Auth':
        return 'bg-blue-50 text-blue-700 border border-blue-100';
      case 'UserManagement':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
      case 'Permission':
        return 'bg-violet-50 text-violet-700 border border-violet-100';
      case 'Reminder':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-100';
      case 'Stock':
        return 'bg-amber-50 text-amber-750 border border-amber-100';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans text-left pb-10">
      
      {/* Header title */}
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-indigo-600" />
          Workspace Audit Logs
        </h2>
        <p className="text-xs text-slate-500 mt-1">Review complete chronological security audits. Access, creations, movements, and credential changes are recorded automatically.</p>
      </div>

      {/* Filter panel strip */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row gap-3">
          
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              id="log-search-query"
              type="text"
              placeholder="Search by username, action description, audit details, or IP addresses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-205 rounded-xl text-xs placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:bg-white transition-all text-slate-800"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category selection */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400">Action:</span>
              <select
                id="log-cat-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="All">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Role Filter dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400">Authority:</span>
              <select
                id="log-role-filter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="All">All Roles</option>
                <option value="Admin">Admin only</option>
                <option value="Manager">Manager only</option>
                <option value="User">User only</option>
              </select>
            </div>

            {/* Sync trigger */}
            <button
              id="sync-logs-btn"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('All');
                setRoleFilter('All');
                showToast('Re-indexed active security database log files.', 'success');
              }}
              className="p-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 transition-all cursor-pointer"
              title="Re-synchronize directories"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* Main logs table list */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-500 text-left min-w-[800px]">
            
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400 font-bold select-none">
              <tr>
                <th className="px-6 py-4.5">Audit Stamp</th>
                <th className="px-6 py-4.5">Authorized Actor</th>
                <th className="px-6 py-4.5">Account Role</th>
                <th className="px-6 py-4.5">Action Code</th>
                <th className="px-6 py-4.5">Category category</th>
                <th className="px-6 py-4.5">Audit Transaction Details</th>
                <th className="px-6 py-4.5 text-center">IP Allocation</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-150">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    
                    {/* Timestamp */}
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-slate-600 font-semibold">{log.timestamp}</span>
                    </td>

                    {/* Actor displays */}
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-900">{log.userName}</span>
                    </td>

                    {/* Role displays badge */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        log.role === 'Admin' 
                          ? 'bg-rose-50 text-rose-700' 
                          : log.role === 'Manager' 
                          ? 'bg-amber-50 text-amber-750' 
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {log.role}
                      </span>
                    </td>

                    {/* Action description */}
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-705 italic">"{log.action}"</span>
                    </td>

                    {/* Category column */}
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${getCategoryThemeClass(log.category)}`}>
                        {log.category}
                      </span>
                    </td>

                    {/* Exact detailed logs */}
                    <td className="px-6 py-4">
                      <p className="text-slate-600 text-xs font-semibold max-w-sm line-clamp-2">{log.details}</p>
                    </td>

                    {/* IP sectors addresses */}
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono text-xs text-slate-400 font-semibold">{log.ipAddress}</span>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                        <Shield className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-display font-semibold text-slate-800 text-sm">No Security log entries found</h4>
                        <p className="text-xs text-slate-400 mt-1">Revise your database filters or search fields and retry.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>

        {/* Small listing log footer info */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-150 text-xs text-slate-500 flex justify-between font-medium">
          <span>Found <strong className="text-slate-805 font-bold">{filteredLogs.length}</strong> matching transaction trails in workspace cache</span>
          <span>Logs cleared down every 90 days.</span>
        </div>

      </div>

    </div>
  );
};
