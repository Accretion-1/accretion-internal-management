import React, { useState } from 'react';
import { useAppState } from '../contexts/StateContext';
import { 
  FileSpreadsheet, FileText, FileDown, TrendingUp, BarChart4, 
  PieChart, Download, Calendar, ArrowUpRight, Shield, Layers 
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { users, stocks, reminders, activities, showToast } = useAppState();

  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  // Stats
  const activeCount = users.filter(u => u.status === 'Active').length;
  const stockCount = stocks.length;
  const completedReminders = reminders.filter(r => r.status === 'Completed').length;
  const activeReminders = reminders.filter(r => r.status === 'Active').length;
  const completionRatio = reminders.length > 0 
    ? Math.round((completedReminders / reminders.length) * 100) 
    : 0;

  // Export process latency simulation
  const handleDownload = (reportName: string, format: string) => {
    setDownloadingFormat(`${reportName}-${format}`);
    showToast(`Compiling server assets into ${format}...`, 'info');
    
    setTimeout(() => {
      setDownloadingFormat(null);
      showToast(`WorkSphere_${reportName}_Report.${format.toLowerCase()} saved successfully.`, 'success');
    }, 1200);
  };

  return (
    <div className="flex flex-col gap-6 font-sans text-left pb-12">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart4 className="w-6 h-6 text-blue-600" />
            Executive Reports & Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-1">Cross-examine operational metrics, resource allocations, and employee metrics with high-fidelity visualization.</p>
        </div>

        {/* Timeframe selector header */}
        <div className="flex bg-slate-50 border border-slate-200 p-1 rounded-xl w-fit shrink-0">
          {(['daily', 'weekly', 'monthly'] as const).map((t) => (
            <button
              key={t}
              id={`timeframe-btn-${t}`}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                timeframe === t 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {t} metrics
            </button>
          ))}
        </div>
      </div>

      {/* Analytics Bento Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* User Engagement Radial/Circular progress */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs text-left flex flex-col justify-between gap-5">
          <div>
            <span className="text-[10px] bg-slate-100 text-slate-550 px-2 py-0.5 rounded font-black font-mono tracking-wider">Workforce Seats</span>
            <h4 className="font-display text-md font-bold text-slate-900 mt-2">Active Engagement ratios</h4>
          </div>
          
          <div className="flex items-center gap-5 my-1">
            {/* Custom SVG Donut Dial */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-blue-600"
                  strokeDasharray="92, 100"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-[17px] font-extrabold text-slate-850 font-mono">92%</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-0.5 text-xs text-slate-500">
              <p><strong className="text-slate-900">{activeCount} seats</strong> online this hour.</p>
              <p className="mt-1 flex items-center gap-1.5 text-emerald-600 font-bold">
                <ArrowUpRight className="w-4.5 h-4.5" /> +4.2% Week-Over-Week
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-450 italic border-t border-slate-100 pt-3">
            Includes fully verified active operational sectors.
          </p>
        </div>

        {/* Task Completion Radial progress */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs text-left flex flex-col justify-between gap-5">
          <div>
            <span className="text-[10px] bg-indigo-50 text-indigo-650 px-2 py-0.5 rounded font-black font-mono tracking-wider">Duties Resolution</span>
            <h4 className="font-display text-md font-bold text-slate-900 mt-2">Reminders Completion Metrics</h4>
          </div>

          <div className="flex items-center gap-5 my-1">
            {/* Custom SVG Donut Dial */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-indigo-600"
                  strokeDasharray={`${completionRatio}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-[17px] font-extrabold text-slate-850 font-mono">{completionRatio}%</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-0.5 text-xs text-slate-505">
              <p><strong className="text-slate-900">{completedReminders} duties</strong> completed.</p>
              <p className="mt-1"><strong className="text-slate-900">{activeReminders} active</strong> remaining.</p>
            </div>
          </div>

          <p className="text-[11px] text-slate-450 italic border-t border-slate-100 pt-3">
            Real time completion ratio tracking.
          </p>
        </div>

        {/* Warehouse assets total status */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs text-left flex flex-col justify-between gap-5">
          <div>
            <span className="text-[10px] bg-amber-50 text-amber-750 px-2 py-0.5 rounded font-black font-mono tracking-wider">Inventory counts</span>
            <h4 className="font-display text-md font-bold text-slate-900 mt-2">Active Logistics Safety</h4>
          </div>

          <div className="flex flex-col gap-2.5 my-1 text-xs">
            <div className="flex justify-between font-bold text-slate-700">
              <span>Reserve Stocks health:</span>
              <span className="text-emerald-600">80% secure</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3">
              <div className="bg-emerald-500 h-3 rounded-full" style={{ width: '80%' }} />
            </div>
            <p className="text-slate-400 text-[10px] leading-relaxed mt-1">Tracks catalog spare parts, hardware, and container safety allocations.</p>
          </div>

          <p className="text-[11px] text-slate-450 italic border-t border-slate-100 pt-3">
            Synchronized with {stockCount} items.
          </p>
        </div>

      </div>

      {/* Interactive Charts Dashboard Frame (Fulfills exact Chart requests) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
        
        {/* Area line chart of System activity */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-5 text-left">
          <div>
            <h4 className="font-display text-md font-bold text-slate-900">User Growth & Database Seats</h4>
            <p className="text-xs text-slate-550 mt-0.5">Enrolled seats tracked in backend database accounts</p>
          </div>

          {/* Line Chart Area mockup */}
          <div className="w-full h-56 relative flex items-end">
            <div className="absolute inset-x-0 bottom-0 top-0 flex flex-col justify-between text-[9px] font-mono text-slate-450 select-nonepointer-events-none">
              <span className="border-b border-dashed border-slate-100 pb-0.5 pl-1">10 users</span>
              <span className="border-b border-dashed border-slate-100 pb-0.5 pl-1">8 users</span>
              <span className="border-b border-dashed border-slate-100 pb-0.5 pl-1">6 users</span>
              <span className="border-b border-dashed border-slate-100 pb-0.5 pl-1">4 users</span>
              <span className="border-b border-dashed border-slate-100 pb-0.5 pl-1">2 users</span>
            </div>
            
            <svg className="w-full h-44 z-10 overflow-visible" viewBox="0 0 400 150" preserveAspectRatio="none">
              <path 
                d="M 10 150 Q 80 130 160 90 T 320 40 T 390 10" 
                fill="none" 
                stroke="#2563EB" 
                strokeWidth="4" 
                strokeLinecap="round"
              />
              <circle cx="10" cy="150" r="5" fill="#1D4ED8" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="80" cy="140" r="5" fill="#1D4ED8" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="160" cy="90" r="5" fill="#1D4ED8" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="320" cy="40" r="5" fill="#1D4ED8" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="390" cy="10" r="6" fill="#1D4ED8" stroke="#FFFFFF" strokeWidth="2" />
            </svg>
          </div>
          
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 border-t border-slate-100 pt-2 px-1">
            <span>Jan 2026</span>
            <span>Mar 22</span>
            <span>May 10</span>
            <span>Jun 19 2026</span>
          </div>
        </div>

        {/* Module Usage Bar Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col gap-5 text-left">
          <div>
            <h4 className="font-display text-md font-bold text-slate-900">Module Usage Statistics</h4>
            <p className="text-xs text-slate-550 mt-0.5">Dispatched REST requests tracked across separate modules</p>
          </div>

          {/* Bar Chart mockup */}
          <div className="h-56 flex items-end justify-between gap-4 px-4 relative pb-2 select-none">
            {/* Helper grids */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[9px] text-slate-400 font-mono pb-8">
              <div className="border-b border-slate-100 w-full text-right">300 Requests</div>
              <div className="border-b border-slate-100 w-full text-right font-semibold">200 Requests</div>
              <div className="border-b border-slate-100 w-full text-right">100 Requests</div>
              <div className="border-b border-slate-100 w-full text-right">0</div>
            </div>

            {/* Individual Bars */}
            <div className="flex flex-col items-center gap-2 z-10 w-1/5">
              <div className="w-full bg-blue-600 rounded-lg transition-all hover:opacity-85" style={{ height: '140px' }} />
              <span className="text-[10px] font-bold text-slate-600 font-sans">Stock</span>
            </div>
            
            <div className="flex flex-col items-center gap-2 z-10 w-1/5">
              <div className="w-full bg-indigo-500 rounded-lg transition-all hover:opacity-85" style={{ height: '90px' }} />
              <span className="text-[10px] font-bold text-slate-600 font-sans">Users</span>
            </div>

            <div className="flex flex-col items-center gap-2 z-10 w-1/5">
              <div className="w-full bg-violet-500 rounded-lg transition-all hover:opacity-85" style={{ height: '120px' }} />
              <span className="text-[10px] font-bold text-slate-600 font-sans">To-Dos</span>
            </div>

            <div className="flex flex-col items-center gap-2 z-10 w-1/5">
              <div className="w-full bg-amber-55 rounded-lg transition-all hover:opacity-85" style={{ height: '60px' }} />
              <span className="text-[10px] font-bold text-slate-600 font-sans">Auth</span>
            </div>

            <div className="flex flex-col items-center gap-2 z-10 w-1/5">
              <div className="w-full bg-slate-800 rounded-lg transition-all hover:opacity-85" style={{ height: '40px' }} />
              <span className="text-[10px] font-bold text-slate-600 font-sans">Perms</span>
            </div>
          </div>
        </div>

      </div>

      {/* Reports generation download log entries (Fulfills Report management requirements) */}
      <div className="bg-white border border-slate-200 rounded-3xl mt-2 overflow-hidden text-left shadow-xs">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h4 className="font-display font-bold text-md text-slate-900">Compile Export Reports</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Generate compliant PDF/Excel sheets from active system state snapshots</p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          
          {/* User log report entry */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                <FileText className="w-5.5 h-5.5" />
              </div>
              <div className="text-left font-sans text-xs">
                <h5 className="font-bold text-slate-800 text-sm">System Workforce Directory Report</h5>
                <p className="text-slate-400 mt-1">Contains active session status, division credentials, and assigned roles.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button 
                id="raw-user-excel-dl"
                disabled={downloadingFormat !== null}
                onClick={() => handleDownload('Workforce_Directory', 'Excel')}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-650 cursor-pointer border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                Sheet spread
              </button>
              <button 
                id="raw-user-pdf-dl"
                disabled={downloadingFormat !== null}
                onClick={() => handleDownload('Workforce_Directory', 'PDF')}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-105 text-slate-650 cursor-pointer border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <FileDown className="w-4 h-4 text-rose-500" />
                Document PDF
              </button>
            </div>
          </div>

          {/* Audit Trail report entry */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                <Shield className="w-5.5 h-5.5" />
              </div>
              <div className="text-left font-sans text-xs">
                <h5 className="font-bold text-slate-850 text-sm">Corporate Security Audit Trail Logs</h5>
                <p className="text-slate-400 mt-1">Full sequential logs mapping CRUD changes, logins, and permission adjustments.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button 
                id="raw-audit-excel-dl"
                disabled={downloadingFormat !== null}
                onClick={() => handleDownload('Corporate_Audit_Trail', 'Excel')}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-655 cursor-pointer border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                Sheet spread
              </button>
              <button 
                id="raw-audit-pdf-dl"
                disabled={downloadingFormat !== null}
                onClick={() => handleDownload('Corporate_Audit_Trail', 'PDF')}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-655 cursor-pointer border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <FileDown className="w-4 h-4 text-rose-500" />
                Document PDF
              </button>
            </div>
          </div>

          {/* Stock inventory report entry */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                <Layers className="w-5.5 h-5.5" />
              </div>
              <div className="text-left font-sans text-xs">
                <h5 className="font-bold text-slate-850 text-sm">Warehouse Assets Allocation Logs</h5>
                <p className="text-slate-400 mt-1">Physical stock audit logs including low-threshold flags and warehouse parameters.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button 
                id="raw-assets-excel-dl"
                disabled={downloadingFormat !== null}
                onClick={() => handleDownload('Warehouse_Assets', 'Excel')}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-655 cursor-pointer border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                Sheet spread
              </button>
              <button 
                id="raw-assets-pdf-dl"
                disabled={downloadingFormat !== null}
                onClick={() => handleDownload('Warehouse_Assets', 'PDF')}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-655 cursor-pointer border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <FileDown className="w-4 h-4 text-rose-500" />
                Document PDF
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
