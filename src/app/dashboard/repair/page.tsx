'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/components/supabase-provider';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { 
  PlusIcon, 
  SearchIcon, 
  FilterIcon, 
  DownloadIcon, 
  EyeIcon, 
  ImageIcon,
  ToolIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  TruckIcon,
  XIcon
} from '@/components/icons';

type RepairTicket = {
  id: string;
  ticket_number: string;
  status: string;
  device_type: string;
  device_model: string;
  issue_description: string;
  created_at: string;
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  } | null;
  technician: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
};

export default function RepairDashboard() {
  const { supabase } = useSupabase();
  const [tickets, setTickets] = useState<RepairTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<RepairTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  });

  useEffect(() => {
    fetchRepairTickets();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tickets, searchQuery, statusFilter, deviceTypeFilter]);

  const fetchRepairTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('repair_tickets')
        .select(`
          *,
          customer:customer_id(*),
          technician:technician_id(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedTickets = data as unknown as RepairTicket[];
      setTickets(formattedTickets);

      // Calculate stats
      const total = formattedTickets.length;
      const pending = formattedTickets.filter(ticket => 
        ['submitted', 'received', 'diagnosed'].includes(ticket.status)
      ).length;
      const inProgress = formattedTickets.filter(ticket => 
        ['in_progress', 'parts_ordered', 'ready_for_testing'].includes(ticket.status)
      ).length;
      const completed = formattedTickets.filter(ticket => 
        ['completed', 'shipped'].includes(ticket.status)
      ).length;

      setStats({
        total,
        pending,
        inProgress,
        completed
      });

    } catch (error) {
      console.error('Error fetching repair tickets:', error);
      toast.error('Failed to load repair tickets');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tickets];

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ticket => 
        ticket.ticket_number.toLowerCase().includes(query) ||
        ticket.device_type.toLowerCase().includes(query) ||
        ticket.device_model.toLowerCase().includes(query) ||
        ticket.issue_description.toLowerCase().includes(query) ||
        ticket.customer?.first_name.toLowerCase().includes(query) ||
        ticket.customer?.last_name.toLowerCase().includes(query) ||
        ticket.customer?.email.toLowerCase().includes(query) ||
        ticket.customer?.phone.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }

    // Apply device type filter
    if (deviceTypeFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.device_type === deviceTypeFilter);
    }

    setFilteredTickets(filtered);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'received':
        return 'bg-indigo-100 text-indigo-800';
      case 'diagnosed':
        return 'bg-purple-100 text-purple-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'parts_ordered':
        return 'bg-orange-100 text-orange-800';
      case 'ready_for_testing':
        return 'bg-teal-100 text-teal-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'shipped':
        return 'bg-emerald-100 text-emerald-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const getUniqueDeviceTypes = () => {
    const deviceTypes = tickets.map(ticket => ticket.device_type);
    return ['all', ...Array.from(new Set(deviceTypes))];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <ClockIcon className="mr-1" />;
      case 'received':
        return <ClockIcon className="mr-1" />;
      case 'diagnosed':
        return <AlertTriangleIcon className="mr-1" />;
      case 'in_progress':
        return <ToolIcon className="mr-1" />;
      case 'parts_ordered':
        return <ClockIcon className="mr-1" />;
      case 'ready_for_testing':
        return <ToolIcon className="mr-1" />;
      case 'completed':
        return <CheckCircleIcon className="mr-1" />;
      case 'shipped':
        return <TruckIcon className="mr-1" />;
      case 'cancelled':
        return <XIcon className="mr-1" />;
      default:
        return <ClockIcon className="mr-1" />;
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 md:mb-0">
          Repair Tickets
        </h1>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <Link href="/dashboard/repair/new" className="btn-primary">
            <PlusIcon className="mr-2" /> New Repair Ticket
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-800 mr-4">
              <ClockIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Tickets</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-indigo-100 text-indigo-800 mr-4">
              <ClockIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-800 mr-4">
              <ToolIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">In Progress</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.inProgress}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-800 mr-4">
              <CheckCircleIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:w-96 mb-4 md:mb-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="form-input pl-10 w-full"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                className="btn-outline flex items-center"
                onClick={() => setShowFilters(!showFilters)}
              >
                <FilterIcon className="mr-2" /> Filters
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status-filter"
                  className="form-select w-full"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="received">Received</option>
                  <option value="diagnosed">Diagnosed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="parts_ordered">Parts Ordered</option>
                  <option value="ready_for_testing">Ready for Testing</option>
                  <option value="completed">Completed</option>
                  <option value="shipped">Shipped</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label htmlFor="device-type-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Device Type
                </label>
                <select
                  id="device-type-filter"
                  className="form-select w-full"
                  value={deviceTypeFilter}
                  onChange={(e) => setDeviceTypeFilter(e.target.value)}
                >
                  {getUniqueDeviceTypes().map((type) => (
                    <option key={type} value={type}>
                      {type === 'all' ? 'All Device Types' : type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-4">
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-gray-500">
                {searchQuery || statusFilter !== 'all' || deviceTypeFilter !== 'all'
                  ? 'No tickets match your filters. Try adjusting your search criteria.'
                  : 'No repair tickets found. Create a new ticket to get started.'}
              </p>
              {searchQuery || statusFilter !== 'all' || deviceTypeFilter !== 'all' ? (
                <button
                  type="button"
                  className="btn-outline mt-4"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setDeviceTypeFilter('all');
                  }}
                >
                  Clear Filters
                </button>
              ) : (
                <Link href="/dashboard/repair/new" className="btn-primary mt-4 inline-block">
                  <PlusIcon className="mr-2 inline" /> New Repair Ticket
                </Link>
              )}
            </div>
          ) : (
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
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Technician
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {ticket.ticket_number}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {ticket.customer ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {ticket.customer.first_name} {ticket.customer.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {ticket.customer.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No customer assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {ticket.device_type}
                      </div>
                      <div className="text-sm text-gray-500">
                        {ticket.device_model}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(ticket.status)}`}>
                        {getStatusIcon(ticket.status)}
                        {formatStatus(ticket.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(ticket.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {ticket.technician ? (
                        <div className="text-sm text-gray-900">
                          {ticket.technician.first_name} {ticket.technician.last_name}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          href={`/dashboard/repair/${ticket.id}/photos`}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="View Photos"
                        >
                          <ImageIcon className="h-5 w-5" />
                        </Link>
                        <Link
                          href={`/dashboard/repair/${ticket.id}/invoice`}
                          className="text-green-600 hover:text-green-900"
                          title="View Invoice"
                        >
                          <DownloadIcon className="h-5 w-5" />
                        </Link>
                        <Link
                          href={`/dashboard/repair/${ticket.id}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}