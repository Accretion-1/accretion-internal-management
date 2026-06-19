import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, StockItem, Reminder, Notification, ActivityLog, AppSettings } from '../types';
import { 
  INITIAL_USERS, 
  INITIAL_STOCKS, 
  INITIAL_REMINDERS, 
  INITIAL_NOTIFICATIONS, 
  INITIAL_ACTIVITIES, 
  DEFAULT_SETTINGS 
} from '../mock-data/initialData';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

const generateUniqueId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

interface StateContextType {
  // Auth State
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isAuthenticated: boolean;
  login: (phone: string, otp: string) => Promise<{ success: boolean; message: string; role?: UserRole }>;
  logout: () => void;

  // General Loading State
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;

  // Users State
  users: User[];
  createUser: (userData: Omit<User, 'id' | 'createdDate' | 'lastLogin'>) => Promise<boolean>;
  updateUser: (id: string, updatedData: Partial<User>) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  deactivateUser: (id: string) => Promise<boolean>;


  // Stock State
  stocks: StockItem[];
  executeStockIn: (id: string, qty: number, comments?: string) => Promise<boolean>;
  executeStockOut: (id: string, qty: number, comments?: string) => Promise<boolean>;
  createStockItem: (item: Omit<StockItem, 'id' | 'lastUpdated'>) => Promise<boolean>;

  // Reminders State
  reminders: Reminder[];
  createReminder: (reminderData: Omit<Reminder, 'id' | 'createdAt' | 'status'>) => Promise<boolean>;
  snoozeReminder: (id: string) => Promise<boolean>;
  completeReminder: (id: string) => Promise<boolean>;
  deleteReminder: (id: string) => Promise<boolean>;

  // Notifications State
  notifications: Notification[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  addNotificationCount: number;

  // Activities Log
  activities: ActivityLog[];
  logActivity: (action: string, category: ActivityLog['category'], details: string) => void;

  // Settings State
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<boolean>;

  // Toast System
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastMessage['type']) => void;
  dismissToast: (id: string) => void;
}

const StateContext = createContext<StateContextType | undefined>(undefined);

export const StateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial states from LocalStorage or Fallbacks
  const [currentUser, setCurrentUserInternal] = useState<User | null>(() => {
    const saved = localStorage.getItem('ws_curr_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('ws_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });


  const [stocks, setStocks] = useState<StockItem[]>(() => {
    const saved = localStorage.getItem('ws_stocks');
    return saved ? JSON.parse(saved) : INITIAL_STOCKS;
  });

  const [reminders, setReminders] = useState<Reminder[]>(() => {
    const saved = localStorage.getItem('ws_reminders');
    return saved ? JSON.parse(saved) : INITIAL_REMINDERS;
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('ws_notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [activities, setActivities] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('ws_activities');
    return saved ? JSON.parse(saved) : INITIAL_ACTIVITIES;
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('ws_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('ws_users', JSON.stringify(users));
  }, [users]);


  useEffect(() => {
    localStorage.setItem('ws_stocks', JSON.stringify(stocks));
  }, [stocks]);

  useEffect(() => {
    localStorage.setItem('ws_reminders', JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    localStorage.setItem('ws_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('ws_activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('ws_settings', JSON.stringify(settings));
  }, [settings]);

  // Toast controls
  const showToast = (message: string, type: ToastMessage['type'] = 'info') => {
    const id = generateUniqueId('toast');
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const setCurrentUser = (user: User | null) => {
    setCurrentUserInternal(user);
    if (user) {
      localStorage.setItem('ws_curr_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('ws_curr_user');
    }
  };

  // Helper inside StateContext to generate dynamic logs
  const logActivity = (action: string, category: ActivityLog['category'], details: string) => {
    const newLog: ActivityLog = {
      id: generateUniqueId('act'),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      userName: currentUser ? currentUser.name : 'System Visitor',
      role: currentUser ? currentUser.role : 'User',
      action,
      category,
      details,
      ipAddress: '192.168.10.' + (Math.floor(Math.random() * 200) + 10)
    };
    setActivities((prev) => [newLog, ...prev]);
  };

  // Auth Operations
  const login = async (phone: string, otp: string): Promise<{ success: boolean; message: string; role?: UserRole }> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 800)); // Simulated delay

    const formattedPhone = phone.replace(/[^0-9]/g, '');
    
    // Find matching preconfigured user inside list
    const foundUser = users.find((u) => u.phone.replace(/[^0-9]/g, '') === formattedPhone);

    if (!foundUser) {
      setIsLoading(false);
      showToast('Login failed. Phone number not registered.', 'error');
      return { success: false, message: 'Phone number not registered' };
    }

    if (otp !== '123456') {
      setIsLoading(false);
      showToast('Invalid OTP passcode.', 'error');
      return { success: false, message: 'Invalid OTP code' };
    }

    // Update last login
    const updatedUser = { 
      ...foundUser, 
      lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 16) 
    };
    
    setUsers(prev => prev.map(u => u.id === foundUser.id ? updatedUser : u));
    setCurrentUser(updatedUser);
    
    setIsLoading(false);
    showToast(`Logged in successfully as ${foundUser.role}!`, 'success');
    
    // Create login activity log
    const newLog: ActivityLog = {
      id: generateUniqueId('act'),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      userName: foundUser.name,
      role: foundUser.role,
      action: 'User Login',
      category: 'Auth',
      details: `Interactive OTP verification for ${foundUser.phone}`,
      ipAddress: '192.168.10.' + (Math.floor(Math.random() * 200) + 10)
    };
    setActivities(prev => [newLog, ...prev]);

    return { 
      success: true, 
      message: 'Logged in successfully', 
      role: foundUser.role 
    };
  };

  const logout = () => {
    if (currentUser) {
      logActivity('User Logout', 'Auth', 'Closed session safely');
    }
    setCurrentUser(null);
    showToast('Securely logged out from WorkSphere.', 'info');
  };

  // Users CRUD operations with simulated real async latency
  const createUser = async (userData: Omit<User, 'id' | 'createdDate' | 'lastLogin'>): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 600));

    // Validation checks
    if (!userData.name || userData.name.length < 2) {
      showToast('Name must be 2 or more characters.', 'error');
      setIsLoading(false);
      return false;
    }
    if (!/^\d{10}$/.test(userData.phone)) {
      showToast('Phone must be a valid 10-digit number.', 'error');
      setIsLoading(false);
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(userData.email)) {
      showToast('Please enter a valid email address.', 'error');
      setIsLoading(false);
      return false;
    }

    // Duplicate phone check
    if (users.some(u => u.phone.replace(/[^0-9]/g, '') === userData.phone.replace(/[^0-9]/g, ''))) {
      showToast('A user with this phone number already exists.', 'error');
      setIsLoading(false);
      return false;
    }

    const newUser: User = {
      ...userData,
      id: generateUniqueId('usr'),
      createdDate: new Date().toISOString().split('T')[0],
      lastLogin: 'Never'
    };

    setUsers((prev) => [...prev, newUser]);
    
    // Setup immediate System Notification
    const newNotification: Notification = {
      id: generateUniqueId('ntf'),
      title: 'New Account Onboarded',
      description: `${newUser.name} assigned to ${newUser.role} role.`,
      type: 'System',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      read: false,
      priority: 'medium'
    };
    setNotifications(prev => [newNotification, ...prev]);

    logActivity('Create User', 'UserManagement', `Created ${newUser.name} (${newUser.role})`);
    setIsLoading(false);
    showToast(`Successfully onboarded employee ${newUser.name}!`, 'success');
    return true;
  };

  const updateUser = async (id: string, updatedData: Partial<User>): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 650));

    // Validation check if updating relevant fields
    if (updatedData.name !== undefined && updatedData.name.length < 2) {
      showToast('Name must be 2 or more characters.', 'error');
      setIsLoading(false);
      return false;
    }

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const newUser = { ...u, ...updatedData };
          // If updating active user Profile
          if (currentUser && currentUser.id === id) {
            setCurrentUser(newUser);
          }
          return newUser;
        }
        return u;
      })
    );

    logActivity('Update User', 'UserManagement', `Modified profile attributes for user ID: ${id}`);
    setIsLoading(false);
    showToast('Employee information updated successfully.', 'success');
    return true;
  };

  const deleteUser = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 500));

    const targetUser = users.find(u => u.id === id);
    if (!targetUser) {
      setIsLoading(false);
      return false;
    }

    setUsers((prev) => prev.filter((u) => u.id !== id));
    logActivity('Delete User', 'UserManagement', `Removed ${targetUser.name} from global records`);
    setIsLoading(false);
    showToast(`Permanently deleted records for ${targetUser.name}.`, 'success');
    return true;
  };

  const deactivateUser = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 500));

    const targetUser = users.find(u => u.id === id);
    if (!targetUser) {
      setIsLoading(false);
      return false;
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: 'Inactive' } : u))
    );

    logActivity('Deactivate User', 'UserManagement', `Deactivated workspace access for ${targetUser.name}`);
    setIsLoading(false);
    showToast(`Successfully suspended workspace credentials for ${targetUser.name}.`, 'warning');
    return true;
  };


  // Stock operations (Stock In/Out)
  const executeStockIn = async (id: string, qty: number, comments?: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 500));

    let updatedItemName = '';
    let currentQty = 0;
    let threshold = 0;

    setStocks((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          updatedItemName = item.name;
          currentQty = item.quantity + qty;
          threshold = item.minThreshold;
          return {
            ...item,
            quantity: currentQty,
            lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 16)
          };
        }
        return item;
      })
    );

    logActivity('Stock In', 'Stock', `Added +${qty} units to ${updatedItemName}. Notes: ${comments || 'N/A'}`);
    setIsLoading(false);
    showToast(`Replenished +${qty} counts for ${updatedItemName}.`, 'success');
    return true;
  };

  const executeStockOut = async (id: string, qty: number, comments?: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 500));

    let updatedItemName = '';
    let isSuccess = true;
    let currentQty = 0;
    let threshold = 0;

    setStocks((prev) => {
      const exists = prev.find((item) => item.id === id);
      if (!exists) return prev;

      if (exists.quantity < qty) {
        showToast(`Failure: Insufficient stock. Only ${exists.quantity} available.`, 'error');
        isSuccess = false;
        return prev;
      }

      updatedItemName = exists.name;
      currentQty = exists.quantity - qty;
      threshold = exists.minThreshold;

      return prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            quantity: currentQty,
            lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 16)
          };
        }
        return item;
      });
    });

    if (!isSuccess) {
      setIsLoading(false);
      return false;
    }

    // Trigger low stock notifications
    if (currentQty <= threshold) {
      const alertNtf: Notification = {
        id: generateUniqueId('ntf'),
        title: 'Low Stock Hazard Alert',
        description: `Inventory level of physical asset "${updatedItemName}" dropped to ${currentQty} units [Threshold: ${threshold}].`,
        type: 'Reminder',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        read: false,
        priority: 'high'
      };
      setNotifications((prev) => [alertNtf, ...prev]);
      showToast(`Warning: Item stock has fallen into critical levels!`, 'warning');
    }

    logActivity('Stock Out', 'Stock', `Dispatched -${qty} units from ${updatedItemName}. Purpose: ${comments || 'N/A'}`);
    setIsLoading(false);
    showToast(`Dispatched -${qty} items successfully from warehouse allocation.`, 'success');
    return true;
  };

  const createStockItem = async (item: Omit<StockItem, 'id' | 'lastUpdated'>): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 600));

    const newItem: StockItem = {
      ...item,
      id: generateUniqueId('stk'),
      lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    setStocks((prev) => [...prev, newItem]);
    
    logActivity('Stock Item Created', 'Stock', `Added new inventory catalogue: ${newItem.name} [SKU: ${newItem.sku}]`);
    setIsLoading(false);
    showToast(`Inventoried ${newItem.name} with SKU ${newItem.sku}.`, 'success');
    return true;
  };

  // Reminders Operations
  const createReminder = async (reminderData: Omit<Reminder, 'id' | 'createdAt' | 'status'>): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 600));

    if (!reminderData.title) {
      showToast('Reminder Title is a requested field.', 'error');
      setIsLoading(false);
      return false;
    }

    const newReminder: Reminder = {
      ...reminderData,
      id: generateUniqueId('rem'),
      status: 'Active',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    setReminders((prev) => [newReminder, ...prev]);

    // Send notifications to all designated targets
    reminderData.assignedUsers.forEach(userId => {
      const user = users.find(u => u.id === userId);
      if (user) {
        const personalNtf: Notification = {
          id: `${generateUniqueId('ntf')}-${userId}`,
          title: 'Assigned New Workspace Duty',
          description: `You have been allocated responsibility on details: "${reminderData.title}" due by ${reminderData.date}.`,
          type: 'Reminder',
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          read: false,
          priority: 'medium'
        };
        setNotifications((prev) => [personalNtf, ...prev]);
      }
    });

    logActivity('Reminder Creation', 'Reminder', `Scheduled dispatch for: ${newReminder.title} (Priority: ${newReminder.priority})`);
    setIsLoading(false);
    showToast('Task schedule successfully committed to calendars.', 'success');
    return true;
  };

  const snoozeReminder = async (id: string): Promise<boolean> => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Snoozed' } : r))
    );
    showToast('Reminder postponed (snoozed) for 30 minutes.', 'info');
    return true;
  };

  const completeReminder = async (id: string): Promise<boolean> => {
    let title = '';
    setReminders((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          title = r.title;
          return { ...r, status: 'Completed' };
        }
        return r;
      })
    );
    logActivity('Reminder Resolved', 'Reminder', `Completed task: ${title}`);
    showToast('Target task marked as fully completed.', 'success');
    return true;
  };

  const deleteReminder = async (id: string): Promise<boolean> => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    showToast('Deleted reminder schedule from pipeline.', 'info');
    return true;
  };

  // Notifications Operations
  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    showToast('Cleared all unread items from notifications center.', 'success');
  };

  // Settings
  const updateSettings = async (newSettings: Partial<AppSettings>): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 600));

    setSettings((prev) => ({ ...prev, ...newSettings }));
    logActivity('System Settings Updated', 'System', 'Reconfigured core system and enterprise security settings');
    setIsLoading(false);
    showToast('System configuration committed successfully.', 'success');
    return true;
  };

  const addNotificationCount = notifications.filter((n) => !n.read).length;

  return (
    <StateContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isAuthenticated: !!currentUser,
        login,
        logout,
        isLoading,
        setIsLoading,
        users,
        createUser,
        updateUser,
        deleteUser,
        deactivateUser,
        stocks,
        executeStockIn,
        executeStockOut,
        createStockItem,
        reminders,
        createReminder,
        snoozeReminder,
        completeReminder,
        deleteReminder,
        notifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        addNotificationCount,
        activities,
        logActivity,
        settings,
        updateSettings,
        toasts,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </StateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(StateContext);
  if (!context) {
    throw new Error('useAppState must be used within StateProvider');
  }
  return context;
};
