'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { SupabaseClient } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';
import { initializeStorageBuckets } from '@/lib/storage-init';

type SupabaseContextType = {
  supabase: SupabaseClient<any, "public", any>;
  session: any;
  isLoading: boolean;
};

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  }));
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  // State to track if buckets have been initialized
  const [bucketsInitialized, setBucketsInitialized] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        // Initialize storage buckets when the app starts
        if (!bucketsInitialized) {
          console.log('Initializing storage buckets...');
          await initializeStorageBuckets();
          setBucketsInitialized(true);
          console.log('Storage buckets initialized successfully');
        }
        
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error fetching session:', error.message);
        }
        setSession(data.session);
      } catch (err) {
        console.error('Failed to fetch session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      setSession(session);
      
      if (event === 'SIGNED_IN' && session) {
        router.refresh();
      } else if (event === 'SIGNED_OUT') {
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  // Initialize storage buckets once after authentication
  useEffect(() => {
    const initBuckets = async () => {
      if (!bucketsInitialized && !isLoading) {
        console.log('Initializing storage buckets...');
        try {
          await initializeStorageBuckets();
          console.log('Storage buckets initialized successfully');
          setBucketsInitialized(true);
        } catch (error) {
          console.error('Failed to initialize storage buckets:', error);
        }
      }
    };
    
    initBuckets();
  }, [bucketsInitialized, isLoading]);

  return (
    <SupabaseContext.Provider value={{ supabase, session, isLoading }}>
      {children}
    </SupabaseContext.Provider>
  );
}
