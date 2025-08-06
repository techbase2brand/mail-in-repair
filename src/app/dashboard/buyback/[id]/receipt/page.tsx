'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/components/supabase-provider';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { 
  ArrowLeftIcon, 
  PrinterIcon, 
  DownloadIcon, 
  MailIcon, 
  Edit2Icon, 
  SaveIcon, 
  XIcon,
  CheckIcon
} from '@/components/icons';
import { useReactToPrint } from 'react-to-print';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

type BuybackTicket = {
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
    zip: string | null;
  };
  device_type: string;
  device_model: string;
  device_condition: string;
  device_description: string | null;
  offered_amount: number | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type Company = {
  id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
};

export default function BuybackReceiptPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { supabase, session } = useSupabase();
  const [ticket, setTicket] = useState<BuybackTicket | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [receiptData, setReceiptData] = useState({
    receiptNumber: '',
    receiptDate: '',
    paymentMethod: 'Cash',
    notes: '',
  });
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch buyback ticket with customer details
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
          customers(id, first_name, last_name, email, phone, address, city, state, zip)
        `)
        .eq('id', params.id)
        .single();
      
      if (ticketError) throw ticketError;
      
      // Format the ticket data
      const formattedTicket: BuybackTicket = {
        id: ticketData.id as string,
        ticket_number: ticketData.ticket_number as string,
        customer: {
          id: (ticketData.customers as any)?.id || '',
          first_name: (ticketData.customers as any)?.first_name || 'Unknown',
          last_name: (ticketData.customers as any)?.last_name || 'Customer',
          email: (ticketData.customers as any)?.email || null,
          phone: (ticketData.customers as any)?.phone || null,
          address: (ticketData.customers as any)?.address || null,
          city: (ticketData.customers as any)?.city || null,
          state: (ticketData.customers as any)?.state || null,
          zip: (ticketData.customers as any)?.zip || null,
        },
        device_type: ticketData.device_type as string,
        device_model: ticketData.device_model as string,
        device_condition: ticketData.device_condition as string,
        device_description: ticketData.device_description as string | null,
        offered_amount: ticketData.offered_amount as number | null,
        status: ticketData.status as string,
        created_at: ticketData.created_at as string,
        updated_at: ticketData.updated_at as string,
      };
      
      setTicket(formattedTicket);
      
      // Set initial receipt data
      setReceiptData({
        receiptNumber: `BUY-${ticketData.ticket_number}`,
        receiptDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'Cash',
        notes: '',
      });
      
      // Fetch company info
      if (session?.user) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        
        if (companyError) throw companyError;
        setCompany(companyData as Company);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load receipt data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setReceiptData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Buyback_Receipt_${ticket?.ticket_number}`,
  });

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    
    try {
      toast.loading('Generating PDF...');
      
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Buyback_Receipt_${ticket?.ticket_number}.pdf`);
      
      toast.dismiss();
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.dismiss();
      toast.error('Failed to generate PDF');
    }
  };

  const handleSendEmail = async () => {
    if (!ticket || !ticket.customer.email) {
      toast.error('Customer email is not available');
      return;
    }
    
    try {
      toast.loading('Sending email...');
      
      // Here you would implement the email sending logic
      // This could be a call to a serverless function or API endpoint
      
      // For now, we'll just simulate a successful email send
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.dismiss();
      toast.success(`Receipt sent to ${ticket.customer.email}`);
    } catch (error) {
      console.error('Error sending email:', error);
      toast.dismiss();
      toast.error('Failed to send email');
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
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!ticket || ticket.status !== 'completed') {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4">
          <h3 className="text-lg font-medium">Receipt not available</h3>
          <p className="mt-2">
            {!ticket ? 
              'The buyback ticket was not found.' : 
              'A receipt is only available for completed buyback tickets.'}
          </p>
          <Link href={ticket ? `/dashboard/buyback/${ticket.id}` : '/dashboard/buyback'} className="btn-outline mt-4">
            {ticket ? 'Back to Buyback Details' : 'Back to Buyback List'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link href={`/dashboard/buyback/${ticket.id}`} className="mr-4">
            <ArrowLeftIcon className="h-6 w-6 text-gray-500 hover:text-gray-700" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Buyback Receipt
          </h1>
        </div>
        <div className="flex space-x-2">
          <button
            type="button"
            className="btn-outline"
            onClick={handlePrint}
          >
            <PrinterIcon className="mr-2" /> Print
          </button>
          <button
            type="button"
            className="btn-outline"
            onClick={handleDownloadPDF}
          >
            <DownloadIcon className="mr-2" /> Download PDF
          </button>
          {ticket.customer.email && (
            <button
              type="button"
              className="btn-outline"
              onClick={handleSendEmail}
            >
              <MailIcon className="mr-2" /> Email
            </button>
          )}
          <button
            type="button"
            className={`${editMode ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? (
              <>
                <SaveIcon className="mr-2" /> Save
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
              onClick={() => setEditMode(false)}
            >
              <XIcon className="mr-2" /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* Receipt Form */}
      {editMode && (
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Receipt Details</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="receiptNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Receipt Number
                </label>
                <input
                  type="text"
                  id="receiptNumber"
                  name="receiptNumber"
                  className="form-input w-full"
                  value={receiptData.receiptNumber}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label htmlFor="receiptDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Receipt Date
                </label>
                <input
                  type="date"
                  id="receiptDate"
                  name="receiptDate"
                  className="form-input w-full"
                  value={receiptData.receiptDate}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  className="form-select w-full"
                  value={receiptData.paymentMethod}
                  onChange={handleInputChange}
                >
                  <option value="Cash">Cash</option>
                  <option value="Check">Check</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Store Credit">Store Credit</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  className="form-textarea w-full h-24"
                  placeholder="Add any additional notes for this receipt"
                  value={receiptData.notes}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Preview */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Receipt Preview</h2>
        </div>
        <div className="p-6">
          <div 
            ref={receiptRef} 
            className="bg-white p-8 max-w-4xl mx-auto border border-gray-200 shadow-sm"
            style={{ minHeight: '842px', width: '100%' }} // A4 size ratio
          >
            {/* Receipt Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                {company?.logo_url ? (
                  <img 
                    src={company.logo_url} 
                    alt={company?.name || 'Company Logo'} 
                    className="h-16 object-contain"
                  />
                ) : (
                  <h1 className="text-2xl font-bold text-gray-900">{company?.name || 'Your Company'}</h1>
                )}
                <div className="mt-2 text-sm text-gray-600">
                  {company?.address && <p>{company.address}</p>}
                  {(company?.city || company?.state || company?.zip) && (
                    <p>
                      {company.city}{company.city && company.state ? ', ' : ''}
                      {company.state} {company.zip}
                    </p>
                  )}
                  {company?.phone && <p>Phone: {company.phone}</p>}
                  {company?.email && <p>Email: {company.email}</p>}
                  {company?.website && <p>Website: {company.website}</p>}
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold text-gray-900">BUYBACK RECEIPT</h2>
                <p className="text-sm text-gray-600 mt-1">Receipt #: {receiptData.receiptNumber}</p>
                <p className="text-sm text-gray-600">Date: {formatDate(receiptData.receiptDate)}</p>
                <p className="text-sm text-gray-600">Ticket #: {ticket.ticket_number}</p>
              </div>
            </div>

            {/* Customer Information */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold border-b border-gray-300 pb-2 mb-3">Customer Information</h3>
              <div className="text-sm">
                <p className="font-medium">{ticket.customer.first_name} {ticket.customer.last_name}</p>
                {ticket.customer.email && <p>{ticket.customer.email}</p>}
                {ticket.customer.phone && <p>{ticket.customer.phone}</p>}
                {ticket.customer.address && (
                  <div className="mt-1">
                    <p>{ticket.customer.address}</p>
                    <p>
                      {ticket.customer.city}{ticket.customer.city && ticket.customer.state ? ', ' : ''}
                      {ticket.customer.state} {ticket.customer.zip}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Device Information */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold border-b border-gray-300 pb-2 mb-3">Device Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Device Type:</p>
                  <p>{ticket.device_type}</p>
                </div>
                <div>
                  <p className="font-medium">Device Model:</p>
                  <p>{ticket.device_model}</p>
                </div>
                <div>
                  <p className="font-medium">Condition:</p>
                  <p className="capitalize">{ticket.device_condition}</p>
                </div>
              </div>
              {ticket.device_description && (
                <div className="mt-4 text-sm">
                  <p className="font-medium">Description:</p>
                  <p className="whitespace-pre-line">{ticket.device_description}</p>
                </div>
              )}
            </div>

            {/* Payment Information */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold border-b border-gray-300 pb-2 mb-3">Payment Information</h3>
              <div className="flex justify-between items-center text-sm">
                <div>
                  <p className="font-medium">Payment Method:</p>
                  <p>{receiptData.paymentMethod}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">Amount Paid:</p>
                  <p className="text-xl font-bold">{formatCurrency(ticket.offered_amount)}</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {receiptData.notes && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold border-b border-gray-300 pb-2 mb-3">Notes</h3>
                <p className="text-sm whitespace-pre-line">{receiptData.notes}</p>
              </div>
            )}

            {/* Terms and Signature */}
            <div className="mt-auto">
              <div className="border-t border-gray-300 pt-4 mt-8 text-sm text-gray-600">
                <p className="font-medium">Terms and Conditions:</p>
                <p>By accepting payment, the customer acknowledges that they are the legal owner of the device and have the right to sell it. The customer also acknowledges that all personal data has been removed from the device and that the device cannot be returned once payment has been issued.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-8 mt-8">
                <div>
                  <p className="text-sm font-medium mb-8">Customer Signature:</p>
                  <div className="border-t border-gray-400 pt-1">
                    <p className="text-xs text-gray-500">Signature</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-8">Representative Signature:</p>
                  <div className="border-t border-gray-400 pt-1">
                    <p className="text-xs text-gray-500">Signature</p>
                  </div>
                </div>
              </div>
              
              <div className="text-center mt-8 text-xs text-gray-500">
                <p>Thank you for your business!</p>
                {company?.name && <p>{company.name}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}