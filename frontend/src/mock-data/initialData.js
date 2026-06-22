export const INITIAL_USERS = [
    {
        id: 'usr-1',
        name: 'Sarah Jenkins',
        phone: '9999999991',
        email: 'sarah.jenkins@worksphere.co',
        role: 'Admin',
        status: 'Active',
        assignedModules: ['Dashboard', 'User Management', 'Permissions', 'Stock Management', 'Reports', 'Reminders', 'Settings'],
        createdDate: '2026-01-10',
        lastLogin: '2026-06-18 09:24'
    },
    {
        id: 'usr-2',
        name: 'David Chen',
        phone: '9999999992',
        email: 'david.chen@worksphere.co',
        role: 'Manager',
        status: 'Active',
        assignedModules: ['Dashboard', 'User Management', 'Stock Management', 'Reports', 'Reminders'],
        createdDate: '2026-02-15',
        lastLogin: '2026-06-18 10:15'
    },
    {
        id: 'usr-3',
        name: 'Alex Rivera',
        phone: '9999999993',
        email: 'alex.rivera@worksphere.co',
        role: 'User',
        status: 'Active',
        assignedModules: ['Dashboard', 'Stock Management', 'Reminders'],
        createdDate: '2026-03-20',
        lastLogin: '2026-06-18 11:45'
    },
    {
        id: 'usr-4',
        name: 'Marcus Brody',
        phone: '9875550121',
        email: 'marcus.brody@worksphere.co',
        role: 'User',
        status: 'Active',
        assignedModules: ['Dashboard', 'Stock Management', 'Reminders'],
        createdDate: '2026-04-01',
        lastLogin: '2026-06-17 14:22'
    },
    {
        id: 'usr-5',
        name: 'Elena Rostova',
        phone: '9875550143',
        email: 'elena.rostova@worksphere.co',
        role: 'Manager',
        status: 'Active',
        assignedModules: ['Dashboard', 'User Management', 'Reports', 'Reminders'],
        createdDate: '2026-01-22',
        lastLogin: '2026-06-18 08:30'
    },
    {
        id: 'usr-6',
        name: 'Tom Reynolds',
        phone: '9875550186',
        email: 'tom.reynolds@worksphere.co',
        role: 'User',
        status: 'Inactive',
        assignedModules: ['Dashboard', 'Stock Management'],
        createdDate: '2026-05-12',
        lastLogin: '2026-05-30 16:10'
    }
];
export const INITIAL_STOCKS = [
    {
        id: 'stk-1',
        name: 'Industrial Pallet Rack Unit B',
        sku: 'PL-RCK-771',
        category: 'Heavy Storage',
        quantity: 14,
        minThreshold: 20, // LOW STOCK
        warehouse: 'Alpha North',
        lastUpdated: '2026-06-18 14:35',
        unit: 'Units'
    },
    {
        id: 'stk-2',
        name: 'High-Density Structural Bolts',
        sku: 'BLT-STR-942',
        category: 'Hardware Assets',
        quantity: 1850,
        minThreshold: 500,
        warehouse: 'Alpha North',
        lastUpdated: '2026-06-17 11:20',
        unit: 'Pcs'
    },
    {
        id: 'stk-3',
        name: 'Enterprise Forklift Lead Battery',
        sku: 'BT-FKL-210',
        category: 'Machinery Spare Parts',
        quantity: 3,
        minThreshold: 5, // LOW STOCK
        warehouse: 'Beta South',
        lastUpdated: '2026-06-18 09:12',
        unit: 'Units'
    },
    {
        id: 'stk-4',
        name: 'Ergonomic Heavy-Duty Work Gloves',
        sku: 'GLV-HD-105',
        category: 'Safety Equipment',
        quantity: 420,
        minThreshold: 100,
        warehouse: 'Alpha North',
        lastUpdated: '2026-06-15 16:40',
        unit: 'Pairs'
    },
    {
        id: 'stk-5',
        name: 'Modular Shipping Container Liners',
        sku: 'LNR-SHP-502',
        category: 'Shipping Material',
        quantity: 75,
        minThreshold: 80, // LOW STOCK
        warehouse: 'Beta South',
        lastUpdated: '2026-06-16 10:05',
        unit: 'Units'
    },
    {
        id: 'stk-6',
        name: 'Hazmat Spill Containment Kits',
        sku: 'KIT-SPL-330',
        category: 'Safety Equipment',
        quantity: 12,
        minThreshold: 10,
        warehouse: 'Beta South',
        lastUpdated: '2026-06-18 15:55',
        unit: 'Kits'
    }
];
export const INITIAL_REMINDERS = [
    {
        id: 'rem-1',
        title: 'Bi-Weekly Stock Reconciliation Audit',
        description: 'Ensure matches with physical counts in Warehouse Alpha and Beta. Scan barcodes and correct system errors.',
        date: '2026-06-20',
        time: '14:00',
        priority: 'High',
        category: 'Inventory',
        assignedUsers: ['usr-2', 'usr-3', 'usr-4'],
        recurrence: 'Daily',
        status: 'Active',
        createdAt: '2026-06-15 08:00'
    },
    {
        id: 'rem-2',
        title: 'OSHA Workplace Safety Audit Submission',
        description: 'Upload signed compliance reports and logs for the past quarter to the government standards portal.',
        date: '2026-06-25',
        time: '17:00',
        priority: 'Critical',
        category: 'Compliance',
        assignedUsers: ['usr-1', 'usr-5'],
        recurrence: 'One-Time',
        status: 'Active',
        createdAt: '2026-06-16 10:30'
    },
    {
        id: 'rem-3',
        title: 'Logistics Vendor SLA Review Session',
        description: 'Discuss penalty claims and shipment delays happening over the Pacific shipping routes.',
        date: '2026-06-19',
        time: '10:00',
        priority: 'Medium',
        category: 'Operations',
        assignedUsers: ['usr-1', 'usr-2'],
        recurrence: 'One-Time',
        status: 'Active',
        createdAt: '2026-06-18 11:00'
    }
];
export const INITIAL_TODOS = [
    {
        id: 'tdo-1',
        title: 'Audit Forklift Batteries',
        description: 'Check water levels and charge capacity of all 5 forklift batteries in Sector C.',
        date: '2026-06-20',
        time: '09:00',
        assignedUser: 'usr-2',
        type: 'Daily',
        status: 'Active',
        createdAt: '2026-06-18 09:00'
    },
    {
        id: 'tdo-2',
        title: 'Review Overtime Requests',
        description: 'Review and approve pending overtime hours submitted by the warehouse night crew.',
        date: '2026-06-19',
        time: '15:30',
        assignedUser: 'usr-1',
        type: 'One-Time',
        status: 'Active',
        createdAt: '2026-06-18 10:00'
    }
];
export const INITIAL_NOTIFICATIONS = [
    {
        id: 'ntf-1',
        title: 'Critical Low Stock warning',
        description: 'Forklift Lead Battery (BT-FKL-210) quantity fell below minimum of 5. Current: 3.',
        type: 'Reminder',
        timestamp: '2026-06-18 15:00',
        read: false,
        priority: 'high'
    },
    {
        id: 'ntf-2',
        title: 'New User Registered',
        description: 'Alex Rivera (User) was registered by Sarah Jenkins.',
        type: 'System',
        timestamp: '2026-06-18 11:45',
        read: false,
        priority: 'medium'
    },
    {
        id: 'ntf-3',
        title: 'Role Permissions Configuration Changed',
        description: 'Manager role can now Approve stock-ins. Updated by Sarah Jenkins.',
        type: 'Permission',
        timestamp: '2026-06-18 10:11',
        read: true,
        priority: 'medium'
    },
    {
        id: 'ntf-4',
        title: 'Quarterly Town Hall Notice',
        description: 'Global operations town hall meeting is scheduled tomorrow at 09:00 EST.',
        type: 'Announcement',
        timestamp: '2026-06-18 09:00',
        read: false,
        priority: 'low'
    }
];
export const INITIAL_ACTIVITIES = [
    {
        id: 'act-1',
        timestamp: '2026-06-18 15:55',
        userName: 'Alex Rivera',
        role: 'User',
        action: 'Stock Out',
        category: 'Stock',
        details: 'Dispatched 5 units of Hazmat Spill Kits (KIT-SPL-330)',
        ipAddress: '192.168.10.42'
    },
    {
        id: 'act-2',
        timestamp: '2026-06-18 14:35',
        userName: 'David Chen',
        role: 'Manager',
        action: 'Stock In',
        category: 'Stock',
        details: 'Added 10 units of Industrial Pallet Rack Unit B (PL-RCK-771)',
        ipAddress: '192.168.10.15'
    },
    {
        id: 'act-3',
        timestamp: '2026-06-18 11:45',
        userName: 'Sarah Jenkins',
        role: 'Admin',
        action: 'Create User',
        category: 'UserManagement',
        details: 'Registered employee Alex Rivera with User role',
        ipAddress: '10.0.4.120'
    },
    {
        id: 'act-4',
        timestamp: '2026-06-18 10:15',
        userName: 'David Chen',
        role: 'Manager',
        action: 'User Login',
        category: 'Auth',
        details: 'Successful phone + OTP login',
        ipAddress: '192.168.10.15'
    }
];
export const DEFAULT_SETTINGS = {
    organizationName: 'WorkSphere Gobal Ltd.',
    securityLevel: 'High',
    maintenanceMode: false,
    mfaRequired: true,
    allowedIpRanges: '192.168.0.0/16, 10.0.0.0/8',
    themeColor: '#2563EB'
};
