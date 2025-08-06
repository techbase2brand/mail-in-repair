'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/supabase-provider';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

// Icons
import { 
  ArrowLeftIcon, 
  SaveIcon, 
  XIcon, 
  PlusIcon,
  UploadIcon,
  InfoIcon
} from '@/components/icons';

type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
};

export default function NewRefurbishingTicket() {
  const router = useRouter();
  const { supabase, session } = useSupabase();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deviceType, setDeviceType] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [notes, setNotes] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchCustomers();
    }
  }, [searchTerm]);

  // Redirect to login if no session
  useEffect(() => {
    if (session === null) {
      router.push('/login');
    }
  }, [session, router]);

  const searchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email, phone')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .limit(5);

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error searching customers:', error);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerSearch(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setUploadedFiles(prev => [...prev, ...filesArray]);
      
      // Create preview URLs for the files
      const newPreviewUrls = filesArray.map(file => URL.createObjectURL(file));
      setFilePreviewUrls(prev => [...prev, ...newPreviewUrls]);
    }
  };

  const removeFile = (index: number) => {
    // Revoke the object URL to avoid memory leaks
    URL.revokeObjectURL(filePreviewUrls[index]);
    
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }
    
    if (!deviceType || !deviceModel) {
      toast.error('Please enter device information');
      return;
    }

    if (!session || !session.user) {
      toast.error('You must be logged in to create a refurbishing ticket');
      router.push('/login');
      return;
    }
    
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
        throw new Error('Could not retrieve company information');
      }
      
      const companyId = companyData.id;
      
      // 1. Create the refurbishing ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('refurbishing_tickets')
        .insert({
          customer_id: selectedCustomer.id,
          company_id: companyId,
          device_type: deviceType,
          device_model: deviceModel,
          status: 'submitted',
          notes: notes,
        })
        .select()
        .single();
      
      if (ticketError) throw ticketError;
      
      // 2. Upload files if any
      if (uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          const filePath = `refurbishing/${ticketData.id}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('refurbishing_media')
            .upload(filePath, file);
          
          if (uploadError) throw uploadError;
          
          // Get the public URL
          const { data: publicUrlData } = supabase.storage
            .from('refurbishing_media')
            .getPublicUrl(filePath);
          
          // Save the media reference
          const { error: mediaError } = await supabase
            .from('refurbishing_media')
            .insert({
              refurbishing_ticket_id: ticketData.id,
              file_url: publicUrlData.publicUrl,
              file_type: file.type.startsWith('image/') ? 'image' : 'video',
              description: 'Initial submission',
              is_before: true,
            });
          
          if (mediaError) throw mediaError;
        }
      }
      
      toast.success('Refurbishing ticket created successfully');
      router.push(`/dashboard/refurbishing/${ticketData.id}`);
      
    } catch (error) {
      console.error('Error creating refurbishing ticket:', error);
      toast.error('Failed to create refurbishing ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Link href="/dashboard/refurbishing" className="mr-4">
          <ArrowLeftIcon className="w-5 h-5 text-gray-500 hover:text-gray-700" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Refurbishing Ticket</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {/* Customer Selection */}
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h2>
              
              {selectedCustomer ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">
                        {selectedCustomer.first_name} {selectedCustomer.last_name}
                      </p>
                      {selectedCustomer.email && (
                        <p className="text-sm text-gray-600">{selectedCustomer.email}</p>
                      )}
                      {selectedCustomer.phone && (
                        <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
                      )}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setSelectedCustomer(null)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <XIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-1">
                      Search Customer
                    </label>
                    <Link 
                      href="/dashboard/customers/new"
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <PlusIcon className="w-4 h-4 mr-1" /> New Customer
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      id="customer"
                      className="form-input w-full"
                      placeholder="Search by name, email, or phone"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShowCustomerSearch(true);
                      }}
                      onFocus={() => setShowCustomerSearch(true)}
                    />
                    
                    {showCustomerSearch && searchTerm.length >= 2 && (
                      <div className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                        {customers.length > 0 ? (
                          <ul className="py-1">
                            {customers.map((customer) => (
                              <li 
                                key={customer.id}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                onClick={() => handleCustomerSelect(customer)}
                              >
                                <div className="font-medium">
                                  {customer.first_name} {customer.last_name}
                                </div>
                                {customer.email && (
                                  <div className="text-sm text-gray-600">{customer.email}</div>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="px-4 py-2 text-sm text-gray-500">
                            No customers found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Device Information */}
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Device Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="deviceType" className="block text-sm font-medium text-gray-700 mb-1">
                    Device Type*
                  </label>
                  <input
                    type="text"
                    id="deviceType"
                    className="form-input w-full"
                    placeholder="e.g., iPhone, Samsung Galaxy"
                    value={deviceType}
                    onChange={(e) => setDeviceType(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="deviceModel" className="block text-sm font-medium text-gray-700 mb-1">
                    Device Model*
                  </label>
                  <input
                    type="text"
                    id="deviceModel"
                    className="form-input w-full"
                    placeholder="e.g., iPhone 13 Pro, S21 Ultra"
                    value={deviceModel}
                    onChange={(e) => setDeviceModel(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
            
            {/* Notes */}
            <div className="mb-6">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                rows={4}
                className="form-textarea w-full"
                placeholder="Additional information about the device or refurbishing requirements"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            
            {/* File Upload */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="files" className="block text-sm font-medium text-gray-700">
                  Upload Photos/Videos
                </label>
                <div className="text-xs text-gray-500 flex items-center">
                  <InfoIcon className="w-4 h-4 mr-1" />
                  Upload images of the screen condition
                </div>
              </div>
              
              <div className="mt-2">
                <label 
                  htmlFor="file-upload" 
                  className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                >
                  <div className="flex items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <span>Drag and drop files here, or</span>
                        <span className="relative ml-1 text-blue-600 hover:text-blue-500 cursor-pointer">
                          browse
                          <input 
                            id="file-upload" 
                            name="file-upload" 
                            type="file" 
                            className="sr-only" 
                            multiple 
                            accept="image/*,video/*"
                            onChange={handleFileChange}
                          />
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, GIF up to 10MB
                      </p>
                    </div>
                  </div>
                </label>
              </div>
              
              {/* File Previews */}
              {filePreviewUrls.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {filePreviewUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-md bg-gray-200">
                        {uploadedFiles[index]?.type.startsWith('image/') ? (
                          <img 
                            src={url} 
                            alt={`Preview ${index}`} 
                            className="object-cover"
                          />
                        ) : (
                          <video 
                            src={url} 
                            className="object-cover w-full h-full"
                            controls
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeFile(index)}
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Form Actions */}
          <div className="px-6 py-4 bg-gray-50 text-right">
            <Link 
              href="/dashboard/refurbishing"
              className="btn-outline mr-3"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center">
                  <SaveIcon className="mr-2" />
                  Create Ticket
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}