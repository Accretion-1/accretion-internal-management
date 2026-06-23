import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAppState } from '../contexts/StateContext';
import { LayoutDashboard, Users, Package, BarChart4, Bell, ClipboardList, Settings, LogOut, ChevronLeft, ChevronRight, Menu, X, ShieldAlert, CheckSquare, BellRing, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppDispatch } from '../store/hooks/reduxHooks';
import { logout as logoutAuth } from '../store/slices/authSlice';
const SIDEBAR_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, allowedRoles: ['Admin', 'Manager', 'User'] },
    { id: 'users', label: 'User Management', icon: Users, allowedRoles: ['Admin', 'Manager'] },
    { id: 'reminders', label: 'Reminders', icon: Bell, allowedRoles: ['Admin', 'Manager', 'User'] },
    { id: 'todos', label: 'To-Dos Management', icon: CheckSquare, allowedRoles: ['Admin', 'Manager', 'User'] },
    { id: 'reminder-schedule', label: 'Reminder Schedule Management', icon: BellRing, allowedRoles: ['Admin', 'Manager', 'User'] },
    { id: 'locations', label: 'Locations', icon: MapPin, allowedRoles: ['Admin', 'Manager', 'User'] },
    { id: 'settings', label: 'Settings', icon: Settings, allowedRoles: ['Admin', 'Manager', 'User'] }
];
const ROUTE_ACCESS_ITEMS = [
    ...SIDEBAR_ITEMS,
    { id: 'stock', label: 'Stock Management', icon: Package, allowedRoles: ['Admin', 'Manager', 'User'] },
    { id: 'reports', label: 'Reports & Stats', icon: BarChart4, allowedRoles: ['Admin', 'Manager'] },
    { id: 'activities', label: 'Workspace Audits', icon: ClipboardList, allowedRoles: ['Admin'] },
];
const MOBILE_OVERLAY_TRANSITION = { duration: 0.18, ease: 'easeOut' };
const MOBILE_SIDEBAR_VARIANTS = {
    closed: {
        x: '-104%',
        transition: {
            duration: 0.24,
            ease: [0.4, 0, 0.2, 1],
        },
    },
    open: {
        x: 0,
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 34,
            mass: 0.8,
        },
    },
};
export const AppLayout = () => {
    const { currentUser, logout, notifications, markAllNotificationsAsRead, addNotificationCount } = useAppState();
    const dispatch = useAppDispatch();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    if (!currentUser)
        return null;
    const location = useLocation();
    const navigate = useNavigate();
    const activeTab = location.pathname.substring(1) || 'dashboard';
    // Route protection evaluations
    const currentTabItem = ROUTE_ACCESS_ITEMS.find(item => item.id === activeTab);
    const isTabAllowed = currentTabItem
        ? currentTabItem.allowedRoles.includes(currentUser.role)
        : false;
    const handleNavClick = (tabId) => {
        navigate(`/${tabId}`);
        setIsMobileSidebarOpen(false);
    };
    const openMobileSidebar = () => {
        setIsNotificationsOpen(false);
        setIsMobileSidebarOpen(true);
    };
    const closeMobileSidebar = () => setIsMobileSidebarOpen(false);
    const handleLogout = () => {
        setIsMobileSidebarOpen(false);
        logout();
        dispatch(logoutAuth());
    };
    useEffect(() => {
        if (!isMobileSidebarOpen)
            return undefined;
        const originalOverflow = document.body.style.overflow;
        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                closeMobileSidebar();
            }
        };
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleEscape);
        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isMobileSidebarOpen]);
    return (<div className="relative flex h-screen min-h-0 overflow-hidden bg-slate-50 font-sans">
      
      {/* BACKGROUND DECORATIONS */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-blue-100/20 rounded-full blur-3xl pointer-events-none"/>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-100/10 rounded-full blur-3xl pointer-events-none"/>

      {/* SIDEBAR NAVIGATION: Collapsible, Collapsed/Expanded states, Collapsed width 84px, Expanded width 280px */}
      <div className={`relative z-30 hidden h-screen max-h-screen shrink-0 select-none flex-col overflow-hidden border-r border-slate-800 bg-slate-900 text-slate-400 transition-all duration-300 md:flex ${isSidebarCollapsed ? 'w-20' : 'w-72'}`}>
        {/* Core Title header section */}
        <div className={`h-[72px] border-b border-slate-800 flex items-center shrink-0 ${isSidebarCollapsed ? 'justify-center' : 'justify-between px-6'}`}>
          <div className="flex items-center gap-3">
            <img
              src="/icons/pwa-192x192.png"
              alt="Accretion"
              className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-md"
            />
            {!isSidebarCollapsed && (<span className="font-display font-extrabold text-white text-[17px] tracking-tight">
                WorkSphere
              </span>)}
          </div>
          
          {/* Collapse/Expand Toggle Switch */}
          {!isSidebarCollapsed && (<button id="sidebar-collapse-toggle" onClick={() => setIsSidebarCollapsed(true)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-200 transition-colors cursor-pointer">
              <ChevronLeft className="w-5 h-5"/>
            </button>)}
        </div>

        {isSidebarCollapsed && (<button id="sidebar-expand-toggle" onClick={() => setIsSidebarCollapsed(false)} className="absolute top-4.5 right-[-14px] w-7 h-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-800 shadow-md cursor-pointer z-50 transition-transform">
            <ChevronRight className="w-4 h-4"/>
          </button>)}

        {/* Sidebar Nav anchors */}
        <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
          <nav className="m-0 flex min-h-0 flex-1 list-none flex-col gap-1.5 overflow-y-auto overscroll-contain py-2 pr-1 text-left">
            {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const hasAccess = item.allowedRoles.includes(currentUser.role);
            if (!hasAccess)
                return null;
            return (<button key={item.id} id={`sidebar-nav-${item.id}`} onClick={() => handleNavClick(item.id)} className={`w-full flex items-center gap-3 py-2.5 rounded-xl text-xs font-bold transition-all relative cursor-pointer ${isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : !hasAccess
                        ? 'text-slate-600 hover:bg-transparent opacity-40 cursor-not-allowed'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'} ${isSidebarCollapsed ? 'justify-center px-0' : 'px-4.5'}`} title={item.label} disabled={!hasAccess && isActive}>
                  <Icon className="w-5 h-5 shrink-0"/>
                  {!isSidebarCollapsed && (<span className="flex-1 truncate">{item.label}</span>)}
                  {!isSidebarCollapsed && !hasAccess && (<span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 bg-slate-800 text-slate-500 rounded uppercase font-sans">Lock</span>)}
                </button>);
        })}
          </nav>

          {/* Collapsed logout indicator button */}
          <div className="mt-3 shrink-0 border-t border-slate-800 pt-4">
          <button id="sidebar-logout-btn" onClick={handleLogout} className={`flex w-full items-center gap-3 rounded-xl py-2.5 text-left text-xs font-bold text-rose-450 transition-all hover:bg-rose-900/10 hover:text-rose-400 cursor-pointer ${isSidebarCollapsed ? 'justify-center px-0' : 'px-4.5'}`}>
            <LogOut className="w-5 h-5 shrink-0"/>
            {!isSidebarCollapsed && <span className="truncate">Sign out session</span>}
          </button>
          </div>
        </div>
      </div>

      {/* MOBILE COLLAPSIBLE DRAWER SIDEBAR */}
      <AnimatePresence initial={false}>
        {isMobileSidebarOpen && (<div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true" aria-label="Main navigation">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={MOBILE_OVERLAY_TRANSITION} className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={closeMobileSidebar}/>
            <motion.aside initial="closed" animate="open" exit="closed" variants={MOBILE_SIDEBAR_VARIANTS} className="relative flex h-full w-[min(86vw,22rem)] transform-gpu flex-col overflow-hidden rounded-r-[2rem] border-r border-white/10 bg-slate-950 text-slate-400 shadow-2xl shadow-slate-950/40 will-change-transform">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-blue-600/15 to-transparent"/>
              <div className="relative flex shrink-0 items-center justify-between border-b border-white/10 px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
                <span className="font-display flex items-center gap-3 text-lg font-extrabold tracking-tight text-white">
                  <img
                    src="/icons/pwa-192x192.png"
                    alt="Accretion"
                    className="h-10 w-10 rounded-2xl object-cover shadow-lg shadow-blue-950/40"
                  />
                  <span className="leading-none">WorkSphere</span>
                </span>
                <button id="mobile-nav-close" type="button" onClick={closeMobileSidebar} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition-all hover:bg-white/10 hover:text-white active:scale-95" aria-label="Close navigation">
                  <X className="h-5 w-5"/>
                </button>
              </div>

              <nav className="relative flex flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-4 py-5 text-left">
                {SIDEBAR_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const hasAccess = item.allowedRoles.includes(currentUser.role);
                if (!hasAccess)
                    return null;
                return (<button key={item.id} id={`mobile-nav-${item.id}`} type="button" onClick={() => handleNavClick(item.id)} aria-current={isActive ? 'page' : undefined} className={`group relative flex w-full cursor-pointer items-center gap-3.5 rounded-2xl px-4 py-3.5 text-left text-sm font-bold transition-all duration-200 active:scale-[0.98] ${isActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-950/30'
                        : !hasAccess
                            ? 'text-slate-600 hover:bg-transparent opacity-40 cursor-not-allowed'
                            : 'text-slate-400 hover:bg-white/7 hover:text-slate-100'}`}>
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${isActive ? 'bg-white/15 text-white' : 'bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-slate-100'}`}>
                        <Icon className="h-4.5 w-4.5"/>
                      </span>
                      <span className="min-w-0 flex-1 leading-snug">{item.label}</span>
                      {isActive && <span className="h-2 w-2 shrink-0 rounded-full bg-white/90 shadow-sm"/>}
                    </button>);
            })}
              </nav>

              <div className="relative shrink-0 border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button id="mobile-nav-logout" type="button" onClick={handleLogout} className="flex w-full cursor-pointer items-center gap-3.5 rounded-2xl px-4 py-3.5 text-left text-sm font-bold text-rose-300 transition-all hover:bg-rose-500/10 hover:text-rose-200 active:scale-[0.98]">
                <LogOut className="h-5 w-5 shrink-0"/>
                <span>Exit session</span>
              </button>
              </div>
            </motion.aside>
          </div>)}
      </AnimatePresence>

      {/* SHELL HEADER + CLIENT CONTENT CONTAINER */}
      <div className="relative flex h-screen min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        
        {/* TOP SHELL HEADER: Height 72px */}
        <header className="h-[72px] bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 relative z-20">
          
          <div className="flex items-center gap-3">
            {/* Mobile Sidebar open trigger */}
            <button id="mobile-sidebar-hamburger" type="button" onClick={openMobileSidebar} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95 md:hidden" aria-label="Open navigation">
              <Menu className="h-5 w-5"/>
            </button>
            
            <div className="flex flex-col text-left">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none">Security Core Active</span>
              <h1 className="font-display font-semibold text-slate-850 text-sm mt-1 flex items-center gap-2">
                {currentUser.name} 
                <span className="hidden sm:inline-block px-2 py-0.5 text-[9px] uppercase tracking-wider font-extrabold bg-slate-900 text-slate-300 rounded-md">
                  {currentUser.role} Scope
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            
            {/* Dynamic notifications Bell & Pop-down Overlay (Fulfills unread timelines center) */}
            <div className="relative">
              <button id="header-bell-button" onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="p-2 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-600 hover:bg-slate-100 transition-all cursor-pointer relative">
                <Bell className="w-5 h-5"/>
                {addNotificationCount > 0 && (<span className="absolute top-0 right-0 w-5 h-5 bg-rose-500 border border-white text-white font-mono font-bold text-[9px] rounded-full flex items-center justify-center animate-bounce shadow">
                    {addNotificationCount}
                  </span>)}
              </button>

              {/* Expandable Notification center Timeline dropdown */}
              <AnimatePresence>
                {isNotificationsOpen && (<>
                    <div className="fixed inset-0 z-30" onClick={() => setIsNotificationsOpen(false)}/>
                    
                    <motion.div key="notifications-dropdown-overlay" initial={{ opacity: 0, y: 15, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute -right-2 sm:right-0 top-12 bg-white border border-slate-200 rounded-3xl shadow-2xl p-5 w-[calc(100vw-2rem)] sm:w-96 max-w-[384px] z-40 text-left flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <BellRing className="w-4.5 h-4.5 text-blue-600"/>
                          <h4 className="font-display text-sm font-bold text-slate-905">Unread Signals ({addNotificationCount})</h4>
                        </div>
                        {addNotificationCount > 0 && (<button id="header-mark-all-read" onClick={() => {
                    markAllNotificationsAsRead();
                    setIsNotificationsOpen(false);
                }} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer">
                            Mark all read
                          </button>)}
                      </div>

                      <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
                        {notifications.length > 0 ? (notifications.map((ntf) => (<div key={ntf.id} className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-1 ${ntf.read
                    ? 'bg-slate-50 text-slate-500 border-slate-200/40'
                    : 'bg-blue-50/40 text-slate-800 border-blue-100/60'}`}>
                              <div className="flex justify-between items-start text-xs font-bold leading-normal">
                                <span>{ntf.title}</span>
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ntf.read ? 'bg-transparent' : 'bg-blue-600'}`}/>
                              </div>
                              <p className="text-[11px] text-slate-500 leading-relaxed font-sans">{ntf.description}</p>
                              <span className="font-mono text-[9px] text-slate-400 mt-1">{ntf.timestamp}</span>
                            </div>))) : (<div className="p-8 text-center text-slate-400 text-xs italic">
                            All cleared down. No notifications.
                          </div>)}
                      </div>
                    </motion.div>
                  </>)}
              </AnimatePresence>
            </div>

            {/* Profile trigger */}
            <div className="flex items-center gap-2">
              <div onClick={() => handleNavClick('settings')} className="w-9 h-9 bg-slate-900 border border-slate-850 hover:bg-slate-800 rounded-xl text-white flex items-center justify-center font-display font-bold text-xs shadow-sm cursor-pointer shrink-0 transition-colors" title="Your Profile settings">
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-800">{currentUser.name}</span>

              </div>
            </div>

          </div>

        </header>

        {/* WORKSPACE APP MAIN CLIENT AREA */}
        <main className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 md:p-8">
          
          <AnimatePresence mode="wait">
            {isTabAllowed ? (<motion.div key={activeTab} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="w-full max-w-7xl mx-auto">
                <Outlet />
              </motion.div>) : (
        /* HIGH-FIDELITY 403 ACCESS DENIED CARD VIEW */
        <motion.div key="403-error-forbidden" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md mx-auto py-16 text-center select-none">
                <div className="bg-white border border-rose-200/80 shadow-2xl rounded-3xl p-8 flex flex-col items-center gap-5 relative overflow-hidden text-left">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 to-rose-400"/>
                  
                  <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                    <ShieldAlert className="w-7 h-7"/>
                  </div>

                  <div>
                    <h3 className="font-display font-extrabold text-slate-900 text-lg">403 Access Safeguard</h3>
                    <p className="text-xs text-rose-700 font-semibold bg-rose-50 border border-rose-100 p-2 rounded-xl mt-2 leading-relaxed">
                      Secured Entry Denied. Your personal Role credentials [<strong>{currentUser.role}</strong>] lack View permissions mapped on this module interface.
                    </p>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed font-sans">
                    WorkSphere enforces strict role authorization logic. Administrators map these criteria to coordinate safe boundaries.
                  </p>

                  <button id="return-dashboard-403" onClick={() => navigate('/dashboard')} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs py-3 text-center cursor-pointer transition-colors">
                    Return to Safe Dashboard
                  </button>
                </div>
              </motion.div>)}
          </AnimatePresence>

        </main>

      </div>

    </div>);
};
