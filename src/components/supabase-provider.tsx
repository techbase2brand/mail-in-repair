'use client';

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { SupabaseClient } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';
import { initializeStorageBuckets } from '@/lib/storage-init';
import { testConnection, withRetry } from '@/utils/connection';

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

  // Use a ref to track if we're already fetching to prevent duplicate requests
  const isFetchingRef = useRef(false);

  // Store the last fetched session timestamp to prevent unnecessary fetches
  const lastSessionFetchRef = useRef<number | null>(null);
  // Cache timeout in milliseconds (1 minute)
  const SESSION_CACHE_TIMEOUT = 60 * 1000;

  useEffect(() => {
    const fetchSession = async () => {
      // Skip if already fetching
      if (isFetchingRef.current) return;
      
      // Check if we've fetched recently (within cache timeout)
      const now = Date.now();
      if (lastSessionFetchRef.current && (now - lastSessionFetchRef.current < SESSION_CACHE_TIMEOUT)) {
        console.log('Using cached session data');
        return;
      }
      
      try {
        isFetchingRef.current = true;
        
        // Check connection before attempting to fetch session
        const isConnected = await testConnection();
        if (!isConnected) {
          console.error('No internet connection available');
          throw new Error('Connection error');
        }
        
        // Use retry logic for fetching the session
        const { data, error } = await withRetry(
          async () => await supabase.auth.getSession(),
          3, // Maximum 3 retries (4 attempts total)
          1000 // Base delay of 1 second
        );
        
        if (error) {
          console.error('Error fetching session:', error.message);
          throw error;
        } else {
          // Only update session if it's different to prevent unnecessary re-renders
          const newSession = data.session;
          if (JSON.stringify(newSession) !== JSON.stringify(session)) {
            setSession(newSession);
          }
          
          // Update the last fetched timestamp
          lastSessionFetchRef.current = Date.now();
        }
      } catch (err) {
        console.error('Failed to fetch session:', err);
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    };

    fetchSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('Auth state changed:', event);
      
      // Only update session if it's different to prevent unnecessary re-renders
      if (JSON.stringify(newSession) !== JSON.stringify(session)) {
        setSession(newSession);
      }
      
      if (event === 'SIGNED_IN' && newSession) {
        router.refresh();
      } else if (event === 'SIGNED_OUT') {
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
      // Reset fetching flag on cleanup
      isFetchingRef.current = false;
    };
  }, [supabase.auth, router]); // Only depend on auth and router

  // Track if we're initializing buckets to prevent duplicate calls
  const isInitializingBucketsRef = useRef(false);

  // Initialize storage buckets once after authentication
  useEffect(() => {
    // Only initialize buckets once when session is available and not already initialized
    if (!session || bucketsInitialized || isLoading) return;
    
    const initBuckets = async () => {
      // Skip if already initialized, initializing, or in progress
      if (bucketsInitialized || isInitializingBucketsRef.current) return;
      
      // Set flag to prevent duplicate initialization
      isInitializingBucketsRef.current = true;
      
      console.log('Initializing storage buckets...');
      try {
        await initializeStorageBuckets();
        console.log('Storage buckets initialized successfully');
        setBucketsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize storage buckets:', error);
      } finally {
        // Reset flag when done
        isInitializingBucketsRef.current = false;
      }
    };
    
    initBuckets();
  }, [session, bucketsInitialized, isLoading]); // Only run when these dependencies change

  return (
    <SupabaseContext.Provider value={{ supabase, session, isLoading }}>
      {children}
    </SupabaseContext.Provider>
  );
}
