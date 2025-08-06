'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/supabase-provider';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { 
  ArrowLeftIcon, 
  Edit2Icon, 
  SaveIcon, 
  XIcon, 
  ImageIcon, 
  DownloadIcon,
  MessageSquareIcon,
  SendIcon,
  ClockIcon,
  ToolIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  TruckIcon,
  UserIcon,
  DollarSignIcon
} from '@/components/icons';

type RepairTicket = {
  id: string;
  ticket_number: string;
  status: string;
  device_type: string;
  device_model: string;
  serial_number: string;
  issue_description: string;
  customer_notes: string;
  technician_notes: string;
  diagnosis: string;
  estimated_cost: number | null;
  actual_cost: number | null;
  created_at: string;
  updated_at: string;
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

type Technician = {
  id: string;
  first_name: string;
  last_name: string;
};

type Media = {
  id: string;
  file_type: string;
  file_url: string;
  description: string;
  is_before: boolean;
  created_at: string;
};

type Message = {
  id: string;
  content: string;
  sender_type: string;
  created_at: string;
  sender_name: string;
};

type StatusHistory = {
  id: string;
  status: string;
  notes: string;
  created_at: string;
};

export default function RepairTicketDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [ticket, setTicket] = useState<RepairTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [editedTicket, setEditedTicket] = useState<Partial<RepairTicket>>({estimated_cost: null, actual_cost: null});

  useEffect(() => {
    fetchData();
    fetchTechnicians();
  }, [params.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch repair ticket with customer and technician
      // Try to determine if the ID is a UUID or a ticket number
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);
      
      let query = supabase
        .from('repair_tickets')
        .select(`
          *,
          customer:customer_id(*),
          technician:technician_id(*)
        `);
        
      // Query by UUID or ticket number based on the format
      if (isUuid) {
        query = query.eq('id', params.id);
      } else {
        query = query.eq('ticket_number', params.id);
      }
      
      const { data: ticketData, error: ticketError } = await query.single();
      
      if (ticketError) {
        console.error('Error fetching repair ticket:', ticketError);
        toast.error('Error fetching repair ticket details');
        router.push('/dashboard/repair');
        return;
      }
      
      if (!ticketData) {
        console.error('No ticket data found');
        toast.error('Repair ticket not found');
        router.push('/dashboard/repair');
        return;
      }
      
      setTicket(ticketData as unknown as RepairTicket);
      setEditedTicket(ticketData as unknown as RepairTicket);
      
      // Fetch media
      const { data: mediaData, error: mediaError } = await supabase
        .from('repair_media')
        .select('*')
        .eq('repair_ticket_id', ticketData.id)
        .order('created_at', { ascending: false });
      
      if (mediaError) {
        console.error('Error fetching media:', mediaError);
        // Continue execution - media is not critical
      }
      setMedia(mediaData || []);
      
      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('repair_conversations')
        .select('*')
        .eq('repair_ticket_id', ticketData.id)
        .order('created_at', { ascending: true });
      
      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        // Continue execution - messages are not critical
      }
      
      setMessages(messagesData || []);
      
      // Format messages with sender name
      const formattedMessages = messagesData?.map(msg => ({
        ...msg,
        sender_name: msg.sender_type === 'technician' 
          ? ticketData.technician 
            ? `${ticketData.technician.first_name} ${ticketData.technician.last_name}` 
            : 'Technician'
          : ticketData.customer 
            ? `${ticketData.customer.first_name} ${ticketData.customer.last_name}` 
            : 'Customer'
      })) || [];
      
      setMessages(formattedMessages);
      
      // Fetch status history
      const { data: historyData, error: historyError } = await supabase
        .from('repair_status_history')
        .select('*')
        .eq('repair_ticket_id', ticketData.id)
        .order('created_at', { ascending: false });
      
      if (historyError) {
        console.error('Error fetching status history:', historyError);
        // Continue execution - status history is not critical
      }
      setStatusHistory(historyData || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load repair ticket');
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const { data, error } = await supabase
        .from('technicians')
        .select('id, first_name, last_name')
        .order('first_name', { ascending: true });

      if (error) throw error;
      setTechnicians(data || []);
    } catch (error) {
      console.error('Error fetching technicians:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedTicket(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = value === '' ? null : parseFloat(value);
    setEditedTicket(prev => ({
      ...prev,
      [name]: numValue
    }));
  };

  const saveChanges = async () => {
    if (!ticket) return;
    
    try {
      setLoading(true);
      
      // Check if status has changed
      const statusChanged = ticket.status !== editedTicket.status;
      
      // Update repair ticket
      const { error: updateError } = await supabase
        .from('repair_tickets')
        .update({
          status: editedTicket.status,
          technician_id: editedTicket.technician?.id || null,
          technician_notes: editedTicket.technician_notes,
          diagnosis: editedTicket.diagnosis,
          estimated_cost: editedTicket.estimated_cost,
          actual_cost: editedTicket.actual_cost,
        })
        .eq('id', ticket.id);
      
      if (updateError) throw updateError;
      
      // If status changed, add to status history
      if (statusChanged) {
        const { error: historyError } = await supabase
          .from('repair_status_history')
          .insert({
            repair_ticket_id: ticket.id,
            status: editedTicket.status,
            notes: `Status changed to ${formatStatus(editedTicket.status as string)}`,
          });
        
        if (historyError) throw historyError;
      }
      
      toast.success('Repair ticket updated successfully');
      setEditMode(false);
      fetchData(); // Refresh data
      
    } catch (error) {
      console.error('Error updating repair ticket:', error);
      toast.error('Failed to update repair ticket');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!ticket || !newMessage.trim()) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('repair_conversations')
        .insert({
          repair_ticket_id: ticket.id,
          content: newMessage.trim(),
          sender_type: 'technician', // Assuming messages sent from this interface are from technicians
        });
      
      if (error) throw error;
      
      setNewMessage('');
      fetchData(); // Refresh messages
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
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
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
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

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading && !ticket) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-60 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          <h3 className="text-lg font-medium">Repair ticket not found</h3>
          <p className="mt-2">The repair ticket you are looking for does not exist or has been deleted.</p>
          <Link href="/dashboard/repair" className="btn-outline mt-4">
            Back to Repair List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link href="/dashboard/repair" className="mr-4">
            <ArrowLeftIcon className="h-6 w-6 text-gray-500 hover:text-gray-700" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Repair Ticket: {ticket.ticket_number}
          </h1>
        </div>
        <div className="flex space-x-2">
          {editMode ? (
            <>
              <button
                type="button"
                className="btn-outline"
                onClick={() => {
                  setEditedTicket(ticket);
                  setEditMode(false);
                }}
              >
                <XIcon className="mr-2" /> Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={saveChanges}
                disabled={loading}
              >
                <SaveIcon className="mr-2" /> Save Changes
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn-outline"
              onClick={() => setEditMode(true)}
            >
              <Edit2Icon className="mr-2" /> Edit
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Details */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Ticket Details</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  {editMode ? (
                    <select
                      name="status"
                      className="form-select mt-1 w-full"
                      value={editedTicket.status}
                      onChange={handleInputChange}
                    >
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
                  ) : (
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(ticket.status)}`}>
                        {getStatusIcon(ticket.status)}
                        {formatStatus(ticket.status)}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Technician</h3>
                  {editMode ? (
                    <select
                      name="technician_id"
                      className="form-select mt-1 w-full"
                      value={editedTicket.technician?.id || ''}
                      onChange={(e) => {
                        const techId = e.target.value;
                        const selectedTech = technicians.find(t => t.id === techId);
                        setEditedTicket(prev => ({
                          ...prev,
                          technician: selectedTech || null
                        }));
                      }}
                    >
                      <option value="">Unassigned</option>
                      {technicians.map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          {tech.first_name} {tech.last_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">
                      {ticket.technician 
                        ? `${ticket.technician.first_name} ${ticket.technician.last_name}` 
                        : 'Unassigned'}
                    </p>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Device</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {ticket.device_type} - {ticket.device_model}
                  </p>
                  {ticket.serial_number && (
                    <p className="mt-1 text-xs text-gray-500">
                      S/N: {ticket.serial_number}
                    </p>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Created</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDate(ticket.created_at)}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500">Issue Description</h3>
                  <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                    {ticket.issue_description}
                  </p>
                </div>
                {/* Customer Notes section removed as the field doesn't exist in the database schema */}
              </div>
            </div>
          </div>

          {/* Diagnosis and Repair */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Diagnosis & Repair</h2>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Diagnosis</h3>
                  {editMode ? (
                    <textarea
                      name="diagnosis"
                      rows={4}
                      className="form-textarea mt-1 w-full"
                      placeholder="Enter diagnosis details"
                      value={editedTicket.diagnosis || ''}
                      onChange={handleInputChange}
                    ></textarea>
                  ) : (
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                      {ticket.diagnosis || 'No diagnosis provided yet.'}
                    </p>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Technician Notes</h3>
                  {editMode ? (
                    <textarea
                      name="technician_notes"
                      rows={4}
                      className="form-textarea mt-1 w-full"
                      placeholder="Enter technician notes"
                      value={editedTicket.technician_notes || ''}
                      onChange={handleInputChange}
                    ></textarea>
                  ) : (
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                      {ticket.technician_notes || 'No technician notes provided yet.'}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Estimated Cost</h3>
                    {editMode ? (
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="number"
                          name="estimated_cost"
                          className="form-input pl-7 w-full"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          value={editedTicket.estimated_cost === null ? '' : editedTicket.estimated_cost}
                          onChange={handleNumberInputChange}
                        />
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-gray-900">
                        {formatCurrency(ticket.estimated_cost)}
                      </p>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Actual Cost</h3>
                    {editMode ? (
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="number"
                          name="actual_cost"
                          className="form-input pl-7 w-full"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          value={editedTicket.actual_cost === null ? '' : editedTicket.actual_cost}
                          onChange={handleNumberInputChange}
                        />
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-gray-900">
                        {formatCurrency(ticket.actual_cost)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Media Gallery Preview */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Photos & Videos</h2>
              <Link href={`/dashboard/repair/${ticket.id}/photos`} className="text-blue-600 hover:text-blue-800 text-sm">
                View All
              </Link>
            </div>
            <div className="p-6">
              {media.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-500">No media files uploaded yet.</p>
                  <Link href={`/dashboard/repair/${ticket.id}/photos`} className="btn-outline mt-4 inline-block">
                    <ImageIcon className="mr-2 inline" /> Upload Photos/Videos
                  </Link>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {media.slice(0, 4).map((item) => (
                      <div key={item.id} className="relative group">
                        <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-md bg-gray-200">
                          {item.file_type === 'image' ? (
                            <img
                              src={item.file_url}
                              alt={item.description}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <video
                              src={item.file_url}
                              className="object-cover w-full h-full"
                              controls
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {media.length > 4 && (
                    <div className="mt-4 text-center">
                      <Link href={`/dashboard/repair/${ticket.id}/photos`} className="text-blue-600 hover:text-blue-800">
                        View {media.length - 4} more files
                      </Link>
                    </div>
                  )}
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
                  <p className="text-center text-gray-500">No messages yet.</p>
                ) : (
                  messages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.sender_type === 'technician' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`rounded-lg px-4 py-2 max-w-xs sm:max-w-md break-words ${message.sender_type === 'technician' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
                      >
                        <div className="text-xs font-medium mb-1">
                          {message.sender_name} • {formatDate(message.created_at)}
                        </div>
                        <div className="text-sm">{message.content}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex">
                <input
                  type="text"
                  className="form-input flex-grow"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button
                  type="button"
                  className="btn-primary ml-2"
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                >
                  <SendIcon className="h-5 w-5" />
                </button>
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
              {ticket.customer ? (
                <div>
                  <div className="flex items-center mb-4">
                    <div className="bg-gray-100 rounded-full p-2 mr-3">
                      <UserIcon className="h-6 w-6 text-gray-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {ticket.customer.first_name} {ticket.customer.last_name}
                      </h3>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Email:</span> {ticket.customer.email}
                    </p>
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Phone:</span> {ticket.customer.phone}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No customer information available.</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
            </div>
            <div className="p-6">
              <div className="space-y-2">
                <Link href={`/dashboard/repair/${ticket.id}/invoice`} className="btn-outline w-full flex items-center justify-center">
                  <DownloadIcon className="mr-2" /> Generate Invoice
                </Link>
                <Link href={`/dashboard/repair/${ticket.id}/photos`} className="btn-outline w-full flex items-center justify-center">
                  <ImageIcon className="mr-2" /> Manage Photos
                </Link>
              </div>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Status Timeline</h2>
            </div>
            <div className="p-6">
              <div className="flow-root">
                <ul className="-mb-8">
                  {statusHistory.length > 0 ? (
                    statusHistory.map((history, index) => (
                      <li key={history.id}>
                        <div className="relative pb-8">
                          {index !== statusHistory.length - 1 ? (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                          ) : null}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${getStatusBadgeColor(history.status)}`}>
                                {getStatusIcon(history.status)}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-500">
                                  Status changed to <span className="font-medium text-gray-900">{formatStatus(history.status)}</span>
                                </p>
                                {history.notes && (
                                  <p className="mt-1 text-xs text-gray-500">{history.notes}</p>
                                )}
                              </div>
                              <div className="text-right text-xs whitespace-nowrap text-gray-500">
                                {formatDate(history.created_at)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li>
                      <div className="relative pb-8">
                        <div className="relative flex space-x-3">
                          <div>
                            <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${getStatusBadgeColor(ticket.status)}`}>
                              {getStatusIcon(ticket.status)}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-500">
                                Initial status: <span className="font-medium text-gray-900">{formatStatus(ticket.status)}</span>
                              </p>
                            </div>
                            <div className="text-right text-xs whitespace-nowrap text-gray-500">
                              {formatDate(ticket.created_at)}
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

          {/* Cost Summary */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Cost Summary</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Estimated Cost:</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(ticket.estimated_cost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Actual Cost:</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(ticket.actual_cost)}</span>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between">
                    <span className="text-base font-medium text-gray-900">Total:</span>
                    <span className="text-base font-medium text-gray-900">
                      {formatCurrency(ticket.actual_cost !== null ? ticket.actual_cost : ticket.estimated_cost)}
                    </span>
                  </div>
                </div>
                <div className="pt-4">
                  <Link href={`/dashboard/repair/${ticket.id}/invoice`} className="btn-primary w-full flex items-center justify-center">
                    <DollarSignIcon className="mr-2" /> View Invoice
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}