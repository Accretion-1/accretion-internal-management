import React, { useState } from 'react';
import { useAppState } from '../contexts/StateContext';
import { 
  LayoutDashboard, Users, Shield, Package, BarChart4, Clock, 
  Bell, ClipboardList, Settings, LogOut, ChevronLeft, ChevronRight,
  Menu, X, ShieldAlert, CheckSquare, BellRing, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Sidebar nav options list
interface SidebarNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  allowedRoles: ('Admin' | 'Manager' | 'User')[];
}

const SIDEBAR_ITEMS: SidebarNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, allowedRoles: ['Admin', 'Manager', 'User'] },
  { id: 'users', label: 'User Management', icon: Users, allowedRoles: ['Admin', 'Manager'] },
  { id: 'permissions', label: 'Permissions Matrix', icon: Shield, allowedRoles: ['Admin'] },
  { id: 'stock', label: 'Stock Management', icon: Package, allowedRoles: ['Admin', 'Manager', 'User'] },
  { id: 'reports', label: 'Reports & Stats', icon: BarChart4, allowedRoles: ['Admin', 'Manager'] },
  { id: 'reminders', label: 'Schedule & To-Dos', icon: Clock, allowedRoles: ['Admin', 'Manager', 'User'] },
  { id: 'activities', label: 'Workspace Audits', icon: ClipboardList, allowedRoles: ['Admin'] },
  { id: 'settings', label: 'Settings', icon: Settings, allowedRoles: ['Admin', 'Manager', 'User'] }
];

interface AppLayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ activeTab, setActiveTab, children }) => {
  const { currentUser, logout, notifications, markAllNotificationsAsRead, addNotificationCount } = useAppState();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  if (!currentUser) return null;

  // Route protection evaluations
  const currentTabItem = SIDEBAR_ITEMS.find(item => item.id === activeTab);
  const isTabAllowed = currentTabItem 
    ? currentTabItem.allowedRoles.includes(currentUser.role) 
    : false;

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="relative min-h-screen bg-slate-50 flex font-sans overflow-hidden">
      
      {/* BACKGROUND DECORATIONS */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-blue-100/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-100/10 rounded-full blur-3xl pointer-events-none" />

      {/* SIDEBAR NAVIGATION: Collapsible, Collapsed/Expanded states, Collapsed width 84px, Expanded width 280px */}
      <div 
        className={`hidden md:flex flex-col bg-slate-900 text-slate-400 border-r border-slate-800 relative z-30 shrink-0 select-none transition-all duration-300 ${
          isSidebarCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        {/* Core Title header section */}
        <div className={`h-[72px] border-b border-slate-800 flex items-center shrink-0 ${isSidebarCollapsed ? 'justify-center' : 'justify-between px-6'}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-md shrink-0 transition-colors">
              W
            </div>
            {!isSidebarCollapsed && (
              <span className="font-display font-extrabold text-white text-[17px] tracking-tight">
                WorkSphere
              </span>
            )}
          </div>
          
          {/* Collapse/Expand Toggle Switch */}
          {!isSidebarCollapsed && (
            <button
              id="sidebar-collapse-toggle"
              onClick={() => setIsSidebarCollapsed(true)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        {isSidebarCollapsed && (
          <button
            id="sidebar-expand-toggle"
            onClick={() => setIsSidebarCollapsed(false)}
            className="absolute top-4.5 right-[-14px] w-7 h-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-800 shadow-md cursor-pointer z-50 transition-transform"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Sidebar Nav anchors */}
        <div className="flex-1 py-6 flex flex-col justify-between overflow-y-auto px-4 gap-4">
          <nav className="flex flex-col gap-1.5 list-none m-0 p-0 text-left">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const hasAccess = item.allowedRoles.includes(currentUser.role);
              
              if (!hasAccess && isSidebarCollapsed) return null; // hide forbidden items in collapsed

              return (
                <button
                  key={item.id}
                  id={`sidebar-nav-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 py-2.5 rounded-xl text-xs font-bold transition-all relative cursor-pointer ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : !hasAccess 
                      ? 'text-slate-600 hover:bg-transparent opacity-40 cursor-not-allowed'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  } ${isSidebarCollapsed ? 'justify-center px-0' : 'px-4.5'}`}
                  title={item.label}
                  disabled={!hasAccess && isActive}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!isSidebarCollapsed && (
                    <span className="flex-1 truncate">{item.label}</span>
                  )}
                  {!isSidebarCollapsed && !hasAccess && (
                    <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 bg-slate-800 text-slate-500 rounded uppercase font-sans">Lock</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Collapsed logout indicator button */}
          <button
            id="sidebar-logout-btn"
            onClick={logout}
            className={`flex items-center gap-3 py-2.5 rounded-xl text-xs font-bold text-rose-450 hover:bg-rose-900/10 hover:text-rose-400 transition-all cursor-pointer text-left ${
              isSidebarCollapsed ? 'justify-center px-0' : 'px-4.5'
            }`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!isSidebarCollapsed && <span className="truncate">Sign out session</span>}
          </button>
        </div>
      </div>

      {/* MOBILE COLLAPSIBLE DRAWER SIDEBAR */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -250 }}
              animate={{ x: 0 }}
              exit={{ x: -250 }}
              transition={{ type: 'spring', damping: 25 }}
              className="relative w-72 bg-slate-900 text-slate-400 border-r border-slate-800 flex flex-col p-5 h-full"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-5 mb-5 shrink-0">
                <span className="font-display font-extrabold text-white text-lg tracking-tight flex items-center gap-2">
                  <span className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-md">W</span>
                  WorkSphere
                </span>
                <button
                  id="mobile-nav-close"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 flex flex-col gap-1.5 overflow-y-auto text-left py-2">
                {SIDEBAR_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const hasAccess = item.allowedRoles.includes(currentUser.role);

                  return (
                    <button
                      key={item.id}
                      id={`mobile-nav-${item.id}`}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-3.5 px-4.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-blue-600 text-white shadow-lg' 
                          : !hasAccess 
                          ? 'text-slate-600 hover:bg-transparent opacity-40 cursor-not-allowed'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <button
                id="mobile-nav-logout"
                onClick={logout}
                className="flex items-center gap-3.5 px-4.5 py-3 rounded-2xl text-xs font-bold text-rose-450 hover:bg-rose-950/20 cursor-pointer transition-colors shrink-0 mt-4 text-left"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <span>Exit session</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SHELL HEADER + CLIENT CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* TOP SHELL HEADER: Height 72px */}
        <header className="h-[72px] bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 relative z-20">
          
          <div className="flex items-center gap-3">
            {/* Mobile Sidebar open trigger */}
            <button
              id="mobile-sidebar-hamburger"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
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
              <button
                id="header-bell-button"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-600 hover:bg-slate-100 transition-all cursor-pointer relative"
              >
                <Bell className="w-5 h-5" />
                {addNotificationCount > 0 && (
                  <span className="absolute top-0 right-0 w-5 h-5 bg-rose-500 border border-white text-white font-mono font-bold text-[9px] rounded-full flex items-center justify-center animate-bounce shadow">
                    {addNotificationCount}
                  </span>
                )}
              </button>

              {/* Expandable Notification center Timeline dropdown */}
              <AnimatePresence>
                {isNotificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsNotificationsOpen(false)} />
                    
                    <motion.div
                      key="notifications-dropdown-overlay"
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute -right-2 sm:right-0 top-12 bg-white border border-slate-200 rounded-3xl shadow-2xl p-5 w-[calc(100vw-2rem)] sm:w-96 max-w-[384px] z-40 text-left flex flex-col gap-4"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <BellRing className="w-4.5 h-4.5 text-blue-600" />
                          <h4 className="font-display text-sm font-bold text-slate-905">Unread Signals ({addNotificationCount})</h4>
                        </div>
                        {addNotificationCount > 0 && (
                          <button
                            id="header-mark-all-read"
                            onClick={() => {
                              markAllNotificationsAsRead();
                              setIsNotificationsOpen(false);
                            }}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
                        {notifications.length > 0 ? (
                          notifications.map((ntf) => (
                            <div 
                              key={ntf.id} 
                              className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-1 ${
                                ntf.read 
                                  ? 'bg-slate-50 text-slate-500 border-slate-200/40' 
                                  : 'bg-blue-50/40 text-slate-800 border-blue-100/60'
                              }`}
                            >
                              <div className="flex justify-between items-start text-xs font-bold leading-normal">
                                <span>{ntf.title}</span>
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  ntf.read ? 'bg-transparent' : 'bg-blue-600'
                                }`} />
                              </div>
                              <p className="text-[11px] text-slate-500 leading-relaxed font-sans">{ntf.description}</p>
                              <span className="font-mono text-[9px] text-slate-400 mt-1">{ntf.timestamp}</span>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-slate-400 text-xs italic">
                            All cleared down. No notifications.
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Profile trigger */}
            <div className="flex items-center gap-2">
              <div 
                onClick={() => handleNavClick('settings')}
                className="w-9 h-9 bg-slate-900 border border-slate-850 hover:bg-slate-800 rounded-xl text-white flex items-center justify-center font-display font-bold text-xs shadow-sm cursor-pointer shrink-0 transition-colors"
                title="Your Profile settings"
              >
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-800">{currentUser.name}</span>
                <span className="text-[10px] text-slate-400 font-medium font-mono">Division: {currentUser.department}</span>
              </div>
            </div>

          </div>

        </header>

        {/* WORKSPACE APP MAIN CLIENT AREA */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 relative">
          
          <AnimatePresence mode="wait">
            {isTabAllowed ? (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-7xl mx-auto"
              >
                {children}
              </motion.div>
            ) : (
              
              /* HIGH-FIDELITY 403 ACCESS DENIED CARD VIEW */
              <motion.div
                key="403-error-forbidden"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md mx-auto py-16 text-center select-none"
              >
                <div className="bg-white border border-rose-200/80 shadow-2xl rounded-3xl p-8 flex flex-col items-center gap-5 relative overflow-hidden text-left">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 to-rose-400" />
                  
                  <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                    <ShieldAlert className="w-7 h-7" />
                  </div>

                  <div>
                    <h3 className="font-display font-extrabold text-slate-900 text-lg">403 Access Safeguard</h3>
                    <p className="text-xs text-rose-700 font-semibold bg-rose-50 border border-rose-100 p-2 rounded-xl mt-2 leading-relaxed">
                      Secured Entry Denied. Your personal Role credentials [<strong>{currentUser.role}</strong>] lack View permissions mapped on this module interface.
                    </p>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed font-sans">
                    WorkSphere enforces strict role authorization logic. Administrators map these criteria inside the <strong>Permissions Matrix</strong> to coordinate safe boundaries.
                  </p>

                  <button
                    id="return-dashboard-403"
                    onClick={() => setActiveTab('dashboard')}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs py-3 text-center cursor-pointer transition-colors"
                  >
                    Return to Safe Dashboard
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </main>

      </div>

    </div>
  );
};
