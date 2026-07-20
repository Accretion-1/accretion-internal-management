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
import { useAppDispatch } from './store/hooks/reduxHooks';
import { selectAuthUser, selectIsAuthenticated } from './store/selectors/authSelectors';
import { syncAuthenticatedUser } from './store/slices/authSlice';
import { listenForForegroundNotifications, refreshAndSyncFcmToken } from './services/notification.service';
import apiHandler from './store/api/apiHandler';
import { API_ENDPOINTS } from './store/api/endpoints';
// Individual application modules pages
import { DashboardPage } from './pages/DashboardPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { StockPage } from './pages/StockPage';
import { ReportsPage } from './pages/ReportsPage';
import { ReminderPage } from './pages/ReminderPage';
import { TodoPage } from './pages/TodoPage';
import { TodoDetailPage } from './pages/TodoDetailPage';
import { ActivityLogsPage } from './pages/ActivityLogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LocationsPage } from './pages/LocationsPage';
import { GodownSlipsPage } from './pages/GodownSlipsPage';
const PANEL_ROUTE_BY_ID = {
    1: '/dashboard',
    2: '/users',
    3: '/todos',
    4: '/reminder-schedule',
    5: '/locations',
    6: '/settings',
    7: '/reports',
    8: '/godown-slips',
};
const PANEL_ROUTE_BY_NAME = {
    dashboard: '/dashboard',
    'user management': '/users',
    'to-dos management': '/todos',
    'todos management': '/todos',
    'reminder schedule management': '/reminder-schedule',
    locations: '/locations',
    settings: '/settings',
    'reports management': '/reports',
    reports: '/reports',
    'godown slips': '/godown-slips',
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
    const dispatch = useAppDispatch();
    const panelsSignature = JSON.stringify(
        (authUser?.panels || []).map((panel) => ({
            panel_id: Number(panel.panel_id),
            panel_name: panel.panel_name || '',
        })),
    );
    useEffect(() => {
        if (!isAuthenticated || !authUser) {
            if (currentUser)
                setCurrentUser(null);
            return;
        }
        const authPanels = Array.isArray(authUser.panels) ? authUser.panels : [];
        const normalizedPhone = String(authUser.phone_number || '').replace(/\D/g, '');
        const existingUser = users.find((user) => user.phone.replace(/\D/g, '') === normalizedPhone);
        const role = `${String(authUser.role || 'USER').charAt(0)}${String(authUser.role || 'USER').slice(1).toLowerCase()}`;
        const panelModules = authPanels.map((panel) => panel.panel_name || String(panel.panel_id));
        const nextCurrentUser = existingUser ? {
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
        };

        const currentSignature = JSON.stringify({
            id: currentUser?.id || null,
            panels: (currentUser?.panels || []).map((panel) => ({
                panel_id: Number(panel.panel_id),
                panel_name: panel.panel_name || '',
            })),
        });
        const nextSignature = JSON.stringify({
            id: nextCurrentUser.id,
            panels: (nextCurrentUser.panels || []).map((panel) => ({
                panel_id: Number(panel.panel_id),
                panel_name: panel.panel_name || '',
            })),
        });

        if (currentSignature !== nextSignature) {
            setCurrentUser(nextCurrentUser);
        }
    }, [authUser, currentUser, dispatch, isAuthenticated, panelsSignature, setCurrentUser, users]);

    useEffect(() => {
        if (!isAuthenticated) return undefined;

        let isMounted = true;
        let isRefreshing = false;

        const refreshProfile = async () => {
            if (isRefreshing) return;
            isRefreshing = true;
            try {
                const response = await apiHandler({
                    method: 'GET',
                    url: API_ENDPOINTS.USER.PROFILE,
                    showNotification: false,
                });
                const refreshedUser = response?.data || null;
                if (isMounted && refreshedUser) {
                    dispatch(syncAuthenticatedUser(refreshedUser));
                }
            } catch (error) {
                if (Number(error?.status) !== 401 && Number(error?.code) !== 401) {
                    console.warn('Unable to refresh user profile:', error);
                }
            } finally {
                isRefreshing = false;
            }
        };

        refreshProfile();

        const handleFocus = () => refreshProfile();
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                refreshProfile();
            }
        };

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            isMounted = false;
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [dispatch, isAuthenticated]);
    return null;
};
function AppContent() {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    useEffect(() => {
        let unsubscribe = () => {};
        let isMounted = true;

        listenForForegroundNotifications()
            .then((cleanup) => {
                if (isMounted) {
                    unsubscribe = cleanup;
                } else {
                    cleanup?.();
                }
            })
            .catch((error) => {
                console.warn('Unable to listen for foreground notifications:', error);
            });

        return () => {
            isMounted = false;
            unsubscribe?.();
        };
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return undefined;

        refreshAndSyncFcmToken().catch((error) => {
            if (Number(error?.status) !== 401 && Number(error?.code) !== 401) {
                console.warn('Unable to sync FCM token:', error);
            }
        });

        return undefined;
    }, [isAuthenticated]);

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
          <Route path="/todos/:todoId" element={<TodoDetailPage />}/>
          <Route path="/reminders" element={<ReminderPage />}/>
          <Route path="/reminder-schedule" element={<ReminderPage />}/>
          <Route path="/locations" element={<LocationsPage />}/>
          <Route path="/activities" element={<ActivityLogsPage />}/>
          <Route path="/settings" element={<SettingsPage />}/>
          <Route path="/godown-slips" element={<GodownSlipsPage />}/>
          
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
