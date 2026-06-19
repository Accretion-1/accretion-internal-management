/**
 * WorkSphere - TypeScript Type Declarations
 */

export type UserRole = 'Admin' | 'Manager' | 'User';

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  assignedModules: string[];
  createdDate: string;
  lastLogin: string;
}



export interface StockItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  minThreshold: number;
  warehouse: string;
  lastUpdated: string;
  unit: string;
}

export type ReminderPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type ReminderRecurrence = 'One-Time' | 'Daily' | 'Weekly' | 'Monthly' | 'Custom';
export type ReminderCategory = 'Operations' | 'Reporting' | 'Inventory' | 'General' | 'Compliance';

export interface Reminder {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  priority: ReminderPriority;
  category: ReminderCategory;
  assignedUsers: string[]; // List of user IDs
  recurrence: ReminderRecurrence;
  status: 'Active' | 'Completed' | 'Snoozed';
  attachments?: string[];
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  type: 'Reminder' | 'System' | 'Permission' | 'Announcement';
  timestamp: string;
  read: boolean;
  priority?: 'low' | 'medium' | 'high';
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userName: string;
  role: UserRole;
  action: string;
  category: 'Auth' | 'UserManagement' | 'Permission' | 'Reminder' | 'Stock' | 'System';
  details: string;
  ipAddress: string;
}

export interface AppSettings {
  organizationName: string;
  securityLevel: 'Standard' | 'High' | 'Strict';
  maintenanceMode: boolean;
  mfaRequired: boolean;
  allowedIpRanges: string;
  themeColor: string;
}
