import React, { useState } from 'react';
import { useAppState } from '../contexts/StateContext';
import { UserRole, PermissionAction } from '../types';
import { Shield, CheckSquare, Square, AlertCircle, Save, Layers, HelpCircle, Check, Users } from 'lucide-react';

export const PermissionPage: React.FC = () => {
  const { rolePermissions, updateRolePermissions, showToast } = useAppState();
  
  // Current active role selected in permission view
  const [selectedRole, setSelectedRole] = useState<UserRole>('Admin');

  // List of actions available
  const ACTIONS: PermissionAction[] = ['View', 'Create', 'Edit', 'Delete', 'Export', 'Approve'];
  
  // Modules configuration
  const MODULES = [
    'User Management',
    'Permissions',
    'Stock Management',
    'Reports',
    'Reminders',
    'Settings'
  ];

  // Handler for separate matrix toggles
  const handleTogglePermission = async (moduleName: string, action: PermissionAction, currentValue: boolean) => {
    const success = await updateRolePermissions(selectedRole, moduleName, action, !currentValue);
    if (success) {
      showToast(`Privilege updated: [${action}] entitlement for [${selectedRole}] on [${moduleName}] is now ${!currentValue ? 'Enabled' : 'Disabled'}.`, 'success');
    }
  };

  // Bulk Apply templates
  const handleBulkApplyTemplate = async (templateType: 'admin-all' | 'manager-ops' | 'user-restrict') => {
    if (selectedRole === 'Admin' && templateType !== 'admin-all') {
      const confirmWarning = window.confirm('Caution: Revoking administrative root matrix permissions may locks out critical managers. Proceed?');
      if (!confirmWarning) return;
    }

    // Set corresponding values
    for (const mod of MODULES) {
      for (const act of ACTIONS) {
        let value = false;
        if (templateType === 'admin-all') {
          value = true;
        } else if (templateType === 'manager-ops') {
          // Managers view, create, edit, export, approve stocks/reminders, view only others
          if (mod === 'Stock Management' || mod === 'Reminders') {
            value = act !== 'Delete';
          } else if (mod === 'User Management' || mod === 'Reports') {
            value = act === 'View' || act === 'Create' || act === 'Edit' || act === 'Export';
          } else if (mod === 'Permissions') {
            value = act === 'View';
          }
        } else if (templateType === 'user-restrict') {
          // Users view stocks and reminders, edit stock counts, others false
          if (mod === 'Stock Management') {
            value = act === 'View' || act === 'Edit';
          } else if (mod === 'Reminders') {
            value = act === 'View';
          }
        }
        await updateRolePermissions(selectedRole, mod, act, value);
      }
    }
    showToast(`Bulk authorization Template [${templateType}] mapping successfully applied to ${selectedRole} role.`, 'success');
  };

  const getActiveRolePermissions = () => {
    return rolePermissions.find((rp) => rp.role === selectedRole);
  };

  const activePermissions = getActiveRolePermissions();

  return (
    <div className="flex flex-col gap-6 font-sans text-left">
      
      {/* Title block */}
      <div>
        <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Shield className="w-6 h-6 text-indigo-600" />
          Access Control Guard
        </h2>
        <p className="text-xs text-slate-500 mt-1">Configure extremely granular operational restrictions per role. Permissions enforce application shells immediately.</p>
      </div>

      {/* Role Selection Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div className="flex border border-slate-200 bg-slate-50 p-1.5 rounded-2xl w-fit">
          {(['Admin', 'Manager', 'User'] as UserRole[]).map((role) => (
            <button
              key={role}
              id={`role-type-tab-${role}`}
              onClick={() => setSelectedRole(role)}
              className={`px-5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                selectedRole === role 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {role} Core matrix
            </button>
          ))}
        </div>

        {/* Info label */}
        <div className="flex items-center gap-2 text-xs text-indigo-600 font-semibold bg-indigo-50 border border-indigo-100 p-2 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Matrix changes apply seamlessly across current active sessions.
        </div>
      </div>

      {/* Template Quick Setup Bento Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200/85 shadow-xs flex flex-col justify-between gap-4">
          <div>
            <h4 className="font-display text-sm font-bold text-slate-900">1. Full Authority Matrix</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Instantly checks all action checkmarks. Enforces complete read, write, dispatch, delete, and approve workflows across modules.
            </p>
          </div>
          <button
            id="template-admin-all"
            onClick={() => handleBulkApplyTemplate('admin-all')}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer transition-colors"
          >
            Apply Core Admin Template
          </button>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-4">
          <div>
            <h4 className="font-display text-sm font-bold text-slate-900">2. Standard Operations Manager</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Grants extensive read/write permissions to stocks, reminders, and user lifecycle logs. Disables root destructive actions.
            </p>
          </div>
          <button
            id="template-manager-ops"
            onClick={() => handleBulkApplyTemplate('manager-ops')}
            className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold py-2.5 rounded-xl border border-indigo-200 cursor-pointer transition-colors"
          >
            Apply Operations Lead Template
          </button>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-4">
          <div>
            <h4 className="font-display text-sm font-bold text-slate-900">3. Operational Restrictive User</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Revokes system administrative and dashboard log configurations. Implements read-only profiles for daily routine execution.
            </p>
          </div>
          <button
            id="template-user-restrict"
            onClick={() => handleBulkApplyTemplate('user-restrict')}
            className="w-full bg-blue-50 hover:bg-blue-105 text-blue-700 text-xs font-bold py-2.5 rounded-xl border border-blue-200 cursor-pointer transition-colors"
          >
            Apply Restricted User Template
          </button>
        </div>

      </div>

      {/* Checklist matrix Grid */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden mt-2">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-md font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-5 h-5 text-indigo-500" />
              Entitlement Grid: {selectedRole} Matrix
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Toggle checkmarks below to instantly restructure access boundaries</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-500 select-none">
            <span className="flex items-center gap-1.5"><CheckSquare className="w-4 h-4 text-blue-600" /> Enabled Privileges</span>
            <span className="flex items-center gap-1.5"><Square className="w-4 h-4 text-slate-350" /> Access Forbidden</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-500 text-left min-w-[700px]">
            
            {/* Table headers */}
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              <tr>
                <th className="px-8 py-4.5 w-1/4">System operational Panel</th>
                {ACTIONS.map((act) => (
                  <th key={act} className="px-6 py-4.5 text-center">{act}</th>
                ))}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-150">
              {MODULES.map((moduleName) => {
                const modulePerm = activePermissions?.modules.find(m => m.moduleName === moduleName);
                return (
                  <tr key={moduleName} className="hover:bg-slate-50/50 transition-colors">
                    
                    {/* Module Title */}
                    <td className="px-8 py-5.5">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm">{moduleName}</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Assigned rules on {moduleName.toLowerCase()} interface</span>
                      </div>
                    </td>

                    {/* Checkboxes row */}
                    {ACTIONS.map((action) => {
                      const isAllowed = !!modulePerm?.actions[action];
                      return (
                        <td key={action} className="px-6 py-5.5 text-center">
                          <button
                            id={`perm-btn-${selectedRole}-${moduleName}-${action}`}
                            onClick={() => handleTogglePermission(moduleName, action, isAllowed)}
                            className="inline-flex items-center justify-center p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            {isAllowed ? (
                              <CheckSquare className="w-5.5 h-5.5 text-blue-600" />
                            ) : (
                              <Square className="w-5.5 h-5.5 text-slate-300 hover:text-slate-450" />
                            )}
                          </button>
                        </td>
                      );
                    })}

                  </tr>
                );
              })}
            </tbody>

          </table>
        </div>

        {/* Matrix guide help footer */}
        <div className="bg-slate-50 px-8 py-4 border-t border-slate-150 text-[11px] text-slate-500 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
          <span>If View rule is disabled, the module will be hidden completely from sidebars. Edit or Delete operations will display <strong>"403 Forbidden"</strong> layout safeguards immediately.</span>
        </div>

      </div>

    </div>
  );
};
