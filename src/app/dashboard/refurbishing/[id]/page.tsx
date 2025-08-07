'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/supabase-provider';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { sendEmail, generateNotificationEmail } from '@/utils/email';
import Image from 'next/image';

// Icons
import { 
  ArrowLeftIcon, 
  Edit2Icon, 
  TrashIcon, 
  DownloadIcon, 
  MessageSquareIcon,
  ClockIcon,
  CheckIcon,
  XIcon,
  TruckIcon,
  DollarSignIcon,
  PackageIcon,
  UploadIcon,
  InfoIcon,
  SendIcon,
  CameraIcon
} from '@/components/icons';

type RefurbishingTicket = {
  id: string;
  ticket_number: string;
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
  };
  technician: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  device_type: string;
  device_model: string;
  screen_condition_before: string | null;
  screen_condition_after: string | null;
  refurbishing_cost: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  company_id: string;
};

type Media = {
  id: string;
  file_url: string;
  file_type: string;
  description: string | null;
  is_before: boolean;
  created_at: string;
};

type Message = {
  id: string;
  sender_type: string;
  sender_id: string | null;
  message: string;
  created_at: string;
  sender_name?: string;
};

const statusOptions = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'received', label: 'Received' },
  { value: 'graded', label: 'Graded' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'cancelled', label: 'Cancelled' },
];

const gradeOptions = [
  { value: 'A', label: 'Grade A - Excellent' },
  { value: 'B', label: 'Grade B - Good' },
  { value: 'C', label: 'Grade C - Fair' },
  { value: 'D', label: 'Grade D - Poor' },
  { value: 'F', label: 'Grade F - Unusable' },
];

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

export default function RefurbishingTicketDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [ticket, setTicket] = useState<RefurbishingTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState<Media[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [status, setStatus] = useState('');
  const [screenConditionBefore, setScreenConditionBefore] = useState<string | null>(null);
  const [screenConditionAfter, setScreenConditionAfter] = useState<string | null>(null);
  const [refurbishingCost, setRefurbishingCost] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);
  const [isBeforeUpload, setIsBeforeUpload] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchTicketDetails();
  }, [params.id]);

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch ticket details
      const { data: ticketData, error: ticketError } = await supabase
        .from('refurbishing_tickets')
        .select(`
          id,
          ticket_number,
          device_type,
          device_model,
          screen_condition_before,
          screen_condition_after,
          refurbishing_cost,
          status,
          notes,
          created_at,
          updated_at,
          company_id,
          customers(id, first_name, last_name, email, phone),
          technicians(id, first_name, last_name)
        `)
        .eq('id', params.id)
        .single();
      
      if (ticketError) throw ticketError;
      
      // Format the ticket data
      const formattedTicket: RefurbishingTicket = {
        id: ticketData.id,
        ticket_number: ticketData.ticket_number,
        customer: {
          id: (ticketData.customers as any)?.id || '',
          first_name: (ticketData.customers as any)?.first_name || 'Unknown',
          last_name: (ticketData.customers as any)?.last_name || 'Customer',
          email: (ticketData.customers as any)?.email || null,
          phone: (ticketData.customers as any)?.phone || null,
        },
        technician: ticketData.technicians ? {
          id: (ticketData.technicians as any).id,
          first_name: (ticketData.technicians as any).first_name,
          last_name: (ticketData.technicians as any).last_name,
        } : null,
        device_type: ticketData.device_type,
        device_model: ticketData.device_model,
        screen_condition_before: ticketData.screen_condition_before,
        company_id: ticketData.company_id,
        screen_condition_after: ticketData.screen_condition_after,
        refurbishing_cost: ticketData.refurbishing_cost,
        status: ticketData.status,
        notes: ticketData.notes,
        created_at: ticketData.created_at,
        updated_at: ticketData.updated_at,
      };
      
      setTicket(formattedTicket);
      setStatus(formattedTicket.status);
      setScreenConditionBefore(formattedTicket.screen_condition_before);
      setScreenConditionAfter(formattedTicket.screen_condition_after);
      setRefurbishingCost(formattedTicket.refurbishing_cost?.toString() || '');
      setNotes(formattedTicket.notes || '');
      
      // Fetch media
      const { data: mediaData, error: mediaError } = await supabase
        .from('refurbishing_media')
        .select('*')
        .eq('refurbishing_ticket_id', params.id)
        .order('created_at', { ascending: false });
      
      if (mediaError) throw mediaError;
      setMedia(mediaData || []);
      
      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('refurbishing_conversations')
        .select('*')
        .eq('refurbishing_ticket_id', params.id)
        .order('created_at', { ascending: true });
      
      if (messagesError) throw messagesError;
      
      // Format messages with sender names
      const formattedMessages = await Promise.all((messagesData || []).map(async (msg) => {
        let senderName = '';
        
        if (msg.sender_type === 'customer' && msg.sender_id) {
          const { data: customer } = await supabase
            .from('customers')
            .select('first_name, last_name')
            .eq('id', msg.sender_id)
            .single();
          
          if (customer) {
            senderName = `${customer.first_name} ${customer.last_name}`;
          }
        } else if (msg.sender_type === 'technician' && msg.sender_id) {
          const { data: technician } = await supabase
            .from('technicians')
            .select('first_name, last_name')
            .eq('id', msg.sender_id)
            .single();
          
          if (technician) {
            senderName = `${technician.first_name} ${technician.last_name}`;
          }
        } else if (msg.sender_type === 'system') {
          senderName = 'System';
        }
        
        return {
          ...msg,
          sender_name: senderName,
        };
      }));
      
      setMessages(formattedMessages);
      
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      toast.error('Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!ticket) return;
    
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('refurbishing_tickets')
        .update({
          status,
          screen_condition_before: screenConditionBefore,
          screen_condition_after: screenConditionAfter,
          refurbishing_cost: refurbishingCost ? parseFloat(refurbishingCost) : null,
          notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticket.id);
      
      if (error) throw error;
      
      // Add a system message about the status change if it changed
      if (status !== ticket.status) {
        await supabase
          .from('refurbishing_conversations')
          .insert({
            refurbishing_ticket_id: ticket.id,
            sender_type: 'system',
            message: `Status changed from ${ticket.status} to ${status}`,
          });
        
        // Send email notification if status changed and customer has email
        if (ticket.customer.email) {
          try {
            // Get company information for the email
            const { data: companyData, error: companyError } = await supabase
              .from('companies')
              .select('name, logo_url')
              .eq('id', ticket.company_id)
              .single();
            
            if (companyError) throw companyError;
            
            // Generate status-specific message
            let statusMessage = '';
            let actionUrl = `${window.location.origin}/dashboard/refurbishing/${ticket.id}`;
            
            switch(status) {
              case 'received':
                statusMessage = 'We have received your device for refurbishing.';
                break;
              case 'graded':
                statusMessage = `We have graded your device screen as ${screenConditionBefore || 'Grade Unknown'}.`;
                break;
              case 'in_progress':
                statusMessage = 'Your device refurbishing is now in progress.';
                break;
              case 'completed':
                statusMessage = 'Your device refurbishing has been completed.';
                break;
              case 'shipped':
                statusMessage = 'Your refurbished device has been shipped back to you.';
                break;
              default:
                statusMessage = `Your refurbishing ticket status has been updated to ${status}.`;
            }
            
            // Generate email content
            const emailContent = generateNotificationEmail({
              companyName: companyData.name,
              companyLogo: companyData.logo_url,
              customerName: `${ticket.customer.first_name} ${ticket.customer.last_name}`,
              ticketNumber: ticket.ticket_number,
              deviceInfo: `${ticket.device_type} ${ticket.device_model}`,
              status: statusLabels[status]?.label || status,
              message: statusMessage,
              actionUrl: actionUrl,
              actionText: 'View Ticket Details'
            });
            
            // Send the email
            await sendEmail({
              to: ticket.customer.email,
              subject: `Refurbishing Update: ${ticket.ticket_number}`,
              html: emailContent,
              ticketId: ticket.id,
              ticketType: 'refurbishing'
            });
            
            // Add a system message about the email notification
            await supabase
              .from('refurbishing_conversations')
              .insert({
                refurbishing_ticket_id: ticket.id,
                sender_type: 'system',
                message: `Email notification sent to ${ticket.customer.email}`,
              });
              
          } catch (emailError) {
            console.error('Error sending email notification:', emailError);
            // Don't throw here, as the ticket was updated successfully
            // Just log the error and continue
          }
        }
      }
      
      toast.success('Ticket updated successfully');
      setEditMode(false);
      fetchTicketDetails(); // Refresh data
      
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast.error('Failed to update ticket');
    } finally {
      setSaving(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !ticket) return;
    
    try {
      setSendingMessage(true);
      
      // Get current user (technician) ID
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      const { data: userData, error: userError } = await supabase
        .from('technicians')
        .select('id')
        .eq('user_id', session.user.id)
        .single();
      
      if (userError) throw userError;
      
      // Insert the message
      const { error } = await supabase
        .from('refurbishing_conversations')
        .insert({
          refurbishing_ticket_id: ticket.id,
          sender_type: 'technician',
          sender_id: userData.id,
          message: newMessage,
        });
      
      if (error) throw error;
      
      setNewMessage('');
      fetchTicketDetails(); // Refresh messages
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
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

  const handleUploadFiles = async () => {
    if (!ticket || uploadedFiles.length === 0) return;
    
    try {
      setUploading(true);
      
      for (const file of uploadedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `refurbishing/${ticket.id}/${fileName}`;
        
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
            refurbishing_ticket_id: ticket.id,
            file_url: publicUrlData.publicUrl,
            file_type: file.type.startsWith('image/') ? 'image' : 'video',
            description: isBeforeUpload ? 'Before refurbishing' : 'After refurbishing',
            is_before: isBeforeUpload,
          });
        
        if (mediaError) throw mediaError;
      }
      
      // Clear the uploads
      setUploadedFiles([]);
      setFilePreviewUrls([]);
      
      toast.success('Files uploaded successfully');
      fetchTicketDetails(); // Refresh media
      
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
          <p>Ticket not found or you don't have permission to view it.</p>
        </div>
        <Link href="/dashboard/refurbishing" className="btn-outline">
          <ArrowLeftIcon className="mr-2" /> Back to Refurbishing
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center">
          <Link href="/dashboard/refurbishing" className="mr-4">
            <ArrowLeftIcon className="w-5 h-5 text-gray-500 hover:text-gray-700" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              {ticket.ticket_number}
              <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusLabels[ticket.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                {statusLabels[ticket.status]?.icon}
                {statusLabels[ticket.status]?.label || ticket.status}
              </span>
            </h1>
            <p className="text-gray-600 mt-1">
              Created on {formatDate(ticket.created_at)}
            </p>
          </div>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          {!editMode ? (
            <button 
              onClick={() => setEditMode(true)}
              className="btn-outline flex items-center"
            >
              <Edit2Icon className="mr-2" /> Edit Ticket
            </button>
          ) : (
            <button 
              onClick={() => setEditMode(false)}
              className="btn-outline flex items-center"
            >
              <XIcon className="mr-2" /> Cancel
            </button>
          )}
          
          <Link 
            href={`/dashboard/refurbishing/${ticket.id}/invoice`}
            className="btn-primary flex items-center"
          >
            <DownloadIcon className="mr-2" /> Generate Invoice
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Ticket Details */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Refurbishing Details</h2>
            </div>
            
            <div className="p-6">
              {editMode ? (
                <div className="space-y-6">
                  {/* Status */}
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      id="status"
                      className="form-select w-full"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Screen Condition */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="screenConditionBefore" className="block text-sm font-medium text-gray-700 mb-1">
                        Screen Condition Before
                      </label>
                      <select
                        id="screenConditionBefore"
                        className="form-select w-full"
                        value={screenConditionBefore || ''}
                        onChange={(e) => setScreenConditionBefore(e.target.value || null)}
                      >
                        <option value="">Select Condition</option>
                        {gradeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="screenConditionAfter" className="block text-sm font-medium text-gray-700 mb-1">
                        Screen Condition After
                      </label>
                      <select
                        id="screenConditionAfter"
                        className="form-select w-full"
                        value={screenConditionAfter || ''}
                        onChange={(e) => setScreenConditionAfter(e.target.value || null)}
                      >
                        <option value="">Select Condition</option>
                        <option value="A">Grade A - Excellent</option>
                        <option value="B">Grade B - Good</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Refurbishing Cost */}
                  <div>
                    <label htmlFor="refurbishingCost" className="block text-sm font-medium text-gray-700 mb-1">
                      Refurbishing Cost ($)
                    </label>
                    <input
                      type="number"
                      id="refurbishingCost"
                      className="form-input w-full"
                      value={refurbishingCost}
                      onChange={(e) => setRefurbishingCost(e.target.value)}
                      step="0.01"
                      min="0"
                    />
                  </div>
                  
                  {/* Notes */}
                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      rows={4}
                      className="form-textarea w-full"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                  
                  {/* Save Button */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <CheckIcon className="mr-2" />
                          Save Changes
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Device</h3>
                      <p className="mt-1 text-sm text-gray-900">
                        {ticket.device_type} - {ticket.device_model}
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Status</h3>
                      <p className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusLabels[ticket.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                          {statusLabels[ticket.status]?.icon}
                          {statusLabels[ticket.status]?.label || ticket.status}
                        </span>
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Screen Condition Before</h3>
                      <p className="mt-1 text-sm text-gray-900">
                        {ticket.screen_condition_before ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            ticket.screen_condition_before === 'A' ? 'bg-green-100 text-green-800' :
                            ticket.screen_condition_before === 'B' ? 'bg-yellow-100 text-yellow-800' :
                            ticket.screen_condition_before === 'C' ? 'bg-orange-100 text-orange-800' :
                            ticket.screen_condition_before === 'D' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            Grade {ticket.screen_condition_before}
                          </span>
                        ) : (
                          'Not graded yet'
                        )}
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Screen Condition After</h3>
                      <p className="mt-1 text-sm text-gray-900">
                        {ticket.screen_condition_after ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            ticket.screen_condition_after === 'A' ? 'bg-green-100 text-green-800' :
                            ticket.screen_condition_after === 'B' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            Grade {ticket.screen_condition_after}
                          </span>
                        ) : (
                          'Not completed yet'
                        )}
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Refurbishing Cost</h3>
                      <p className="mt-1 text-sm text-gray-900">
                        {ticket.refurbishing_cost ? (
                          `$${ticket.refurbishing_cost.toFixed(2)}`
                        ) : (
                          'Not set'
                        )}
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Assigned Technician</h3>
                      <p className="mt-1 text-sm text-gray-900">
                        {ticket.technician ? (
                          `${ticket.technician.first_name} ${ticket.technician.last_name}`
                        ) : (
                          'Not assigned'
                        )}
                      </p>
                    </div>
                  </div>
                  
                  {ticket.notes && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Notes</h3>
                      <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">{ticket.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Media Gallery */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Photos & Videos</h2>
              <button 
                type="button"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                onClick={() => document.getElementById('media-upload')?.click()}
              >
                <UploadIcon className="mr-1" /> Upload
              </button>
              <input 
                id="media-upload"
                type="file"
                className="hidden"
                multiple
                accept="image/*,video/*"
                onChange={handleFileChange}
              />
            </div>
            
            {uploadedFiles.length > 0 && (
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-900">Files to Upload</h3>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="before-upload"
                        name="upload-type"
                        className="form-radio"
                        checked={isBeforeUpload}
                        onChange={() => setIsBeforeUpload(true)}
                      />
                      <label htmlFor="before-upload" className="ml-2 text-sm text-gray-700">
                        Before Refurbishing
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="after-upload"
                        name="upload-type"
                        className="form-radio"
                        checked={!isBeforeUpload}
                        onChange={() => setIsBeforeUpload(false)}
                      />
                      <label htmlFor="after-upload" className="ml-2 text-sm text-gray-700">
                        After Refurbishing
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
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
                
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleUploadFiles}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <UploadIcon className="mr-2" />
                        Upload Files
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}
            
            <div className="p-6">
              {media.length === 0 ? (
                <div className="text-center py-6">
                  <CameraIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">
                    No photos or videos yet
                  </p>
                  <button 
                    type="button"
                    className="mt-3 btn-outline"
                    onClick={() => document.getElementById('media-upload')?.click()}
                  >
                    <UploadIcon className="mr-2" /> Upload Media
                  </button>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Before Refurbishing</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {media.filter(m => m.is_before).map((item) => (
                        <div key={item.id} className="relative group">
                          <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-md bg-gray-200">
                            {item.file_type === 'image' ? (
                              <img 
                                src={item.file_url} 
                                alt={item.description || 'Before refurbishing'} 
                                className="object-cover"
                              />
                            ) : (
                              <video 
                                src={item.file_url} 
                                className="object-cover w-full h-full"
                                controls
                              />
                            )}
                          </div>
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                            <a 
                              href={item.file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <DownloadIcon className="w-6 h-6" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">After Refurbishing</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {media.filter(m => !m.is_before).length > 0 ? (
                        media.filter(m => !m.is_before).map((item) => (
                          <div key={item.id} className="relative group">
                            <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-md bg-gray-200">
                              {item.file_type === 'image' ? (
                                <img 
                                  src={item.file_url} 
                                  alt={item.description || 'After refurbishing'} 
                                  className="object-cover"
                                />
                              ) : (
                                <video 
                                  src={item.file_url} 
                                  className="object-cover w-full h-full"
                                  controls
                                />
                              )}
                            </div>
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                              <a 
                                href={item.file_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <DownloadIcon className="w-6 h-6" />
                              </a>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full text-center py-4">
                          <p className="text-sm text-gray-500">
                            No after photos yet
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
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
                    <p className="mt-2 text-sm text-gray-500">
                      No messages yet
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.sender_type === 'system' ? 'justify-center' : message.sender_type === 'technician' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`rounded-lg px-4 py-2 max-w-xs sm:max-w-md break-words ${
                          message.sender_type === 'system' 
                            ? 'bg-gray-100 text-gray-600 text-xs' 
                            : message.sender_type === 'technician'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        {message.sender_type !== 'system' && (
                          <p className="text-xs font-medium mb-1">
                            {message.sender_name || message.sender_type}
                          </p>
                        )}
                        <p className="text-sm">{message.message}</p>
                        <p className="text-xs text-right mt-1 opacity-70">
                          {formatDate(message.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="flex">
                <input
                  type="text"
                  className="form-input flex-1 rounded-r-none"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button
                  type="button"
                  className="btn-primary rounded-l-none"
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                >
                  {sendingMessage ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <SendIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Sidebar */}
        <div>
          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Customer</h2>
            </div>
            
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="bg-gray-200 rounded-full p-3 mr-3">
                  <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    {ticket.customer.first_name} {ticket.customer.last_name}
                  </h3>
                  <Link 
                    href={`/dashboard/customers/${ticket.customer.id}`}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    View Profile
                  </Link>
                </div>
              </div>
              
              {ticket.customer.email && (
                <div className="flex items-center mb-3">
                  <svg className="h-4 w-4 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href={`mailto:${ticket.customer.email}`} className="text-sm text-gray-600 hover:text-gray-900">
                    {ticket.customer.email}
                  </a>
                </div>
              )}
              
              {ticket.customer.phone && (
                <div className="flex items-center">
                  <svg className="h-4 w-4 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href={`tel:${ticket.customer.phone}`} className="text-sm text-gray-600 hover:text-gray-900">
                    {ticket.customer.phone}
                  </a>
                </div>
              )}
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
            </div>
            
            <div className="p-6 space-y-3">
              <Link 
                href={`/dashboard/refurbishing/${ticket.id}/invoice`}
                className="btn-outline w-full justify-center"
              >
                <DownloadIcon className="mr-2" /> Generate Invoice
              </Link>
              
              <Link 
                href={`/dashboard/refurbishing/${ticket.id}/photos`}
                className="btn-outline w-full justify-center"
              >
                <CameraIcon className="mr-2" /> View All Photos
              </Link>
              
              <button 
                type="button"
                className="btn-outline w-full justify-center"
                onClick={() => document.getElementById('media-upload')?.click()}
              >
                <UploadIcon className="mr-2" /> Upload Media
              </button>
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
                  <li>
                    <div className="relative pb-8">
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                            <PackageIcon className="h-5 w-5 text-white" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-500">Ticket created</p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            {formatDate(ticket.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                  
                  {ticket.status !== 'submitted' && (
                    <li>
                      <div className="relative pb-8">
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center ring-8 ring-white">
                              <CheckIcon className="h-5 w-5 text-white" />
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-500">Device received</p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              {/* This would ideally come from status history */}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  )}
                  
                  {(ticket.status === 'graded' || ticket.status === 'in_progress' || ticket.status === 'completed' || ticket.status === 'shipped') && (
                    <li>
                      <div className="relative pb-8">
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-yellow-500 flex items-center justify-center ring-8 ring-white">
                              <DollarSignIcon className="h-5 w-5 text-white" />
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-500">
                                Screen graded as {ticket.screen_condition_before ? `Grade ${ticket.screen_condition_before}` : 'Unknown'}
                              </p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              {/* This would ideally come from status history */}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  )}
                  
                  {(ticket.status === 'in_progress' || ticket.status === 'completed' || ticket.status === 'shipped') && (
                    <li>
                      <div className="relative pb-8">
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center ring-8 ring-white">
                              <ClockIcon className="h-5 w-5 text-white" />
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-500">Refurbishing in progress</p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              {/* This would ideally come from status history */}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  )}
                  
                  {(ticket.status === 'completed' || ticket.status === 'shipped') && (
                    <li>
                      <div className="relative pb-8">
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-white">
                              <CheckIcon className="h-5 w-5 text-white" />
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-500">
                                Refurbishing completed, screen graded as {ticket.screen_condition_after ? `Grade ${ticket.screen_condition_after}` : 'Unknown'}
                              </p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              {/* This would ideally come from status history */}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  )}
                  
                  {ticket.status === 'shipped' && (
                    <li>
                      <div className="relative">
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center ring-8 ring-white">
                              <TruckIcon className="h-5 w-5 text-white" />
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-500">Device shipped back to customer</p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              {/* This would ideally come from status history */}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  )}
                  
                  {ticket.status === 'cancelled' && (
                    <li>
                      <div className="relative">
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center ring-8 ring-white">
                              <XIcon className="h-5 w-5 text-white" />
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-500">Ticket cancelled</p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              {/* This would ideally come from status history */}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}