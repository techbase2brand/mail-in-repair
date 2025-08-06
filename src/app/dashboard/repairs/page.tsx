'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/components/supabase-provider';
import { SearchIcon, FilterIcon, PlusIcon, Edit2Icon, TrashIcon } from '@/components/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type RepairTicket = {
  id: number;
  ticket_number: string;
  customer_id: number;
  customer_name: string;
  device_type: string;
  serial_number: string;
  issue_description: string;
  status: string;
  created_at: string;
  is_urgent: boolean;
};

export default function RepairsPage() {
  const { supabase, session } = useSupabase();
  const router = useRouter();
  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // No redirect needed as we'll use this page directly

  useEffect(() => {
    if (!session) return;
    
    const fetchRepairs = async () => {
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
        
        // Fetch repair tickets with customer information
        let query = supabase
          .from('repair_tickets')
          .select(`
            id,
            ticket_number,
            customer_id,
            device_type,
            serial_number,
            issue_description,
            status,
            created_at,
            is_urgent,
            customers(first_name, last_name)
          `)
          .eq('company_id', companyId as string)
          .order('created_at', { ascending: false });
        
        const { data, error } = await query;
        
        if (error) {
          throw error;
        }
        
        if (data) {
          const formattedRepairs = data.map(repair => ({
            id: repair.id as number,
            ticket_number: repair.ticket_number as string,
            customer_id: repair.customer_id as number,
            customer_name: `${(repair.customers as any)?.first_name || ''} ${(repair.customers as any)?.last_name || ''}`,
            device_type: repair.device_type as string,
            serial_number: repair.serial_number as string,
            issue_description: repair.issue_description as string,
            status: repair.status as string,
            created_at: new Date(repair.created_at as string).toISOString().split('T')[0],
            is_urgent: repair.is_urgent as boolean,
          }));
          
          setRepairs(formattedRepairs);
        }
      } catch (error) {
        console.error('Error fetching repairs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRepairs();
  }, [session, supabase]);

  // If no session, redirect to login
  useEffect(() => {
    if (session === null) {
      window.location.href = '/login';
    }
  }, [session]);

  // Filter repairs based on search term and status filter
  const filteredRepairs = repairs.filter(repair => {
    const matchesSearch = 
      repair.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.device_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.issue_description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || repair.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'received':
        return 'bg-blue-100 text-blue-800';
      case 'diagnosed':
        return 'bg-purple-100 text-purple-800';
      case 'waiting_for_parts':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'delivered':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Repair Tickets</h1>
        <Link 
          href="/dashboard/repair/new" 
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <PlusIcon className="mr-2" /> New Repair
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between mb-4 gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center">
            <FilterIcon className="text-gray-400 mr-2" />
            <select
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="received">Received</option>
              <option value="diagnosed">Diagnosed</option>
              <option value="waiting_for_parts">Waiting for Parts</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
        </div>
      </div>

      {filteredRepairs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-500">No repair tickets found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket #
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Device
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issue
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
                {filteredRepairs.map((repair) => (
                  <tr key={repair.id} className={repair.is_urgent ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {repair.ticket_number}
                      {repair.is_urgent && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Urgent
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {repair.customer_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {repair.device_type}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {repair.issue_description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(repair.status)}`}>
                        {formatStatus(repair.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {repair.created_at}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link 
                        href={`/dashboard/repair/${repair.id}`}
                        className="text-primary-600 hover:text-primary-900 mr-4"
                      >
                        <Edit2Icon className="inline" /> Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}