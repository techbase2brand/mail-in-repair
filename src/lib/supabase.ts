import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Create a single supabase client for the entire application
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      debug: false
    },
    global: {
      fetch: fetch,
      headers: { 'x-application-name': 'prc-repair-management' }
    },
    db: {
      schema: 'public'
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

// Helper function to get the current user with role information
export const getCurrentUser = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  
  // Get company information
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('user_id', session.user.id)
    .single();
  
  if (companyError || !company) return null;
  
  // Get user role information
  const { data: userRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('company_id', company.id);
  
  // If no specific role is found, use the owner_role from company
  const role = userRoles && userRoles.length > 0 
    ? userRoles[0].role 
    : company.owner_role || 'admin';
  
  // Get permissions from role if available
  const permissions = userRoles && userRoles.length > 0 
    ? userRoles[0].permissions 
    : null;
  
  return { 
    ...company, 
    email: session.user.email,
    role,
    permissions
  };
};

// Helper function to check if user is authenticated
export const isAuthenticated = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
};

// Helper function to sign out
export const signOut = async () => {
  await supabase.auth.signOut();
};