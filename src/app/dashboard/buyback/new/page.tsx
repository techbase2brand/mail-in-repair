'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/supabase-provider';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeftIcon, UploadIcon, XIcon, CheckIcon } from '@/components/icons';

type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
};

type UploadedFile = {
  file: File;
  preview: string;
  uploading: boolean;
  error: string | null;
  path?: string;
};

export default function NewBuybackPage() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deviceType, setDeviceType] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [deviceCondition, setDeviceCondition] = useState('good');
  const [deviceDescription, setDeviceDescription] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(true);

  // Device type options
  const deviceTypes = ['iPhone', 'iPad', 'MacBook', 'iMac', 'Apple Watch', 'Android Phone', 'Android Tablet', 'Windows Laptop', 'Other'];
  
  // Device condition options
  const conditionOptions = [
    { value: 'excellent', label: 'Excellent - Like new, minimal signs of use' },
    { value: 'good', label: 'Good - Minor scratches or wear, fully functional' },
    { value: 'fair', label: 'Fair - Noticeable wear, fully functional' },
    { value: 'poor', label: 'Poor - Significant wear, may have minor issues' },
    { value: 'damaged', label: 'Damaged - Has significant damage or issues' }
  ];

  useEffect(() => {
    // Debounce search
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchCustomers();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const searchCustomers = async () => {
    if (searchQuery.trim().length < 2) return;
    
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email, phone')
        .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching customers:', error);
      toast.error('Failed to search customers');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSearchQuery('');
    setSearchResults([]);
    setShowCustomerSearch(false);
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

  const uploadFiles = async (ticketId: string) => {
    const uploadPromises = uploadedFiles.map(async (uploadedFile, index) => {
      const newFiles = [...uploadedFiles];
      newFiles[index].uploading = true;
      setUploadedFiles(newFiles);

      try {
        const file = uploadedFile.file;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${index}.${fileExt}`;
        const filePath = `buyback/${ticketId}/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('buyback_media')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('buyback_media')
          .getPublicUrl(filePath);

        // Insert into buyback_media table
        const { error: mediaError } = await supabase
          .from('buyback_media')
          .insert({
            buyback_ticket_id: ticketId,
            file_type: file.type.startsWith('image/') ? 'image' : 'video',
            description: file.name,
            file_url: publicUrlData.publicUrl,
          });

        if (mediaError) throw mediaError;

        newFiles[index].uploading = false;
        newFiles[index].path = filePath;
        setUploadedFiles(newFiles);
        return { success: true, path: filePath };
      } catch (error) {
        console.error('Error uploading file:', error);
        newFiles[index].uploading = false;
        newFiles[index].error = 'Upload failed';
        setUploadedFiles(newFiles);
        return { success: false, error };
      }
    });

    return Promise.all(uploadPromises);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }
    
    if (!deviceType) {
      toast.error('Please select a device type');
      return;
    }
    
    if (!deviceModel) {
      toast.error('Please enter a device model');
      return;
    }
    
    setLoading(true);
    
    try {
      // Get session and company ID
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('You must be logged in to create a buyback ticket');
        router.push('/login');
        return;
      }
      
      // Get company ID
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', session.user.id)
        .single();
        
      if (companyError) {
        console.error('Error getting company:', companyError);
        toast.error('Failed to get company information');
        return;
      }
      
      const companyId = companyData.id;
      
      // Generate ticket number
      const ticketNumber = `BUY-${Date.now().toString().slice(-6)}`;
      
      // Insert buyback ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('buyback_tickets')
        .insert({
          customer_id: selectedCustomer.id,
          company_id: companyId,
          ticket_number: ticketNumber,
          device_type: deviceType,
          device_model: deviceModel,
          device_condition: deviceCondition,
          device_description: deviceDescription,
          offered_amount: null,
          status: 'submitted',
        })
        .select('id')
        .single();
      
      if (ticketError) throw ticketError;
      
      // Upload files if any
      if (uploadedFiles.length > 0) {
        await uploadFiles(ticketData.id);
      }
      
      toast.success('Buyback ticket created successfully');
      router.push(`/dashboard/buyback/${ticketData.id}`);
    } catch (error) {
      console.error('Error creating buyback ticket:', error);
      toast.error('Failed to create buyback ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Link href="/dashboard/buyback" className="mr-4">
          <ArrowLeftIcon className="h-6 w-6 text-gray-500 hover:text-gray-700" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Buyback Request</h1>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            {/* Customer Selection Section */}
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h2>
              
              {showCustomerSearch ? (
                <div>
                  <div className="mb-4">
                    <label htmlFor="customer-search" className="block text-sm font-medium text-gray-700 mb-1">
                      Search for a customer
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="customer-search"
                        className="form-input w-full"
                        placeholder="Search by name, email, or phone"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searching && (
                        <div className="absolute right-3 top-3">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div className="mt-2 border border-gray-200 rounded-md overflow-hidden">
                      <ul className="divide-y divide-gray-200">
                        {searchResults.map((customer) => (
                          <li 
                            key={customer.id} 
                            className="p-4 hover:bg-gray-50 cursor-pointer"
                            onClick={() => handleSelectCustomer(customer)}
                          >
                            <div className="flex justify-between">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {customer.first_name} {customer.last_name}
                                </p>
                                {customer.email && (
                                  <p className="text-sm text-gray-500">{customer.email}</p>
                                )}
                              </div>
                              {customer.phone && (
                                <p className="text-sm text-gray-500">{customer.phone}</p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
                    <div className="mt-2 p-4 border border-gray-200 rounded-md">
                      <p className="text-sm text-gray-500">No customers found. Please try a different search or create a new customer.</p>
                      <Link href="/dashboard/customers/new" className="btn-outline mt-2">
                        Create New Customer
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 border border-gray-200 rounded-md">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">
                        {selectedCustomer?.first_name} {selectedCustomer?.last_name}
                      </p>
                      {selectedCustomer?.email && (
                        <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
                      )}
                      {selectedCustomer?.phone && (
                        <p className="text-sm text-gray-500">{selectedCustomer.phone}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="text-sm text-blue-600 hover:text-blue-800"
                      onClick={() => setShowCustomerSearch(true)}
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Device Information Section */}
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Device Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="device-type" className="block text-sm font-medium text-gray-700 mb-1">
                    Device Type *
                  </label>
                  <select
                    id="device-type"
                    className="form-select w-full"
                    value={deviceType}
                    onChange={(e) => setDeviceType(e.target.value)}
                    required
                  >
                    <option value="">Select device type</option>
                    {deviceTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="device-model" className="block text-sm font-medium text-gray-700 mb-1">
                    Device Model *
                  </label>
                  <input
                    type="text"
                    id="device-model"
                    className="form-input w-full"
                    placeholder="e.g. iPhone 13 Pro, MacBook Air M1"
                    value={deviceModel}
                    onChange={(e) => setDeviceModel(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label htmlFor="device-condition" className="block text-sm font-medium text-gray-700 mb-1">
                  Device Condition *
                </label>
                <select
                  id="device-condition"
                  className="form-select w-full"
                  value={deviceCondition}
                  onChange={(e) => setDeviceCondition(e.target.value)}
                  required
                >
                  {conditionOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="mt-4">
                <label htmlFor="device-description" className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Description
                </label>
                <textarea
                  id="device-description"
                  className="form-textarea w-full h-24"
                  placeholder="Describe the device condition, any accessories included, etc."
                  value={deviceDescription}
                  onChange={(e) => setDeviceDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Photos/Videos Section */}
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Photos & Videos</h2>
              
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
                    Upload photos and videos of the device from multiple angles
                  </p>
                  <button type="button" className="btn-outline mt-4">
                    Select Files
                  </button>
                </label>
              </div>
              
              {uploadedFiles.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Link href="/dashboard/buyback" className="btn-outline">
                Cancel
              </Link>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>Submit Buyback Request</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}