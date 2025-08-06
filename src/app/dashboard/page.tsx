'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/supabase-provider'
import Link from 'next/link'

export default function Dashboard() {
  const { supabase, session } = useSupabase()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalRepairs: 0,
    pendingRepairs: 0,
    completedRepairs: 0,
    urgentRepairs: 0,
    totalCustomers: 0,
    totalRevenue: 0,
  })
  const [recentRepairs, setRecentRepairs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Redirect to login if no session
    if (!session) {
      router.push('/login');
      return;
    }
    
    // Fetch actual data from Supabase
    const fetchDashboardData = async () => {
      
      try {
        setLoading(true);
        
        // Get company ID from session
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', session.user.id)
          .single();
          
        if (companyError || !companyData) {
          console.error('Error fetching company:', companyError);
          return;
        }
        
        const companyId = companyData.id;
        
        // Fetch repair tickets count
        const { count: totalRepairsCount, error: totalError } = await supabase
          .from('repair_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId);
          
        // Fetch pending repairs count
        const { count: pendingRepairsCount, error: pendingError } = await supabase
          .from('repair_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .in('status', ['received', 'diagnosed', 'waiting_for_parts', 'in_progress']);
          
        // Fetch completed repairs count
        const { count: completedRepairsCount, error: completedError } = await supabase
          .from('repair_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('status', 'completed');
          
        // Fetch urgent repairs count
        const { count: urgentRepairsCount, error: urgentError } = await supabase
          .from('repair_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('is_urgent', true);
          
        // Fetch customers count
        const { count: customersCount, error: customersError } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId);
          
        // Fetch total revenue from invoices
        const { data: invoicesData, error: invoicesError } = await supabase
          .from('invoices')
          .select('total_amount')
          .eq('company_id', companyId)
          .eq('status', 'paid');
          
        const totalRevenue = invoicesData ? 
          invoicesData.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0) : 0;
        
        setStats({
          totalRepairs: totalRepairsCount || 0,
          pendingRepairs: pendingRepairsCount || 0,
          completedRepairs: completedRepairsCount || 0,
          urgentRepairs: urgentRepairsCount || 0,
          totalCustomers: customersCount || 0,
          totalRevenue: totalRevenue,
        });

        // Fetch recent repairs
        const { data: recentRepairsData, error: recentError } = await supabase
          .from('repair_tickets')
          .select(`
            id,
            ticket_number,
            device_type,
            issue_description,
            status,
            created_at,
            customers(first_name, last_name)
          `)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (recentRepairsData) {
          const formattedRepairs = recentRepairsData.map(repair => ({
            id: repair.ticket_number,
            customer: `${(repair.customers as any).first_name} ${(repair.customers as any).last_name}`,
            device: repair.device_type,
            issue: repair.issue_description,
            status: repair.status,
            date: new Date(repair.created_at).toISOString().split('T')[0],
          }));
          
          setRecentRepairs(formattedRepairs);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Fallback to mock data if there's an error
        setStats({
          totalRepairs: 0,
          pendingRepairs: 0,
          completedRepairs: 0,
          urgentRepairs: 0,
          totalCustomers: 0,
          totalRevenue: 0,
        });
        
        setRecentRepairs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [session, supabase]);

  // If no session, redirect to login
  useEffect(() => {
    if (session === null) {
      window.location.href = '/login';
    }
  }, [session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in progress':
        return 'bg-blue-100 text-blue-800';
      case 'waiting for parts':
        return 'bg-yellow-100 text-yellow-800';
      case 'diagnosed':
        return 'bg-purple-100 text-purple-800';
      case 'urgent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="h-12 bg-gray-200 rounded-t"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border-t border-gray-200 p-4">
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your repair business performance and recent activities.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {/* Total Repairs */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 truncate">Total Repairs</p>
              <p className="mt-1 text-3xl font-semibold text-gray-900">{stats.totalRepairs}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/dashboard/repairs" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              View all repairs
            </Link>
          </div>
        </div>

        {/* Pending Repairs */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 truncate">Pending Repairs</p>
              <p className="mt-1 text-3xl font-semibold text-gray-900">{stats.pendingRepairs}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/dashboard/repairs?status=pending" className="text-sm font-medium text-yellow-600 hover:text-yellow-500">
              View pending repairs
            </Link>
          </div>
        </div>

        {/* Completed Repairs */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 truncate">Completed Repairs</p>
              <p className="mt-1 text-3xl font-semibold text-gray-900">{stats.completedRepairs}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/dashboard/repairs?status=completed" className="text-sm font-medium text-green-600 hover:text-green-500">
              View completed repairs
            </Link>
          </div>
        </div>

        {/* Urgent Repairs */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 text-red-600">
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 truncate">Urgent Repairs</p>
              <p className="mt-1 text-3xl font-semibold text-gray-900">{stats.urgentRepairs}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/dashboard/repairs?status=urgent" className="text-sm font-medium text-red-600 hover:text-red-500">
              View urgent repairs
            </Link>
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 truncate">Total Customers</p>
              <p className="mt-1 text-3xl font-semibold text-gray-900">{stats.totalCustomers}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/dashboard/customers" className="text-sm font-medium text-purple-600 hover:text-purple-500">
              View all customers
            </Link>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 truncate">Total Revenue</p>
              <p className="mt-1 text-3xl font-semibold text-gray-900">${stats.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/dashboard/reports" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              View financial reports
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Repairs */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Repairs</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {recentRepairs.map((repair) => (
              <li key={repair.id}>
                <Link href={`/dashboard/repair/${repair.id}`} className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-primary-600 truncate">{repair.id}</p>
                        <p className="ml-2 flex-shrink-0 font-normal text-sm text-gray-500">{repair.device}</p>
                      </div>
                      <div className="ml-2 flex-shrink-0">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(repair.status)}`}>
                          {repair.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          {repair.issue}
                        </p>
                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                          <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                          {repair.customer}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <p>
                          Created on <time dateTime={repair.date}>{repair.date}</time>
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-4 text-center">
          <Link href="/dashboard/repairs" className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            View all repairs
            <svg className="ml-2 -mr-1 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/dashboard/repair/new" className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">New Repair</p>
              <p className="text-sm text-gray-500">Create a new repair ticket</p>
            </div>
          </Link>

          <Link href="/dashboard/customers/new" className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">New Customer</p>
              <p className="text-sm text-gray-500">Add a new customer</p>
            </div>
          </Link>

          <Link href="/dashboard/buyback/new" className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">New Buyback</p>
              <p className="text-sm text-gray-500">Start a new screen buyback</p>
            </div>
          </Link>

          <Link href="/dashboard/reports" className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">Generate Report</p>
              <p className="text-sm text-gray-500">Create a new business report</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}