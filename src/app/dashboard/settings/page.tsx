'use client';

import { useState } from 'react';
import { useSupabase } from '@/components/supabase-provider';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import Link from 'next/link';
import { UserIcon } from '@/components/icons';

export default function SettingsPage() {
  const { supabase, session } = useSupabase();
  const { isAdmin, hasPermission } = useRoleAccess();
  const [loading, setLoading] = useState(true);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* User Roles Management Card */}
        {(isAdmin || hasPermission('settings', 'manage')) && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                  <UserIcon className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">User Roles</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Manage user roles and permissions for your company
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <Link 
                  href="/dashboard/settings/roles"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Manage Roles
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Other settings cards can be added here */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <div className="text-center py-8">
              <h3 className="text-lg font-medium text-gray-700 mb-2">More Settings Coming Soon</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Additional settings modules are currently under development.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}