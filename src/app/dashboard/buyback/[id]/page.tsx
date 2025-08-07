'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/supabase-provider';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';
import { sendEmail, generateNotificationEmail } from '@/utils/email';
import { ArrowLeftIcon, Edit2Icon, SaveIcon, XIcon, CheckIcon, DollarSignIcon, ImageIcon, MessageSquareIcon, ClockIcon, UploadIcon, DownloadIcon, TrashIcon, SendIcon } from '@/components/icons';

type BuybackTicket = {
  id: string;
  ticket_number: string;
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
  };
  device_type: string;
  device_model: string;
  device_condition: string;
  device_description: string | null;
  offered_amount: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  notes: string | null;
};

type Media = {
  id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  public_url: string;
  media_type: string;
  created_at: string;
};

type Message = {
  id: string;
  content: string;
  sender_type: 'staff' | 'customer';
  created_at: string;
  sender_name: string;
};

type StatusHistory = {
  id: string;
  status: string;
  created_at: string;
  notes: string | null;
};

type UploadedFile = {
  file: File;
  preview: string;
  uploading: boolean;
  error: string | null;
  path?: string;
};

const statusLabels: Record<string, { label: string, color: string }> = {
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-800' },
  received: { label: 'Received', color: 'bg-purple-100 text-purple-800' },
  evaluated: { label: 'Evaluated', color: 'bg-yellow-100 text-yellow-800' },
  pending_payment: { label: 'Pending Payment', color: 'bg-orange-100 text-orange-800' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  returned: { label: 'Returned', color: 'bg-indigo-100 text-indigo-800' }
};

export default function BuybackDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { supabase, session } = useSupabase();
  const [ticket, setTicket] = useState<BuybackTicket | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editedTicket, setEditedTicket] = useState<Partial<BuybackTicket>>({});
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  
  // Device condition options
  const conditionOptions = [
    { value: 'excellent', label: 'Excellent - Like new, minimal signs of use' },
    { value: 'good', label: 'Good - Minor scratches or wear, fully functional' },
    { value: 'fair', label: 'Fair - Noticeable wear, fully functional' },
    { value: 'poor', label: 'Poor - Significant wear, may have minor issues' },
    { value: 'damaged', label: 'Damaged - Has significant damage or issues' }
  ];

  useEffect(() => {
    fetchTicketData();
  }, [params.id]);

  const fetchTicketData = async () => {
    try {
      setLoading(true);
      
      // Fetch buyback ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('buyback_tickets')
        .select(`
          id,
          ticket_number,
          device_type,
          device_model,
          device_condition,
          device_description,
          offered_amount,
          status,
          created_at,
          updated_at,
          notes,
          customers(id, first_name, last_name, email, phone)
        `)
        .eq('id', params.id)
        .single();
      
      if (ticketError) throw ticketError;
      
      // Format the ticket data
      const formattedTicket: BuybackTicket = {
        id: ticketData.id as string,
        ticket_number: ticketData.ticket_number as string,
        customer: {
          id: ((ticketData.customers as any)?.id) || '',
          first_name: ((ticketData.customers as any)?.first_name) || 'Unknown',
          last_name: ((ticketData.customers as any)?.last_name) || 'Customer',
          email: ((ticketData.customers as any)?.email) || null,
          phone: ((ticketData.customers as any)?.phone) || null,
        },
        device_type: ticketData.device_type as string,
        device_model: ticketData.device_model as string,
        device_condition: ticketData.device_condition as string,
        device_description: ticketData.device_description as string,
        offered_amount: ticketData.offered_amount as number,
        status: ticketData.status as string,
        created_at: ticketData.created_at as string,
        updated_at: ticketData.updated_at as string,
        notes: ticketData.notes as string,
      };
      
      setTicket(formattedTicket);
      setEditedTicket({
        status: formattedTicket.status,
        offered_amount: formattedTicket.offered_amount,
        notes: formattedTicket.notes,
        device_condition: formattedTicket.device_condition,
      });
      
      // Fetch media
      const { data: mediaData, error: mediaError } = await supabase
        .from('buyback_media')
        .select('*')
        .eq('buyback_ticket_id', params.id)
        .order('created_at', { ascending: false });
      
      if (mediaError) throw mediaError;
      setMedia((mediaData || []) as Media[]);
      
      // Fetch messages
      // There's no dedicated conversations table for buyback, so we'll skip this for now
      // If needed in the future, create a buyback_conversations table
      const messagesData: Message[] = [];

      const messagesError = null;
      
      if (messagesError) throw messagesError;
      setMessages((messagesData || []) as Message[]);
      
      // There's no dedicated status_history table for buyback, so we'll skip this for now
      // If needed in the future, create a buyback_status_history table
      const historyData: StatusHistory[] = [];
      const historyError = null;
      
      if (historyError) throw historyError;
      setStatusHistory((historyData || []) as StatusHistory[]);
      
    } catch (error) {
      console.error('Error fetching buyback ticket data:', error);
      toast.error('Failed to load buyback ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = () => {
    setEditMode(!editMode);
    if (!editMode) {
      setEditedTicket({
        status: ticket?.status,
        offered_amount: ticket?.offered_amount,
        notes: ticket?.notes,
        device_condition: ticket?.device_condition,
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedTicket(prev => ({
      ...prev,
      [name]: name === 'offered_amount' ? (value ? parseFloat(value) : null) : value
    }));
  };

  const handleSaveChanges = async () => {
    if (!ticket) return;
    
    try {
      setLoading(true);
      
      // Check if status has changed
      const statusChanged = ticket.status !== editedTicket.status;
      
      // Update buyback ticket
      const { error: updateError } = await supabase
        .from('buyback_tickets')
        .update({
          status: editedTicket.status,
          offered_amount: editedTicket.offered_amount,
          notes: editedTicket.notes,
          device_condition: editedTicket.device_condition,
        })
        .eq('id', ticket.id);
      
      if (updateError) throw updateError;
      
      // If status changed, add to status history
      // There's no dedicated status_history table for buyback yet
      // This functionality needs to be implemented with a proper buyback_status_history table
      if (statusChanged && editedTicket.status) {
        console.log('Status changed to:', editedTicket.status, 'but buyback_status_history table does not exist yet');
        
        // Send email notification if status changed and customer has email
        if (ticket.customer.email) {
          try {
            // Get company information for the email
            const { data: companyData, error: companyError } = await supabase
              .from('companies')
              .select('id, name, logo_url')
              .eq('user_id', (await supabase.auth.getSession()).data.session?.user.id)
              .single();
            
            if (companyError) throw companyError;
            
            // Generate status-specific message
            let statusMessage = '';
            let actionUrl = `${window.location.origin}/dashboard/buyback/${ticket.id}`;
            
            switch(editedTicket.status) {
              case 'received':
                statusMessage = 'We have received your device for buyback evaluation.';
                break;
              case 'evaluated':
                statusMessage = 'We have evaluated your device.';
                if (editedTicket.offered_amount) {
                  statusMessage += ` Offered amount: $${editedTicket.offered_amount.toFixed(2)}`;
                }
                break;
              case 'pending_payment':
                statusMessage = 'Your buyback is pending payment.';
                if (editedTicket.offered_amount) {
                  statusMessage += ` Amount to be paid: $${editedTicket.offered_amount.toFixed(2)}`;
                }
                break;
              case 'completed':
                statusMessage = 'Your buyback has been completed and payment has been processed.';
                break;
              case 'rejected':
                statusMessage = 'Unfortunately, we are unable to proceed with the buyback of your device.';
                break;
              case 'returned':
                statusMessage = 'Your device has been returned to you.';
                break;
              default:
                statusMessage = `Your buyback ticket status has been updated to ${statusLabels[editedTicket.status as string]?.label || editedTicket.status}.`;
            }
            
            // Generate email content
            const emailContent = generateNotificationEmail({
              companyName: companyData.name,
              companyLogo: companyData.logo_url,
              customerName: `${ticket.customer.first_name} ${ticket.customer.last_name}`,
              ticketNumber: ticket.ticket_number,
              deviceInfo: `${ticket.device_type} ${ticket.device_model}`,
              status: statusLabels[editedTicket.status as string]?.label || editedTicket.status,
              message: statusMessage,
              actionUrl: actionUrl,
              actionText: 'View Buyback Details'
            });
            
            // Send the email
            await sendEmail({
              to: ticket.customer.email,
              subject: `Buyback Update: ${ticket.ticket_number}`,
              html: emailContent,
              ticketId: ticket.id,
              ticketType: 'buyback'
            });
            
            // Add a system message about the email notification
            await supabase
              .from('buyback_conversations')
              .insert({
                buyback_ticket_id: ticket.id,
                sender_type: 'staff',
                content: `Email notification sent to ${ticket.customer.email}`,
              });
              
          } catch (emailError) {
            console.error('Error sending email notification:', emailError);
            // Don't throw here, as the ticket was updated successfully
            // Just log the error and continue
          }
        }
      }
      
      toast.success('Buyback ticket updated successfully');
      setEditMode(false);
      fetchTicketData(); // Refresh data
    } catch (error) {
      console.error('Error updating buyback ticket:', error);
      toast.error('Failed to update buyback ticket');
    } finally {
      setLoading(false);
    }
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

  const uploadFiles = async () => {
    if (!ticket) return;
    
    const uploadPromises = uploadedFiles.map(async (uploadedFile, index) => {
      const newFiles = [...uploadedFiles];
      newFiles[index].uploading = true;
      setUploadedFiles(newFiles);

      try {
        const file = uploadedFile.file;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${index}.${fileExt}`;
        const filePath = `buyback/${ticket.id}/${fileName}`;

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
            buyback_ticket_id: ticket.id,
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

    await Promise.all(uploadPromises);
    setShowMediaUpload(false);
    setUploadedFiles([]);
    fetchTicketData(); // Refresh media list
  };

  const handleSendMessage = async () => {
    if (!ticket || !newMessage.trim()) return;
    
    try {
      setSendingMessage(true);
      
      // Get current user info
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      // Get company info for sender name
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('name')
        .eq('user_id', userData.user.id)
        .single();
      
      if (companyError) throw companyError;
      
      const senderName = companyData?.name || 'Staff';
      
      // There's no dedicated conversations table for buyback yet
      // This functionality needs to be implemented with a proper buyback_conversations table
      const messageError = new Error('Buyback conversations not implemented yet');
      throw messageError;
      
      if (messageError) throw messageError;
      
      setNewMessage('');
      fetchTicketData(); // Refresh messages
      toast.success('Message sent');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const deleteMedia = async (mediaId: string, filePath: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    try {
      setLoading(true);
      
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('buyback_media')
        .remove([filePath]);
      
      if (storageError) throw storageError;
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('buyback_media')
        .delete()
        .eq('id', mediaId);
      
      if (dbError) throw dbError;
      
      toast.success('File deleted successfully');
      fetchTicketData(); // Refresh media list
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    } finally {
      setLoading(false);
    }
  };

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
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  };

  if (loading && !ticket) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          <h3 className="text-lg font-medium">Buyback ticket not found</h3>
          <p className="mt-2">The buyback ticket you are looking for does not exist or has been deleted.</p>
          <Link href="/dashboard/buyback" className="btn-outline mt-4">
            Back to Buyback List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link href="/dashboard/buyback" className="mr-4">
            <ArrowLeftIcon className="h-6 w-6 text-gray-500 hover:text-gray-700" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Buyback #{ticket.ticket_number}
          </h1>
          <span className={`ml-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusLabels[ticket.status]?.color || 'bg-gray-100 text-gray-800'}`}>
            {statusLabels[ticket.status]?.label || ticket.status}
          </span>
        </div>
        <div className="flex space-x-2">
          {ticket.status === 'completed' && (
            <Link href={`/dashboard/buyback/${ticket.id}/receipt`} className="btn-outline">
              <DownloadIcon className="mr-2" /> Receipt
            </Link>
          )}
          <button
            type="button"
            className={`${editMode ? 'btn-primary' : 'btn-outline'}`}
            onClick={editMode ? handleSaveChanges : handleEditToggle}
            disabled={loading}
          >
            {editMode ? (
              <>
                <SaveIcon className="mr-2" /> Save Changes
              </>
            ) : (
              <>
                <Edit2Icon className="mr-2" /> Edit
              </>
            )}
          </button>
          {editMode && (
            <button
              type="button"
              className="btn-outline"
              onClick={handleEditToggle}
            >
              <XIcon className="mr-2" /> Cancel
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Details */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Device Details</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Device Type</h3>
                  <p className="mt-1 text-base text-gray-900">{ticket.device_type}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Device Model</h3>
                  <p className="mt-1 text-base text-gray-900">{ticket.device_model}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Condition</h3>
                  {editMode ? (
                    <select
                      name="device_condition"
                      className="form-select mt-1 w-full"
                      value={editedTicket.device_condition || ''}
                      onChange={handleInputChange}
                    >
                      {conditionOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="mt-1 text-base text-gray-900 capitalize">{ticket.device_condition}</p>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Offered Amount</h3>
                  {editMode ? (
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        name="offered_amount"
                        className="form-input pl-7 w-full"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        value={editedTicket.offered_amount === null ? '' : editedTicket.offered_amount}
                        onChange={handleInputChange}
                      />
                    </div>
                  ) : (
                    <p className="mt-1 text-base text-gray-900">
                      {ticket.offered_amount ? formatCurrency(ticket.offered_amount) : 'Not yet evaluated'}
                    </p>
                  )}
                </div>
              </div>
              {ticket.device_description && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500">Description</h3>
                  <p className="mt-1 text-base text-gray-900 whitespace-pre-line">{ticket.device_description}</p>
                </div>
              )}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                {editMode ? (
                  <select
                    name="status"
                    className="form-select mt-1 w-full"
                    value={editedTicket.status || ''}
                    onChange={handleInputChange}
                  >
                    {Object.entries(statusLabels).map(([value, { label }]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                ) : (
                  <p className="mt-1 text-base text-gray-900">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusLabels[ticket.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                      {statusLabels[ticket.status]?.label || ticket.status}
                    </span>
                  </p>
                )}
              </div>
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500">Notes</h3>
                {editMode ? (
                  <textarea
                    name="notes"
                    className="form-textarea mt-1 w-full h-24"
                    placeholder="Add notes about this buyback ticket"
                    value={editedTicket.notes || ''}
                    onChange={handleInputChange}
                  />
                ) : (
                  <p className="mt-1 text-base text-gray-900 whitespace-pre-line">
                    {ticket.notes || 'No notes added'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Media Gallery */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Photos & Videos</h2>
              <button
                type="button"
                className="btn-outline"
                onClick={() => setShowMediaUpload(!showMediaUpload)}
              >
                <UploadIcon className="mr-2" /> Upload
              </button>
            </div>
            <div className="p-6">
              {showMediaUpload && (
                <div className="mb-6">
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
                      <button type="button" className="btn-outline mt-4">
                        Select Files
                      </button>
                    </label>
                  </div>
                  
                  {uploadedFiles.length > 0 && (
                    <div>
                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
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
                      <div className="mt-4 flex justify-end space-x-2">
                        <button
                          type="button"
                          className="btn-outline"
                          onClick={() => {
                            setUploadedFiles([]);
                            setShowMediaUpload(false);
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={uploadFiles}
                          disabled={uploadedFiles.length === 0}
                        >
                          Upload Files
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {media.length === 0 ? (
                <div className="text-center py-6">
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No media files</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Upload photos or videos of the device
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {media.map((item) => (
                    <div key={item.id} className="relative group">
                      <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-md bg-gray-200">
                        {item.media_type === 'image' ? (
                          <a href={item.public_url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={item.public_url}
                              alt={item.file_name}
                              className="object-cover w-full h-full"
                            />
                          </a>
                        ) : (
                          <video
                            src={item.public_url}
                            className="object-cover w-full h-full"
                            controls
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteMedia(item.id, item.file_path)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                      <p className="mt-1 text-xs truncate">{item.file_name}</p>
                    </div>
                  ))}
                </div>
              )}
              
              {media.length > 8 && (
                <div className="mt-4 text-center">
                  <Link href={`/dashboard/buyback/${ticket.id}/photos`} className="btn-outline">
                    View All Photos
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Messages</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
                {messages.length === 0 ? (
                  <div className="text-center py-6">
                    <MessageSquareIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No messages</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Start a conversation with the customer
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.sender_type === 'staff' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-md rounded-lg px-4 py-2 ${message.sender_type === 'staff' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
                      >
                        <div className="text-xs text-gray-500 mb-1">
                          {message.sender_name} • {formatDate(message.created_at)}
                        </div>
                        <div className="whitespace-pre-line">{message.content}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="mt-4">
                <div className="flex">
                  <textarea
                    className="form-textarea flex-1 resize-none"
                    rows={3}
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                  >
                    {sendingMessage ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <SendIcon className="mr-2" /> Send Message
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Customer</h2>
            </div>
            <div className="p-6">
              <h3 className="font-medium text-gray-900">
                {ticket.customer.first_name} {ticket.customer.last_name}
              </h3>
              {ticket.customer.email && (
                <p className="text-sm text-gray-500 mt-1">
                  <a href={`mailto:${ticket.customer.email}`} className="text-blue-600 hover:text-blue-800">
                    {ticket.customer.email}
                  </a>
                </p>
              )}
              {ticket.customer.phone && (
                <p className="text-sm text-gray-500 mt-1">
                  <a href={`tel:${ticket.customer.phone}`} className="text-blue-600 hover:text-blue-800">
                    {ticket.customer.phone}
                  </a>
                </p>
              )}
              <div className="mt-4">
                <Link href={`/dashboard/customers/${ticket.customer.id}`} className="btn-outline w-full text-center">
                  View Customer
                </Link>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Timeline</h2>
            </div>
            <div className="p-6">
              <div className="flow-root">
                <ul className="-mb-8">
                  {statusHistory.map((item, index) => (
                    <li key={item.id}>
                      <div className="relative pb-8">
                        {index !== statusHistory.length - 1 && (
                          <span
                            className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          />
                        )}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                              <ClockIcon className="h-5 w-5 text-white" />
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-500">
                                Status changed to{' '}
                                <span className="font-medium text-gray-900">
                                  {statusLabels[item.status]?.label || item.status}
                                </span>
                              </p>
                              {item.notes && (
                                <p className="mt-1 text-sm text-gray-500">{item.notes}</p>
                              )}
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              {formatDate(item.created_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                  <li>
                    <div className="relative pb-8">
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-white">
                            <CheckIcon className="h-5 w-5 text-white" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">
                              Buyback ticket created
                            </p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            {formatDate(ticket.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
            </div>
            <div className="p-6 space-y-3">
              {ticket.status === 'completed' && (
                <Link href={`/dashboard/buyback/${ticket.id}/receipt`} className="btn-outline w-full text-center block">
                  <DownloadIcon className="mr-2 inline-block" /> Generate Receipt
                </Link>
              )}
              <Link href={`/dashboard/buyback/${ticket.id}/photos`} className="btn-outline w-full text-center block">
                <ImageIcon className="mr-2 inline-block" /> View All Photos
              </Link>
              <button
                type="button"
                className="btn-outline w-full text-center"
                onClick={() => setShowMediaUpload(true)}
              >
                <UploadIcon className="mr-2 inline-block" /> Upload Media
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}