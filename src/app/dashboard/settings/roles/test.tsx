'use client';

import { useState } from 'react';
import { useRoleAccess } from '@/hooks/useRoleAccess';

export default function RoleAccessTest() {
  const { 
    role, 
    permissions, 
    loading, 
    hasPermission, 
    isAdmin, 
    isManager, 
    isTechnician, 
    isReceptionist, 
    isCustomer 
  } = useRoleAccess();

  const [resource, setResource] = useState('repair_tickets');
  const [action, setAction] = useState('read');

  const resources = [
    'repair_tickets',
    'customers',
    'technicians',
    'buyback_tickets',
    'refurbishing_tickets',
    'invoices',
    'reports',
    'settings',
    'refurbished_inventory'
  ];

  const actions = ['create', 'read', 'update', 'delete', 'manage'];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Role-Based Access Control Test</h1>

      {loading ? (
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600"></div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Current User Role</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Role</p>
                <p className="text-lg font-medium">{role || 'None'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Role Flags</p>
                <ul className="mt-2 space-y-1">
                  <li className="flex items-center">
                    <span className={`h-2 w-2 rounded-full mr-2 ${isAdmin ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span>isAdmin: {isAdmin ? 'Yes' : 'No'}</span>
                  </li>
                  <li className="flex items-center">
                    <span className={`h-2 w-2 rounded-full mr-2 ${isManager ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span>isManager: {isManager ? 'Yes' : 'No'}</span>
                  </li>
                  <li className="flex items-center">
                    <span className={`h-2 w-2 rounded-full mr-2 ${isTechnician ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span>isTechnician: {isTechnician ? 'Yes' : 'No'}</span>
                  </li>
                  <li className="flex items-center">
                    <span className={`h-2 w-2 rounded-full mr-2 ${isReceptionist ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span>isReceptionist: {isReceptionist ? 'Yes' : 'No'}</span>
                  </li>
                  <li className="flex items-center">
                    <span className={`h-2 w-2 rounded-full mr-2 ${isCustomer ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span>isCustomer: {isCustomer ? 'Yes' : 'No'}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Permission Checker</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="resource" className="block text-sm font-medium text-gray-700 mb-1">Resource</label>
                <select
                  id="resource"
                  value={resource}
                  onChange={(e) => setResource(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  {resources.map((res) => (
                    <option key={res} value={res}>{res}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="action" className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                <select
                  id="action"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  {actions.map((act) => (
                    <option key={act} value={act}>{act}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 p-4 border rounded-md">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Does user have permission to <span className="font-bold">{action}</span> on <span className="font-bold">{resource}</span>?
              </p>
              <div className="flex items-center mt-2">
                <span 
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${hasPermission(resource, action as any) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                >
                  {hasPermission(resource, action as any) ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Permissions List</h2>
            {permissions.length === 0 ? (
              <p className="text-gray-500">No specific permissions found</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {permissions.map((permission, index) => (
                  <li key={index} className="py-3 flex justify-between">
                    <span className="text-gray-900">{permission.resource}</span>
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {permission.action}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}