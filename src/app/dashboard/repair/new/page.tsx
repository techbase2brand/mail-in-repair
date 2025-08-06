'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/supabase-provider';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeftIcon, SearchIcon, UploadIcon, XIcon } from '@/components/icons';

type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
};

type UploadedFile = {
  file: File;
  preview: string;
  uploading: boolean;
  error: string | null;
  path?: string;
};

export default function NewRepairTicket() {
  const router = useRouter();
  const { supabase, session } = useSupabase();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerSearch, setShowCustomerSearch] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [formData, setFormData] = useState({
    deviceType: '',
    deviceModel: '',
    serialNumber: '',
    issueDescription: '',
    customerNotes: '',
  });

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchCustomers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Redirect to login if no session
  useEffect(() => {
    if (session === null) {
      router.push('/login');
    }
  }, [session, router]);

  const searchCustomers = async () => {
    try {
      const query = searchQuery.toLowerCase();
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching customers:', error);
      toast.error('Failed to search customers');
    }
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: UploadedFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Only accept images and videos
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error(`File ${file.name} is not an image or video`);
        continue;
      }
      
      newFiles.push({
        file,
        preview: URL.createObjectURL(file),
        uploading: false,
        error: null
      });
    }

    setUploadedFiles([...uploadedFiles, ...newFiles]);
    e.target.value = ''; // Reset input
  };

  const removeFile = (index: number) => {
    const newFiles = [...uploadedFiles];
    URL.revokeObjectURL(newFiles[index].preview);
    newFiles.splice(index, 1);
    setUploadedFiles(newFiles);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    if (!formData.deviceType || !formData.deviceModel || !formData.issueDescription) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!session || !session.user) {
      toast.error('You must be logged in to create a repair ticket');
      router.push('/login');
      return;
    }

    try {
      setLoading(true);
      
      // Generate a ticket number
      const ticketNumber = `REP-${Date.now().toString().slice(-6)}`;
      
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
      
      // Create repair ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('repair_tickets')
        .insert({
          customer_id: selectedCustomer.id,
          company_id: companyId,
          ticket_number: ticketNumber,
          device_type: formData.deviceType,
          device_model: formData.deviceModel,
          serial_number: formData.serialNumber,
          issue_description: formData.issueDescription,
          // customer_notes field removed as it doesn't exist in the database schema
          status: 'submitted',
        })
        .select();

      if (ticketError) throw ticketError;
      
      if (!ticketData || ticketData.length === 0) {
        throw new Error('Failed to create repair ticket');
      }
      
      const ticketId = ticketData[0].id;
      
      // Add status history record
      const { error: statusHistoryError } = await supabase
        .from('repair_status_history')
        .insert({
          repair_ticket_id: ticketId,
          status: 'submitted',
          notes: 'Ticket created',
          created_by: session.user.id
        });
        
      if (statusHistoryError) {
        console.error('Error creating status history:', statusHistoryError);
        // Continue with the process even if status history fails
      }
      
      // Upload files if any
      if (uploadedFiles.length > 0) {
        const uploadPromises = uploadedFiles.map(async (uploadedFile, index) => {
          try {
            const file = uploadedFile.file;
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${index}.${fileExt}`;
            const filePath = `repair/${ticketId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('repair_media')
              .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: publicUrlData } = supabase.storage
              .from('repair_media')
              .getPublicUrl(filePath);

            // Insert into repair_media table
            const { error: mediaError } = await supabase
              .from('repair_media')
              .insert({
                repair_ticket_id: ticketId,
                file_type: file.type.startsWith('image/') ? 'image' : 'video',
                description: file.name,
                file_url: publicUrlData.publicUrl,
                is_before: true,
              });

            if (mediaError) throw mediaError;

            return { success: true };
          } catch (error) {
            console.error('Error uploading file:', error);
            return { success: false, error };
          }
        });

        await Promise.all(uploadPromises);
      }
      
      toast.success('Repair ticket created successfully');
      router.push(`/dashboard/repair/${ticketId}`);
      
    } catch (error) {
      console.error('Error creating repair ticket:', error);
      toast.error('Failed to create repair ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Link href="/dashboard/repair" className="mr-4">
          <ArrowLeftIcon className="h-6 w-6 text-gray-500 hover:text-gray-700" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Create New Repair Ticket
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            {/* Customer Selection */}
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h2>
              
              {showCustomerSearch ? (
                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <SearchIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      className="form-input pl-10 w-full"
                      placeholder="Search customers by name, email, or phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div className="mt-2 bg-white border border-gray-200 rounded-md shadow-sm max-h-60 overflow-y-auto">
                      {searchResults.map((customer) => (
                        <div
                          key={customer.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-200 last:border-b-0"
                          onClick={() => selectCustomer(customer)}
                        >
                          <div className="font-medium">{customer.first_name} {customer.last_name}</div>
                          <div className="text-sm text-gray-500">{customer.email}</div>
                          <div className="text-sm text-gray-500">{customer.phone}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {searchQuery.length >= 2 && searchResults.length === 0 && (
                    <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md text-gray-500">
                      No customers found. Please try a different search term.
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{selectedCustomer?.first_name} {selectedCustomer?.last_name}</div>
                      <div className="text-sm text-gray-500">{selectedCustomer?.email}</div>
                      <div className="text-sm text-gray-500">{selectedCustomer?.phone}</div>
                    </div>
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-800 text-sm"
                      onClick={() => setShowCustomerSearch(true)}
                    >
                      Change
                    </button>
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
                    Device Type *
                  </label>
                  <select
                    id="deviceType"
                    name="deviceType"
                    className="form-select w-full"
                    value={formData.deviceType}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Device Type</option>
                    <option value="Smartphone">Smartphone</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Laptop">Laptop</option>
                    <option value="Desktop">Desktop</option>
                    <option value="Gaming Console">Gaming Console</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="deviceModel" className="block text-sm font-medium text-gray-700 mb-1">
                    Device Model *
                  </label>
                  <input
                    type="text"
                    id="deviceModel"
                    name="deviceModel"
                    className="form-input w-full"
                    placeholder="e.g. iPhone 13 Pro, Samsung Galaxy S21"
                    value={formData.deviceModel}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="serialNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    id="serialNumber"
                    name="serialNumber"
                    className="form-input w-full"
                    placeholder="Device serial number"
                    value={formData.serialNumber}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            {/* Issue Description */}
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Issue Details</h2>
              <div>
                <label htmlFor="issueDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  Issue Description *
                </label>
                <textarea
                  id="issueDescription"
                  name="issueDescription"
                  rows={4}
                  className="form-textarea w-full"
                  placeholder="Describe the issue with the device"
                  value={formData.issueDescription}
                  onChange={handleInputChange}
                  required
                ></textarea>
              </div>
              <div className="mt-4">
                <label htmlFor="customerNotes" className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  id="customerNotes"
                  name="customerNotes"
                  rows={3}
                  className="form-textarea w-full"
                  placeholder="Any additional information or special requests"
                  value={formData.customerNotes}
                  onChange={handleInputChange}
                ></textarea>
              </div>
            </div>

            {/* File Upload */}
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Photos/Videos</h2>
              <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    Drag and drop files here, or click to select files
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Upload photos and videos of the device issue
                  </p>
                  <button type="button" className="btn-outline mt-4">
                    Select Files
                  </button>
                </label>
              </div>
              
              {uploadedFiles.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Files</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-md bg-gray-200">
                          {file.file.type.startsWith('image/') ? (
                            <img
                              src={file.preview}
                              alt="Preview"
                              className="object-cover"
                            />
                          ) : (
                            <video
                              src={file.preview}
                              className="object-cover"
                              controls
                            />
                          )}
                        </div>
                        <button
                          type="button"
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeFile(index)}
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                        <p className="mt-1 text-xs truncate">{file.file.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-2">
              <Link href="/dashboard/repair" className="btn-outline">
                Cancel
              </Link>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Repair Ticket'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}