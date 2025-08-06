'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/supabase-provider';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

// Icons
import { 
  PlusIcon, 
  SearchIcon, 
  FilterIcon, 
  DollarSignIcon, 
  PackageIcon, 
  CheckIcon, 
  ClockIcon, 
  XIcon,
  TruckIcon,
  DownloadIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@/components/icons';

// React import for JSX typing
import React from 'react';

type BuybackTicket = {
  id: string;
  ticket_number: string;
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
  };
  device_type: string;
  device_model: string;
  device_condition: string;
  offered_amount: number | null;
  status: string;
  created_at: string;
};

const statusLabels: Record<string, { label: string, color: string, icon: React.ReactNode }> = {
  submitted: { 
    label: 'Submitted', 
    color: 'bg-blue-100 text-blue-800', 
    icon: React.createElement(PackageIcon, { className: "mr-1" }) 
  },
  received: { 
    label: 'Received', 
    color: 'bg-purple-100 text-purple-800', 
    icon: React.createElement(CheckIcon, { className: "mr-1" }) 
  },
  evaluated: { 
    label: 'Evaluated', 
    color: 'bg-yellow-100 text-yellow-800', 
    icon: React.createElement(DollarSignIcon, { className: "mr-1" }) 
  },
  pending_payment: { 
    label: 'Pending Payment', 
    color: 'bg-orange-100 text-orange-800', 
    icon: React.createElement(ClockIcon, { className: "mr-1" }) 
  },
  completed: { 
    label: 'Completed', 
    color: 'bg-green-100 text-green-800', 
    icon: React.createElement(CheckIcon, { className: "mr-1" }) 
  },
  rejected: { 
    label: 'Rejected', 
    color: 'bg-red-100 text-red-800', 
    icon: React.createElement(XIcon, { className: "mr-1" }) 
  },
  returned: { 
    label: 'Returned', 
    color: 'bg-indigo-100 text-indigo-800', 
    icon: React.createElement(TruckIcon, { className: "mr-1" }) 
  }
};

export default function BuybackPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<BuybackTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<string[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    totalValue: 0
  });

  const { supabase, session } = useSupabase();

  useEffect(() => {
    if (!session) return;
    fetchBuybackTickets();
  }, [session, supabase]);
  
  // If no session, redirect to login
  useEffect(() => {
    if (session === null) {
      window.location.href = '/login';
    }
  }, [session]);

  const fetchBuybackTickets = async () => {
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
      
      const companyId = companyData.id as string;
      
      // Fetch buyback tickets for this company
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('buyback_tickets')
        .select(`
          id,
          ticket_number,
          device_type,
          device_model,
          device_condition,
          offered_amount,
          status,
          created_at,
          company_id,
          customers(id, first_name, last_name, email)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (ticketsError) throw ticketsError;
      
      // Format the tickets data
      const formattedTickets: BuybackTicket[] = ticketsData.map((ticket: any) => {
        // Ensure device_condition has a default value if it's missing
        const deviceCondition = ticket.device_condition || 'unknown';
        
        return {
          id: ticket.id,
          ticket_number: ticket.ticket_number,
          customer: {
            id: ticket.customers?.id || '',
            first_name: ticket.customers?.first_name || 'Unknown',
            last_name: ticket.customers?.last_name || 'Customer',
            email: ticket.customers?.email || null,
          },
          device_type: ticket.device_type,
          device_model: ticket.device_model,
          device_condition: deviceCondition,
          offered_amount: ticket.offered_amount,
          status: ticket.status,
          created_at: ticket.created_at,
        };
      });
      
      setTickets(formattedTickets);
      
      // Extract unique device types for filtering
      const uniqueDeviceTypes = Array.from(new Set(formattedTickets.map(t => t.device_type)));
      setDeviceTypes(uniqueDeviceTypes);
      
      // Calculate stats
      const pendingCount = formattedTickets.filter(t => 
        ['submitted', 'received', 'evaluated', 'pending_payment'].includes(t.status)
      ).length;
      
      const completedCount = formattedTickets.filter(t => t.status === 'completed').length;
      
      const totalValue = formattedTickets
        .filter(t => t.status === 'completed')
        .reduce((sum, ticket) => sum + (ticket.offered_amount || 0), 0);
      
      setStats({
        total: formattedTickets.length,
        pending: pendingCount,
        completed: completedCount,
        totalValue: totalValue
      });
      
    } catch (error) {
      console.error('Error fetching buyback tickets:', error);
      toast.error('Failed to load buyback tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      } else {
        return [...prev, status];
      }
    });
  };

  const handleDeviceTypeFilterChange = (deviceType: string) => {
    setDeviceTypeFilter(prev => {
      if (prev.includes(deviceType)) {
        return prev.filter(dt => dt !== deviceType);
      } else {
        return [...prev, deviceType];
      }
    });
  };

  const resetFilters = () => {
    setStatusFilter([]);
    setDeviceTypeFilter([]);
    setSearchQuery('');
  };

  const filteredTickets = tickets.filter(ticket => {
    // Search query filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      ticket.ticket_number.toLowerCase().includes(searchLower) ||
      `${ticket.customer.first_name} ${ticket.customer.last_name}`.toLowerCase().includes(searchLower) ||
      ticket.device_type.toLowerCase().includes(searchLower) ||
      ticket.device_model.toLowerCase().includes(searchLower);
    
    // Status filter
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(ticket.status);
    
    // Device type filter
    const matchesDeviceType = deviceTypeFilter.length === 0 || deviceTypeFilter.includes(ticket.device_type);
    
    return matchesSearch && matchesStatus && matchesDeviceType;
  });

  const formatCurrency = (amount: number | null): string => {
    if (amount === null) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Device Buyback</h1>
        <div className="mt-4 md:mt-0">
          <Link href="/dashboard/buyback/new" className="btn-primary">
            <PlusIcon className="mr-2" /> New Buyback
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-800 mr-4">
              <PackageIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Buybacks</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-800 mr-4">
              <ClockIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Buybacks</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-800 mr-4">
              <CheckIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Completed Buybacks</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-800 mr-4">
              <DollarSignIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
            <div className="relative flex-1 mb-4 md:mb-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="form-input pl-10 w-full"
                placeholder="Search by ticket #, customer, or device..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                className="btn-outline flex items-center"
                onClick={() => setShowFilters(!showFilters)}
              >
                <FilterIcon className="mr-2" />
                Filters
                {showFilters ? <ChevronUpIcon className="ml-1" /> : <ChevronDownIcon className="ml-1" />}
              </button>
              {(statusFilter.length > 0 || deviceTypeFilter.length > 0) && (
                <button
                  type="button"
                  className="btn-outline flex items-center"
                  onClick={resetFilters}
                >
                  <XIcon className="mr-2" /> Clear
                </button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Status</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(statusLabels).map(([status, { label, color }]) => (
                      <button
                        key={status}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${statusFilter.includes(status) ? color : 'bg-gray-100 text-gray-800'}`}
                        onClick={() => handleStatusFilterChange(status)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Device Type</h3>
                  <div className="flex flex-wrap gap-2">
                    {deviceTypes.map((deviceType) => (
                      <button
                        key={deviceType}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${deviceTypeFilter.includes(deviceType) ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'}`}
                        onClick={() => handleDeviceTypeFilterChange(deviceType)}
                      >
                        {deviceType}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Buyback Tickets {filteredTickets.length > 0 && `(${filteredTickets.length})`}
          </h2>
        </div>

        {loading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-6 text-center">
            <PackageIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No buyback tickets found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || statusFilter.length > 0 || deviceTypeFilter.length > 0 ? 
                'Try adjusting your search or filters' : 
                'Get started by creating a new buyback ticket'}
            </p>
            <div className="mt-6">
              <Link href="/dashboard/buyback/new" className="btn-primary">
                <PlusIcon className="mr-2" /> New Buyback
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Device
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Condition
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Offered Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {ticket.ticket_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Link href={`/dashboard/customers/${ticket.customer.id}`} className="text-blue-600 hover:text-blue-900">
                        {ticket.customer.first_name} {ticket.customer.last_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ticket.device_type} - {ticket.device_model}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ticket.device_condition === 'excellent' ? 'bg-green-100 text-green-800' :
                        ticket.device_condition === 'good' ? 'bg-blue-100 text-blue-800' :
                        ticket.device_condition === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                        ticket.device_condition === 'poor' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {ticket.device_condition.charAt(0).toUpperCase() + ticket.device_condition.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ticket.offered_amount ? formatCurrency(ticket.offered_amount) : 'Pending'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusLabels[ticket.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[ticket.status]?.icon}
                        {statusLabels[ticket.status]?.label || ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(ticket.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link 
                          href={`/dashboard/buyback/${ticket.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </Link>
                        {ticket.status === 'completed' && (
                          <Link 
                            href={`/dashboard/buyback/${ticket.id}/receipt`}
                            className="text-green-600 hover:text-green-900"
                          >
                            <DownloadIcon className="w-5 h-5" />
                          </Link>
                        )}
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