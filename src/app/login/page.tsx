'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/supabase-provider'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { testConnection, withRetry } from '@/utils/connection'

export default function Login() {
  const router = useRouter()
  const { supabase } = useSupabase()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check internet connection before attempting login
      const isConnected = await testConnection();
      if (!isConnected) {
        setError('Connection error. Please check your internet connection and try again.');
        toast.error('Connection error. Please try again in a moment.');
        setLoading(false);
        return;
      }
      
      // Use retry logic for the login attempt
      const { data, error } = await withRetry(
        async () => {
          // Add a small delay to ensure the request doesn't get throttled
          await new Promise(resolve => setTimeout(resolve, 500));
          
          return await supabase.auth.signInWithPassword({
            email,
            password
          });
        },
        2, // Maximum 2 retries (3 attempts total)
        1000 // Base delay of 1 second
      );

      if (error) {
        console.error('Login error details:', error);
        if (error.message.includes('Email not confirmed') || error.message.includes('not confirmed') || error.message.includes('not verified')) {
          setError('Please verify your email address before logging in. Check your inbox (including spam folder) for a verification link.');
          toast.error('Email not verified. Please check your inbox for a verification link.');
        } else if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials and try again.');
          toast.error('Invalid email or password');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('fetch failed') || error.message.includes('network') || error.message.includes('connection')) {
          setError('Connection error. Please check your internet connection and try again.');
          toast.error('Connection error. Please try again in a moment.');
        } else {
          setError(error.message);
          toast.error('Login failed: ' + error.message);
        }
      } else if (!data.session) {
        setError('No session created. Please try again.');
        toast.error('Login failed: No session created');
      } else {
        // Check if the user has a company profile
        let companyData;
        try {
          const { data: companyResult, error: companyError } = await supabase
            .from('companies')
            .select('id, status')
            .eq('user_id', data.session.user.id)
            .single();
          
          companyData = companyResult;
          
          if (companyError && companyError.code !== 'PGRST116') { // PGRST116 is the error code for no rows returned
            console.error('Error checking company profile:', companyError);
            toast.error('Error checking company profile');
          }
        } catch (companyErr) {
          console.error('Error fetching company profile:', companyErr);
          toast.error('Error checking company profile');
        }
        
        // Redirect to dashboard
        toast.success('Login successful!');
        router.push('/dashboard');
        
        // If no company profile exists, try to create one using user metadata
        if (!companyData) {
          try {
            const userData = data.session.user.user_metadata;
             
            if (userData && userData.company_name) {
              const { error: profileError } = await supabase
                .from('companies')
                .insert([
                  {
                    user_id: data.session.user.id,
                    name: userData.company_name,
                    contact_email: data.session.user.email,
                    contact_phone: userData.phone || '',
                    contact_name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
                    status: 'pending' // Requires admin approval
                  }
                ]);
              
              if (profileError) {
                console.error('Error creating company profile after verification:', profileError);
              } else {
                console.log('Company profile created after email verification');
              }
            }
          } catch (err) {
            console.error('Error in post-verification company creation:', err);
          }
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err instanceof Error && err.message === 'Request timeout') {
        setError('Connection timed out. Please check your internet connection and try again.');
        toast.error('Connection timed out. Please try again in a moment.');
      } else if (err instanceof Error && (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('connection'))) {
        setError('Connection error. Please check your internet connection and try again.');
        toast.error('Connection error. Please try again in a moment.');
      } else {
        setError('An unexpected error occurred');
        toast.error('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link href="/register" className="font-medium text-primary-600 hover:text-primary-500">
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link href="/forgot-password" className="font-medium text-primary-600 hover:text-primary-500">
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div>
                <button
                  onClick={() => toast.error('Google login not implemented yet')}
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <svg className="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                  </svg>
                  <span className="ml-2">Google</span>
                </button>
              </div>

              <div>
                <button
                  onClick={() => toast.error('Microsoft login not implemented yet')}
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <svg className="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" />
                  </svg>
                  <span className="ml-2">Microsoft</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}