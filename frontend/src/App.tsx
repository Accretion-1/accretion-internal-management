import React, { useState } from 'react';
import { StateProvider, useAppState } from './contexts/StateContext';
import { LoginPage } from './pages/LoginPage';
import { AppLayout } from './layouts/AppLayout';
import { ToastDisplay } from './components/ToastDisplay';

// Individual application modules pages
import { DashboardPage } from './pages/DashboardPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { PermissionPage } from './pages/PermissionPage';
import { StockPage } from './pages/StockPage';
import { ReportsPage } from './pages/ReportsPage';
import { ReminderPage } from './pages/ReminderPage';
import { ActivityLogsPage } from './pages/ActivityLogsPage';
import { SettingsPage } from './pages/SettingsPage';

function AppContent() {
  const { isAuthenticated } = useAppState();
  
  // Local client routing active tab parameter
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  return (
    <>
      {/* Toast Overlay Notifications */}
      <ToastDisplay />

      {!isAuthenticated ? (
        <LoginPage />
      ) : (
        <AppLayout activeTab={activeTab} setActiveTab={setActiveTab}>
          {activeTab === 'dashboard' && <DashboardPage />}
          {activeTab === 'users' && <UserManagementPage />}
          {activeTab === 'permissions' && <PermissionPage />}
          {activeTab === 'stock' && <StockPage />}
          {activeTab === 'reports' && <ReportsPage />}
          {activeTab === 'reminders' && <ReminderPage />}
          {activeTab === 'activities' && <ActivityLogsPage />}
          {activeTab === 'settings' && <SettingsPage />}
        </AppLayout>
      )}
    </>
  );
}

export default function App() {
  return (
    <StateProvider>
      <AppContent />
    </StateProvider>
  );
}
