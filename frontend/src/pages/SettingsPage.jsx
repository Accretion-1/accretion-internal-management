import React from 'react';
import { useAppState } from '../contexts/StateContext';
import { Settings, Phone, ShieldCheck, MapPin, Layers, CalendarDays, UserRound } from 'lucide-react';

export const SettingsPage = () => {
    const { currentUser } = useAppState();
    const panels = Array.isArray(currentUser?.panels) ? currentUser.panels : [];
    const initials = String(currentUser?.name || currentUser?.phone || 'U').charAt(0).toUpperCase();

    return (
        <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-12 text-left font-sans">
            <div>
                <h2 className="font-display flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
                    <Settings className="h-6 w-6 text-indigo-600" />
                    Profile Settings
                </h2>
                <p className="mt-1 text-xs text-slate-500">View your authenticated profile, role, location, and assigned panels.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="lg:col-span-4">
                    <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xs">
                        <div className="relative flex h-24 w-24 items-center justify-center rounded-[2rem] bg-slate-900 font-display text-4xl font-extrabold text-white shadow-xl shadow-slate-200">
                            {initials}
                            <span className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-[3px] border-white ${currentUser?.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        </div>

                        <div>
                            <h3 className="font-display text-xl font-bold text-slate-900">{currentUser?.name || 'User'}</h3>
                            <p className="mt-1 font-mono text-xs font-semibold text-slate-400">{currentUser?.phone || '-'}</p>
                        </div>

                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-blue-700">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {currentUser?.role || 'User'} Role
                        </span>
                    </div>
                </div>

                <div className="lg:col-span-8">
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                        <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
                            <h4 className="font-display flex items-center gap-2 text-sm font-bold text-slate-900">
                                <UserRound className="h-4.5 w-4.5 text-slate-400" />
                                Profile Details
                            </h4>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-500">
                                {currentUser?.status || 'Active'}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    <Phone className="h-3.5 w-3.5" />
                                    Phone Number
                                </p>
                                <p className="mt-2 text-sm font-bold text-slate-900">{currentUser?.phone || '-'}</p>
                            </div>

                            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    Role
                                </p>
                                <p className="mt-2 text-sm font-bold text-slate-900">{currentUser?.role || '-'}</p>
                            </div>

                            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:col-span-2">
                                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    <MapPin className="h-3.5 w-3.5" />
                                    Location
                                </p>
                                {currentUser?.location ? (
                                    <div className="mt-2 grid grid-cols-1 gap-2 text-sm font-semibold text-slate-700 sm:grid-cols-2">
                                        <span>District: <strong className="text-slate-900">{currentUser.location.district || '-'}</strong></span>
                                        <span>Godown: <strong className="text-slate-900">{currentUser.location.godown || '-'}</strong></span>
                                        <span>SLOC: <strong className="text-slate-900">{currentUser.location.sloc ?? '-'}</strong></span>
                                        <span>Capacity: <strong className="text-slate-900">{currentUser.location.cap ?? '-'}</strong></span>
                                        <span className="sm:col-span-2">Remark: <strong className="text-slate-900">{currentUser.location.remark || '-'}</strong></span>
                                    </div>
                                ) : (
                                    <p className="mt-2 text-sm font-bold text-slate-900">No location assigned</p>
                                )}
                            </div>

                            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:col-span-2">
                                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    <Layers className="h-3.5 w-3.5" />
                                    Assigned Panels
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {panels.length > 0 ? panels.map((panel) => (
                                        <span key={panel.panel_id} className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                                            {panel.panel_name || `Panel ${panel.panel_id}`}
                                        </span>
                                    )) : (
                                        <span className="text-xs font-semibold text-slate-400">No panels assigned.</span>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:col-span-2">
                                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    <CalendarDays className="h-3.5 w-3.5" />
                                    Created Date
                                </p>
                                <p className="mt-2 text-sm font-bold text-slate-900">{currentUser?.createdDate || '-'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
