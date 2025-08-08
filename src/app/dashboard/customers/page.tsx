'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/supabase-provider';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

// Icons
import { 
  FiPlus as PlusIcon, 
  FiSearch as SearchIcon, 
  FiFilter as FilterIcon,
  FiUser as UserIcon,
  FiPhone as PhoneIcon,
  FiMail as MailIcon,
  FiEdit2 as EditIcon,
  FiTrash2 as TrashIcon,
  FiEye as EyeIcon
} from 'react-icons/fi';

type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  customer_type: string;
  created_at: string;
};

export default function CustomersPage() {
  const router = useRouter();
  const { supabase, session } = useSupabase();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  // Use refs to track fetch status and caching
  const isFetchingRef = useRef(false);
  const lastFetchedRef = useRef<number | null>(null);
  // Cache timeout in milliseconds (5 minutes)
  const CACHE_TIMEOUT = 5 * 60 * 1000;

  useEffect(() => {
    // Redirect to login if no session
    if (!session) {
      router.push('/login');
      return;
    }
    
    // Only fetch if we haven't fetched before or if the cache has expired
    if (!lastFetchedRef.current) {
      fetchCustomers();
    }
    
    // Set up an interval to refresh data every 5 minutes
    const intervalId = setInterval(() => {
      fetchCustomers();
    }, CACHE_TIMEOUT);
    
    // Clean up the interval when the component unmounts
    return () => {
      clearInterval(intervalId);
      isFetchingRef.current = false; // Reset the fetching flag on cleanup
    };
  }, [session, router]);
  
  const fetchCustomers = async () => {
    // Skip if already fetching
    if (isFetchingRef.current) return;
    
    // Check if we've fetched recently (within cache timeout)
    const now = Date.now();
    if (lastFetchedRef.current && (now - lastFetchedRef.current < CACHE_TIMEOUT)) {
      console.log('Using cached customers data');
      return;
    }
    
    try {
      isFetchingRef.current = true;
      setLoading(true);
      
      // Get company ID from session
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', session?.user.id)
        .single();
        
      if (companyError || !companyData) {
        console.error('Error fetching company:', companyError);
        toast.error('Error fetching company data');
        return;
      }
      
      const companyId = companyData.id;
      
      // Fetch customers
      let query = supabase
        .from('customers')
        .select('*')
        .eq('company_id', companyId);
      
      // Apply filters
      if (filterType !== 'all') {
        query = query.eq('customer_type', filterType);
      }
      
      // Apply search if provided
      if (searchQuery) {
        query = query.or(
          `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
        );
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching customers:', error);
        toast.error('Failed to load customers');
        return;
      }
      
      // Only update state if data has changed
      if (JSON.stringify(data) !== JSON.stringify(customers)) {
        setCustomers(data || []);
      }
      
      // Update the last fetched timestamp
      lastFetchedRef.current = Date.now();
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };
  
  const handleFilterChange = (type: string) => {
    setFilterType(type);
    fetchCustomers();
  };
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        <Link 
          href="/dashboard/customers/new" 
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <PlusIcon className="mr-2" />
          Add Customer
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between mb-4 space-y-4 md:space-y-0">
          <form onSubmit={handleSearch} className="flex w-full md:w-1/2">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search customers..."
                className="w-full border rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <SearchIcon className="absolute left-3 top-2.5 text-gray-400" />
            </div>
            <button 
              type="submit"
              className="ml-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Search
            </button>
          </form>
          
          <div className="flex items-center space-x-2">
            <FilterIcon className="text-gray-400" />
            <span className="text-gray-500">Filter:</span>
            <select
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterType}
              onChange={(e) => handleFilterChange(e.target.value)}
            >
              <option value="all">All Customers</option>
              <option value="retail">Retail</option>
              <option value="business">Business</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-6 text-center">
            <div className="bg-gray-100 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto">
              <UserIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No customers found</h3>
            <p className="mt-1 text-gray-500">
              {searchQuery ? 'Try a different search term or clear filters' : 'Get started by adding your first customer'}
            </p>
            {!searchQuery && (
              <Link 
                href="/dashboard/customers/new" 
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Add Customer
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-800 font-medium">
                            {customer.first_name.charAt(0)}{customer.last_name.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {customer.first_name} {customer.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {customer.id.substring(0, 8)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        {customer.email ? (
                          <>
                            <MailIcon className="h-4 w-4 mr-1 text-gray-400" />
                            {customer.email}
                          </>
                        ) : (
                          <span className="text-gray-400">No email</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center mt-1">
                        {customer.phone ? (
                          <>
                            <PhoneIcon className="h-4 w-4 mr-1 text-gray-400" />
                            {customer.phone}
                          </>
                        ) : (
                          <span className="text-gray-400">No phone</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {customer.city || 'N/A'}{customer.state ? `, ${customer.state}` : ''}
                      </div>
                      <div className="text-sm text-gray-500">
                        {customer.postal_code || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${customer.customer_type === 'business' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                        {customer.customer_type === 'business' ? 'Business' : 'Retail'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(customer.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link 
                          href={`/dashboard/customers/${customer.id}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="View"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </Link>
                        <Link 
                          href={`/dashboard/customers/${customer.id}/edit`}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit"
                        >
                          <EditIcon className="h-5 w-5" />
                        </Link>
                        <button
                          onClick={() => {
                            // Handle delete functionality
                            if (confirm(`Are you sure you want to delete ${customer.first_name} ${customer.last_name}?`)) {
                              // Delete logic here
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
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