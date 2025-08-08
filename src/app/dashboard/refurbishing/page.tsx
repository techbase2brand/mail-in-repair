'use client';

import { useState, useEffect, useRef } from 'react';
import { useSupabase } from '@/components/supabase-provider';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';

// Icons
import { 
  PlusIcon, 
  FilterIcon, 
  SearchIcon, 
  ChevronDownIcon, 
  ChevronUpIcon,
  CameraIcon,
  DownloadIcon,
  CheckIcon,
  XIcon,
  ClockIcon,
  TruckIcon,
  DollarSignIcon,
  PackageIcon
} from '@/components/icons';

type RefurbishingTicket = {
  id: string;
  ticket_number: string;
  customer: {
    first_name: string;
    last_name: string;
  };
  device_type: string;
  device_model: string;
  screen_condition_before: string | null;
  screen_condition_after: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

const statusLabels: Record<string, { label: string, color: string, icon: React.ReactNode }> = {
  submitted: { 
    label: 'Submitted', 
    color: 'bg-blue-100 text-blue-800', 
    icon: <PackageIcon className="mr-1" /> 
  },
  received: { 
    label: 'Received', 
    color: 'bg-purple-100 text-purple-800', 
    icon: <CheckIcon className="mr-1" /> 
  },
  graded: { 
    label: 'Graded', 
    color: 'bg-yellow-100 text-yellow-800', 
    icon: <DollarSignIcon className="mr-1" /> 
  },
  in_progress: { 
    label: 'In Progress', 
    color: 'bg-orange-100 text-orange-800', 
    icon: <ClockIcon className="mr-1" /> 
  },
  completed: { 
    label: 'Completed', 
    color: 'bg-green-100 text-green-800', 
    icon: <CheckIcon className="mr-1" /> 
  },
  shipped: { 
    label: 'Shipped', 
    color: 'bg-indigo-100 text-indigo-800', 
    icon: <TruckIcon className="mr-1" /> 
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'bg-red-100 text-red-800', 
    icon: <XIcon className="mr-1" /> 
  }
};

const gradeLabels: Record<string, { label: string, color: string }> = {
  A: { label: 'Grade A', color: 'bg-green-100 text-green-800' },
  B: { label: 'Grade B', color: 'bg-yellow-100 text-yellow-800' },
  C: { label: 'Grade C', color: 'bg-orange-100 text-orange-800' },
  D: { label: 'Grade D', color: 'bg-red-100 text-red-800' },
  F: { label: 'Grade F', color: 'bg-gray-100 text-gray-800' },
};

export default function RefurbishingPage() {
  const router = useRouter();
  const { supabase, session } = useSupabase();
  const [tickets, setTickets] = useState<RefurbishingTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Use refs to track fetch status and caching
  const isFetchingRef = useRef(false);
  const lastFetchedRef = useRef<number | null>(null);
  // Cache timeout in milliseconds (5 minutes)
  const CACHE_TIMEOUT = 5 * 60 * 1000;

  useEffect(() => {
    if (!session) return;
    
    // Only fetch if we haven't fetched before, if the cache has expired, or if the status filter changes
    if (!lastFetchedRef.current || statusFilter !== lastStatusFilterRef.current) {
      fetchRefurbishingTickets();
    }
    
    // Set up an interval to refresh data every 5 minutes
    const intervalId = setInterval(() => {
      fetchRefurbishingTickets();
    }, CACHE_TIMEOUT);
    
    // Clean up the interval when the component unmounts
    return () => {
      clearInterval(intervalId);
    };
  }, [statusFilter, session, supabase]);
  
  // Ref to track the last status filter used
  const lastStatusFilterRef = useRef(statusFilter);
  
  // If no session, redirect to login
  useEffect(() => {
    if (session === null) {
      window.location.href = '/login';
    }
  }, [session]);

  const fetchRefurbishingTickets = async () => {
    // Skip if already fetching
    if (isFetchingRef.current) return;
    
    // Check if we've fetched recently (within cache timeout) and status filter hasn't changed
    const now = Date.now();
    if (lastFetchedRef.current && 
        (now - lastFetchedRef.current < CACHE_TIMEOUT) && 
        statusFilter === lastStatusFilterRef.current) {
      console.log('Using cached refurbishing tickets data');
      return;
    }
    
    try {
      isFetchingRef.current = true;
      setLoading(true);
      
      // Update the last status filter ref
      lastStatusFilterRef.current = statusFilter;
      
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
      
      const companyId = companyData.id as string;
      
      let query = supabase
        .from('refurbishing_tickets')
        .select(`
          id,
          ticket_number,
          device_type,
          device_model,
          screen_condition_before,
          screen_condition_after,
          status,
          created_at,
          updated_at,
          company_id,
          customers(first_name, last_name)
        `)
        .eq('company_id', companyId);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Transform the data to match our RefurbishingTicket type
      const formattedTickets = data.map((ticket: any) => ({
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        customer: {
          first_name: ticket.customers?.first_name || 'Unknown',
          last_name: ticket.customers?.last_name || 'Customer',
        },
        device_type: ticket.device_type,
        device_model: ticket.device_model,
        screen_condition_before: ticket.screen_condition_before,
        screen_condition_after: ticket.screen_condition_after,
        status: ticket.status,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
      }));

      // Only update state if data has changed
      if (JSON.stringify(formattedTickets) !== JSON.stringify(tickets)) {
        setTickets(formattedTickets);
      }
      
      // Update the last fetched timestamp
      lastFetchedRef.current = Date.now();
    } catch (error) {
      console.error('Error fetching refurbishing tickets:', error);
      toast.error('Failed to load refurbishing tickets');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const searchLower = searchTerm.toLowerCase();
    return (
      ticket.ticket_number.toLowerCase().includes(searchLower) ||
      ticket.customer.first_name.toLowerCase().includes(searchLower) ||
      ticket.customer.last_name.toLowerCase().includes(searchLower) ||
      ticket.device_type.toLowerCase().includes(searchLower) ||
      ticket.device_model.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  // For demo purposes, we'll use mock data for the dashboard stats
  const stats = [
    { label: 'Total Refurbishing', value: tickets.length },
    { label: 'Pending Grading', value: tickets.filter(t => t.status === 'received').length },
    { label: 'In Progress', value: tickets.filter(t => t.status === 'in_progress').length },
    { label: 'Completed', value: tickets.filter(t => t.status === 'completed' || t.status === 'shipped').length },
  ];

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Screen Refurbishing</h1>
          <p className="text-gray-600 mt-1">Manage screen refurbishing tickets and workflow</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Link 
            href="/dashboard/refurbishing/new" 
            className="btn-primary flex items-center"
          >
            <PlusIcon className="mr-2" /> New Refurbishing Ticket
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-4">
            <p className="text-sm font-medium text-gray-600">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="text-gray-400" />
              </div>
              <input
                type="text"
                className="form-input pl-10 w-full"
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-outline flex items-center"
              >
                <FilterIcon className="mr-2" />
                Filters
                {showFilters ? <ChevronUpIcon className="ml-2" /> : <ChevronDownIcon className="ml-2" />}
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    className="form-select w-full"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="submitted">Submitted</option>
                    <option value="received">Received</option>
                    <option value="graded">Graded</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="shipped">Shipped</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No refurbishing tickets found</p>
            <Link 
              href="/dashboard/refurbishing/new" 
              className="btn-primary inline-flex items-center mt-4"
            >
              <PlusIcon className="mr-2" /> Create New Ticket
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Device
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Screen Condition
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTickets.map((ticket) => (
                  <tr 
                    key={ticket.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/dashboard/refurbishing/${ticket.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-blue-600">{ticket.ticket_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {ticket.customer.first_name} {ticket.customer.last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{ticket.device_type}</div>
                      <div className="text-sm text-gray-500">{ticket.device_model}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        {ticket.screen_condition_before && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${gradeLabels[ticket.screen_condition_before]?.color || 'bg-gray-100 text-gray-800'}`}>
                            Before: {gradeLabels[ticket.screen_condition_before]?.label || ticket.screen_condition_before}
                          </span>
                        )}
                        {ticket.screen_condition_after && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${gradeLabels[ticket.screen_condition_after]?.color || 'bg-gray-100 text-gray-800'}`}>
                            After: {gradeLabels[ticket.screen_condition_after]?.label || ticket.screen_condition_after}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusLabels[ticket.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[ticket.status]?.icon}
                        {statusLabels[ticket.status]?.label || ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(ticket.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                        <Link 
                          href={`/dashboard/refurbishing/${ticket.id}/photos`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <CameraIcon className="w-5 h-5" />
                        </Link>
                        <Link 
                          href={`/dashboard/refurbishing/${ticket.id}/invoice`}
                          className="text-green-600 hover:text-green-900"
                        >
                          <DownloadIcon className="w-5 h-5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}