import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StateProvider, useAppState } from './contexts/StateContext';
import { LoginPage } from './pages/LoginPage';
import { AppLayout } from './layouts/AppLayout';
import { ToastDisplay } from './components/ToastDisplay';

// Individual application modules pages
import { DashboardPage } from './pages/DashboardPage';
import { UserManagementPage } from './pages/UserManagementPage';

import { StockPage } from './pages/StockPage';
import { ReportsPage } from './pages/ReportsPage';
import { ReminderPage } from './pages/ReminderPage';
import { TodoPage } from './pages/TodoPage';
import { ActivityLogsPage } from './pages/ActivityLogsPage';
import { SettingsPage } from './pages/SettingsPage';

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAppState();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const GuestGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAppState();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

function AppContent() {
  return (
    <>
      <ToastDisplay />
      <Routes>
        <Route 
          path="/login" 
          element={
            <GuestGuard>
              <LoginPage />
            </GuestGuard>
          } 
        />

        <Route 
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/users" element={<UserManagementPage />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/todos" element={<TodoPage />} />
          <Route path="/reminders" element={<ReminderPage />} />
          <Route path="/activities" element={<ActivityLogsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <StateProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </StateProvider>
  );
}
