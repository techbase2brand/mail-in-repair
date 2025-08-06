'use client';

import { useState } from 'react';
import { useSupabase } from '@/components/supabase-provider';

export default function SettingsPage() {
  const { supabase, session } = useSupabase();
  const [loading, setLoading] = useState(true);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Settings Module Coming Soon</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            The settings module is currently under development. Check back soon for account and application settings.
          </p>
        </div>
      </div>
    </div>
  );
}