import React, { useState } from 'react';
import { useAppState } from '../contexts/StateContext';
import { Settings, ShieldCheck, Building2, UserCircle, Globe, HardDrive, KeyRound } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { currentUser, settings, updateSettings, isLoading } = useAppState();

  const isUserOnly = currentUser?.role === 'User';
  const isAdmin = currentUser?.role === 'Admin';

  // Config parameters
  const [orgName, setOrgName] = useState(settings.organizationName);
  const [safetyLevel, setSafetyLevel] = useState(settings.securityLevel);
  const [mfa, setMfa] = useState(settings.mfaRequired);
  const [ipRanges, setIpRanges] = useState(settings.allowedIpRanges);
  const [theme, setTheme] = useState(settings.themeColor);

  // User Profile
  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profileEmail, setProfileEmail] = useState(currentUser?.email || '');

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateSettings({
      organizationName: orgName,
      securityLevel: safetyLevel,
      mfaRequired: mfa,
      allowedIpRanges: ipRanges,
      themeColor: theme
    });
  };

  return (
    <div className="flex flex-col gap-6 font-sans text-left pb-12 max-w-4xl mx-auto">
      
      {/* Title Header */}
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-600" />
          Workspace Configurations & Settings
        </h2>
        <p className="text-xs text-slate-500 mt-1">Configure security guidelines, corporate organization attributes, and verify personal directory listings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-2">
        
        {/* Profile Card Left Segment */}
        <div className="md:col-span-4 flex flex-col gap-6">
          <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
            
            {/* Visual Profile picture logo */}
            <div className="w-20 h-20 bg-slate-900 text-white rounded-3xl flex items-center justify-center font-display font-extrabold text-3xl shadow-lg relative">
              {currentUser?.name.charAt(0)}
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full" />
            </div>

            <div className="select-none">
              <h4 className="font-display text-base font-bold text-slate-900">{currentUser?.name}</h4>
              <p className="text-[11px] text-slate-500 font-medium font-mono mt-0.5">{currentUser?.email}</p>
              
              <span className="inline-block mt-3 px-3 py-1 text-[10px] uppercase font-bold bg-blue-100 text-blue-700 rounded-full">
                {currentUser?.role}
              </span>
            </div>

            <div className="w-full border-t border-slate-100 pt-3 text-xs text-slate-500 flex flex-col gap-1 text-left select-none">
              <span className="font-medium">Department: <strong className="text-slate-800">{currentUser?.department}</strong></span>
              <span className="font-medium">Onboarded: <strong className="text-slate-800">{currentUser?.createdDate}</strong></span>
            </div>

          </div>

          {/* Quick Sandbox preset help panel */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 flex flex-col gap-3">
            <h5 className="font-display font-bold text-xs uppercase tracking-widest text-slate-400">Security Gateways</h5>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              WorkSphere employs an active OAuth verification schema protecting sensitive /admin routes instantly. Live requests enforce role parameters recursively.
            </p>
          </div>
        </div>

        {/* Configurations Fields Right Segment */}
        <div className="md:col-span-8 flex flex-col gap-6">
          
          {/* Organization Details Configurations (Admin only) */}
          <form onSubmit={handleSaveSecurity} className="bg-white border border-slate-200/80 shadow-xs rounded-2xl p-6 flex flex-col gap-5">
            
            <div className="border-b border-secondary/5 pb-3 flex items-center justify-between">
              <h4 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4.5 h-4.5 text-slate-400" />
                SaaS Organization Attributes
              </h4>
              <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Enterprise root</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-750">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs">Corporate Display Name</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="px-4 py-2.5 bg-slate-50 disabled:bg-slate-100/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-105 focus:bg-white text-xs font-semibold text-slate-800"
                />
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs">System Safety Protocol Level</label>
                <select
                  disabled={!isAdmin}
                  value={safetyLevel}
                  onChange={(e) => setSafetyLevel(e.target.value as any)}
                  className="px-4 py-2.5 bg-slate-50 disabled:bg-slate-100/60 border border-slate-200 rounded-xl focus:outline-none text-xs font-semibold text-slate-800 cursor-pointer"
                >
                  <option value="Standard">Standard security checks</option>
                  <option value="High">High strictness constraints</option>
                  <option value="Strict">Strict IP mapping whitelist only</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-750 pt-1">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs">Sector IP ranges allowed Whitelist</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={ipRanges}
                  onChange={(e) => setIpRanges(e.target.value)}
                  placeholder="e.g. 192.168.0.0/16"
                  className="px-4 py-2.5 bg-slate-50 disabled:bg-slate-100/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-105 focus:bg-white text-xs font-mono font-bold text-slate-800"
                />
              </div>

              <div className="flex flex-col gap-2 text-left justify-center">
                <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-705">
                  <input
                    type="checkbox"
                    disabled={!isAdmin}
                    checked={mfa}
                    onChange={(e) => setMfa(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  Enforce MFA credentials for Manager logins
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-1">
              <span className="text-[11px] text-slate-400">
                {!isAdmin ? "Only account administrators are entitled to reconfigure secure corporate features." : "Changes deploy instantly."}
              </span>
              
              {isAdmin && (
                <button
                  id="save-settings-btn"
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  {isLoading ? 'Saving Changes...' : 'Commit Settings'}
                </button>
              )}
            </div>

          </form>

          {/* Directory Verification Section */}
          <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl p-6 flex flex-col gap-5 text-left">
            <div className="border-b border-secondary/5 pb-3">
              <h4 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4.5 h-4.5 text-slate-400" />
                Active Verified Scope Listing
              </h4>
            </div>

            <div className="flex flex-col gap-1 text-xs text-slate-505 font-medium select-none">
              <span>Primary Phone Node: <strong className="text-slate-800">{currentUser?.phone}</strong></span>
              <span className="mt-1">Assigned Operational panels:</span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {currentUser?.assignedModules.map((m) => (
                  <span key={m} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
