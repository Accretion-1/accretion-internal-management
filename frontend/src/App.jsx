import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StateProvider, useAppState } from './contexts/StateContext';
import { LoginPage } from './pages/LoginPage';
import { AppLayout } from './layouts/AppLayout';
import { ToastDisplay } from './components/ToastDisplay';
import { Toaster } from 'react-hot-toast';
import { ActivityLoadingBar } from './components/loading/ActivityLoadingBar';
import { GlobalLoadingOverlay } from './components/loading/GlobalLoadingOverlay';
import { InstallBanner } from './components/InstallBanner';
import { useAppSelector } from './store/hooks/reduxHooks';
import { selectAuthUser, selectIsAuthenticated } from './store/selectors/authSelectors';
// Individual application modules pages
import { DashboardPage } from './pages/DashboardPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { StockPage } from './pages/StockPage';
import { ReportsPage } from './pages/ReportsPage';
import { ReminderPage } from './pages/ReminderPage';
import { TodoPage } from './pages/TodoPage';
import { ActivityLogsPage } from './pages/ActivityLogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LocationsPage } from './pages/LocationsPage';
const PANEL_ROUTE_BY_ID = {
    1: '/dashboard',
    2: '/users',
    3: '/todos',
    4: '/reminder-schedule',
    5: '/locations',
    6: '/settings',
};
const PANEL_ROUTE_BY_NAME = {
    dashboard: '/dashboard',
    'user management': '/users',
    'to-dos management': '/todos',
    'todos management': '/todos',
    'reminder schedule management': '/reminder-schedule',
    locations: '/locations',
    settings: '/settings',
};
const normalizePanelName = (panelName) => String(panelName || '').trim().toLowerCase();
const getAuthenticatedHomePath = (authUser) => {
    const role = String(authUser?.role || '').toUpperCase();
    if (role === 'ADMIN' || role === 'MANAGER') {
        return '/dashboard';
    }
    const panels = Array.isArray(authUser?.panels) ? authUser.panels : [];
    const firstRoute = panels
        .map((panel) => PANEL_ROUTE_BY_ID[Number(panel.panel_id)] || PANEL_ROUTE_BY_NAME[normalizePanelName(panel.panel_name)])
        .find(Boolean);
    return firstRoute || '/settings';
};
const AuthGuard = ({ children }) => {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    if (!isAuthenticated)
        return <Navigate to="/login" replace/>;
    return <>{children}</>;
};
const GuestGuard = ({ children }) => {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const authUser = useAppSelector(selectAuthUser);
    if (isAuthenticated)
        return <Navigate to={getAuthenticatedHomePath(authUser)} replace/>;
    return <>{children}</>;
};
const HomeRedirect = () => {
    const authUser = useAppSelector(selectAuthUser);
    return <Navigate to={getAuthenticatedHomePath(authUser)} replace/>;
};
const AuthStateBridge = () => {
    const authUser = useAppSelector(selectAuthUser);
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const { currentUser, setCurrentUser, users } = useAppState();
    useEffect(() => {
        if (!isAuthenticated || !authUser) {
            if (currentUser)
                setCurrentUser(null);
            return;
        }
        const authPanels = Array.isArray(authUser.panels) ? authUser.panels : [];
        if (currentUser?.id === String(authUser.user_id) && (currentUser.panels?.length || 0) === authPanels.length)
            return;
        const normalizedPhone = String(authUser.phone_number || '').replace(/\D/g, '');
        const existingUser = users.find((user) => user.phone.replace(/\D/g, '') === normalizedPhone);
        const role = `${String(authUser.role || 'USER').charAt(0)}${String(authUser.role || 'USER').slice(1).toLowerCase()}`;
        const panelModules = authPanels.map((panel) => panel.panel_name || String(panel.panel_id));
        setCurrentUser(existingUser ? {
            ...existingUser,
            panels: authPanels,
            assignedModules: panelModules,
        } : {
            id: String(authUser.user_id),
            name: authUser.full_name || authUser.phone_number,
            phone: authUser.phone_number,
            email: authUser.email || '',
            role,
            status: authUser.is_active ? 'Active' : 'Inactive',
            panels: authPanels,
            assignedModules: panelModules,
            createdDate: authUser.created_at || new Date().toISOString(),
            lastLogin: new Date().toISOString(),
        });
    }, [authUser, currentUser, isAuthenticated, setCurrentUser, users]);
    return null;
};
function AppContent() {
    return (<>
      <AuthStateBridge />
      <Toaster position="top-right" toastOptions={{ duration: 4000 }}/>
      <ToastDisplay />
      <ActivityLoadingBar />
      <GlobalLoadingOverlay />
      <InstallBanner className="fixed bottom-5 left-1/2 z-[120] flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-center gap-3 rounded-2xl border border-blue-200 bg-white p-4 text-sm text-slate-700 shadow-2xl" />
      <Routes>
        <Route path="/login" element={<GuestGuard>
              <LoginPage />
            </GuestGuard>}/>

        <Route element={<AuthGuard>
              <AppLayout />
            </AuthGuard>}>
          <Route path="/" element={<HomeRedirect />}/>
          <Route path="/dashboard" element={<DashboardPage />}/>
          <Route path="/users" element={<UserManagementPage />}/>
          <Route path="/stock" element={<StockPage />}/>
          <Route path="/reports" element={<ReportsPage />}/>
          <Route path="/todos" element={<TodoPage />}/>
          <Route path="/reminders" element={<ReminderPage />}/>
          <Route path="/reminder-schedule" element={<ReminderPage />}/>
          <Route path="/locations" element={<LocationsPage />}/>
          <Route path="/activities" element={<ActivityLogsPage />}/>
          <Route path="/settings" element={<SettingsPage />}/>
          
          <Route path="*" element={<HomeRedirect />}/>
        </Route>
      </Routes>
    </>);
}
export default function App() {
    return (<StateProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </StateProvider>);
}
