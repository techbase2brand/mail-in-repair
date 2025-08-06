'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/supabase-provider';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';

// Icons
import { 
  ArrowLeftIcon, 
  DownloadIcon, 
  PrinterIcon,
  MailIcon,
  DollarSignIcon,
  PackageIcon,
  CalendarIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  InfoIcon
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
    address: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
  };
  company: {
    id: string;
    name: string;
    logo_url: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
  };
  device_type: string;
  device_model: string;
  screen_condition_before: string | null;
  screen_condition_after: string | null;
  refurbishing_cost: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export default function RefurbishingInvoice({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [ticket, setTicket] = useState<RefurbishingTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [invoiceDate, setInvoiceDate] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');
  const [tax, setTax] = useState<number>(0);
  const [shipping, setShipping] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [isPrinting, setIsPrinting] = useState(false);
  
  useEffect(() => {
    fetchTicketDetails();
    
    // Set default dates
    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + 30); // Due in 30 days
    
    setInvoiceDate(formatDateForInput(today));
    setDueDate(formatDateForInput(dueDate));
    
    // Generate invoice number
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    setInvoiceNumber(`INV-RF-${randomNum}`);
  }, [params.id]);
  
  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch ticket details with customer and company info
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
          customers(id, first_name, last_name, email, phone, address, city, state, zip_code),
          companies(id, name, logo_url, address, city, state, zip_code, phone, email, website)
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
          address: (ticketData.customers as any)?.address || null,
          city: (ticketData.customers as any)?.city || null,
          state: (ticketData.customers as any)?.state || null,
          zip_code: (ticketData.customers as any)?.zip_code || null,
        },
        company: {
          id: (ticketData.companies as any)?.id || '',
          name: (ticketData.companies as any)?.name || 'Company Name',
          logo_url: (ticketData.companies as any)?.logo_url || null,
          address: (ticketData.companies as any)?.address || null,
          city: (ticketData.companies as any)?.city || null,
          state: (ticketData.companies as any)?.state || null,
          zip_code: (ticketData.companies as any)?.zip_code || null,
          phone: (ticketData.companies as any)?.phone || null,
          email: (ticketData.companies as any)?.email || null,
          website: (ticketData.companies as any)?.website || null,
        },
        device_type: ticketData.device_type,
        device_model: ticketData.device_model,
        screen_condition_before: ticketData.screen_condition_before,
        screen_condition_after: ticketData.screen_condition_after,
        refurbishing_cost: ticketData.refurbishing_cost,
        status: ticketData.status,
        notes: ticketData.notes,
        created_at: ticketData.created_at,
        updated_at: ticketData.updated_at,
      };
      
      setTicket(formattedTicket);
      
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      toast.error('Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const handleSendEmail = async () => {
    if (!ticket || !ticket.customer.email) {
      toast.error('Customer email is not available');
      return;
    }
    
    toast.success(`Invoice would be sent to ${ticket.customer.email}`);
    // In a real implementation, this would generate a PDF and send it via email
  };

  const handleDownloadPDF = () => {
    toast.success('Invoice PDF download started');
    // In a real implementation, this would generate and download a PDF
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
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const calculateSubtotal = (): number => {
    return ticket?.refurbishing_cost || 0;
  };

  const calculateTaxAmount = (): number => {
    return (calculateSubtotal() * tax) / 100;
  };

  const calculateTotal = (): number => {
    return calculateSubtotal() + calculateTaxAmount() + shipping - discount;
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
      <div className="print:hidden flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center">
          <Link href={`/dashboard/refurbishing/${ticket.id}`} className="mr-4">
            <ArrowLeftIcon className="w-5 h-5 text-gray-500 hover:text-gray-700" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Invoice for {ticket.ticket_number}</h1>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <button 
            onClick={handlePrint}
            className="btn-outline flex items-center"
          >
            <PrinterIcon className="mr-2" /> Print
          </button>
          <button 
            onClick={handleDownloadPDF}
            className="btn-outline flex items-center"
          >
            <DownloadIcon className="mr-2" /> Download PDF
          </button>
          <button 
            onClick={handleSendEmail}
            className="btn-primary flex items-center"
            disabled={!ticket.customer.email}
          >
            <MailIcon className="mr-2" /> Email Invoice
          </button>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6 print:shadow-none print:m-0">
        <div className="p-6 print:p-0">
          {/* Invoice Header */}
          <div className="flex flex-col md:flex-row justify-between mb-8">
            <div>
              {ticket.company.logo_url ? (
                <Image 
                  src={ticket.company.logo_url} 
                  alt={ticket.company.name} 
                  width={150} 
                  height={50} 
                  className="mb-4"
                />
              ) : (
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{ticket.company.name}</h2>
              )}
              <div className="text-gray-600">
                {ticket.company.address && <p>{ticket.company.address}</p>}
                {(ticket.company.city || ticket.company.state || ticket.company.zip_code) && (
                  <p>
                    {ticket.company.city}{ticket.company.city && ticket.company.state ? ', ' : ''}
                    {ticket.company.state} {ticket.company.zip_code}
                  </p>
                )}
                {ticket.company.phone && (
                  <p className="flex items-center">
                    <PhoneIcon className="mr-1" size={14} /> {ticket.company.phone}
                  </p>
                )}
                {ticket.company.email && (
                  <p className="flex items-center">
                    <MailIcon className="mr-1" size={14} /> {ticket.company.email}
                  </p>
                )}
                {ticket.company.website && (
                  <p className="flex items-center">
                    <svg className="mr-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="2" y1="12" x2="22" y2="12"></line>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                    {ticket.company.website}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 md:mt-0 text-right">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h1>
              <div className="space-y-1 text-gray-600">
                <div className="flex items-center justify-end">
                  <span className="font-medium mr-2">Invoice #:</span>
                  <input 
                    type="text" 
                    className="print:border-none form-input w-40 py-1" 
                    value={invoiceNumber} 
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-end">
                  <span className="font-medium mr-2">Invoice Date:</span>
                  <input 
                    type="date" 
                    className="print:border-none form-input w-40 py-1" 
                    value={invoiceDate} 
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-end">
                  <span className="font-medium mr-2">Due Date:</span>
                  <input 
                    type="date" 
                    className="print:border-none form-input w-40 py-1" 
                    value={dueDate} 
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-end">
                  <span className="font-medium mr-2">Ticket #:</span>
                  <span>{ticket.ticket_number}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bill To */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Bill To:</h3>
            <div className="text-gray-600">
              <p className="font-medium">{ticket.customer.first_name} {ticket.customer.last_name}</p>
              {ticket.customer.address && <p>{ticket.customer.address}</p>}
              {(ticket.customer.city || ticket.customer.state || ticket.customer.zip_code) && (
                <p>
                  {ticket.customer.city}{ticket.customer.city && ticket.customer.state ? ', ' : ''}
                  {ticket.customer.state} {ticket.customer.zip_code}
                </p>
              )}
              {ticket.customer.phone && (
                <p className="flex items-center">
                  <PhoneIcon className="mr-1" size={14} /> {ticket.customer.phone}
                </p>
              )}
              {ticket.customer.email && (
                <p className="flex items-center">
                  <MailIcon className="mr-1" size={14} /> {ticket.customer.email}
                </p>
              )}
            </div>
          </div>
          
          {/* Service Details */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Refurbishing Details:</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th scope="col" className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th scope="col" className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                    <th scope="col" className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Screen Refurbishing Service
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <p>{ticket.device_type} - {ticket.device_model}</p>
                      <p>Before: {ticket.screen_condition_before ? `Grade ${ticket.screen_condition_before}` : 'Not graded'}</p>
                      <p>After: {ticket.screen_condition_after ? `Grade ${ticket.screen_condition_after}` : 'Not completed'}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(ticket.refurbishing_cost)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-full md:w-1/2 lg:w-1/3">
              <div className="border rounded-md overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 border-b">
                  <h4 className="font-medium text-gray-900">Invoice Summary</h4>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="text-gray-900">{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Tax (%):</span>
                    <div className="flex items-center">
                      <input 
                        type="number" 
                        className="print:border-none form-input w-16 py-1 text-right" 
                        value={tax} 
                        onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.1"
                      />
                      <span className="ml-2 text-gray-900">{formatCurrency(calculateTaxAmount())}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Shipping:</span>
                    <div>
                      <input 
                        type="number" 
                        className="print:border-none form-input w-24 py-1 text-right" 
                        value={shipping} 
                        onChange={(e) => setShipping(parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Discount:</span>
                    <div>
                      <input 
                        type="number" 
                        className="print:border-none form-input w-24 py-1 text-right" 
                        value={discount} 
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="pt-2 border-t flex justify-between font-medium">
                    <span className="text-gray-900">Total:</span>
                    <span className="text-gray-900">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Notes */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Notes:</h3>
            <textarea 
              className="print:border-none form-textarea w-full" 
              rows={3} 
              value={additionalNotes} 
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Enter any additional notes or payment instructions here..."
            />
          </div>
          
          {/* Payment Terms */}
          <div className="text-center text-gray-600 text-sm mt-8">
            <p>Thank you for your business!</p>
            <p className="mt-1">Payment is due within 30 days of invoice date.</p>
          </div>
        </div>
      </div>
    </div>
  );
}