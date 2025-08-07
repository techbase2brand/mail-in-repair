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
  XIcon
} from '@/components/icons';
import { useReactToPrint } from 'react-to-print';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { sendEmail, generateNotificationEmail } from '@/utils/email';

type RepairTicket = {
  id: string;
  ticket_number: string;
  status: string;
  device_type: string;
  device_model: string;
  serial_number: string;
  issue_description: string;
  diagnosis: string;
  estimated_cost: number | null;
  actual_cost: number | null;
  created_at: string;
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
  } | null;
};

type Company = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string | null;
};

export default function RepairInvoicePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { supabase } = useSupabase();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [ticket, setTicket] = useState<RepairTicket | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: '',
    invoiceDate: '',
    dueDate: '',
    tax: 0,
    taxRate: 0,
    shipping: 0,
    discount: 0,
    notes: '',
    paymentTerms: 'Due on receipt',
  });

  useEffect(() => {
    fetchData();
  }, [params.id]);

  useEffect(() => {
    if (ticket) {
      // Generate invoice number based on ticket number
      const invoiceNum = `INV-${ticket.ticket_number.split('-')[1]}`;
      
      // Set current date as invoice date
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      
      // Set due date as 15 days from now
      const dueDate = new Date();
      dueDate.setDate(today.getDate() + 15);
      const formattedDueDate = dueDate.toISOString().split('T')[0];
      
      setInvoiceData(prev => ({
        ...prev,
        invoiceNumber: invoiceNum,
        invoiceDate: formattedDate,
        dueDate: formattedDueDate,
        taxRate: 8.25, // Default tax rate
      }));
    }
  }, [ticket]);

  // Calculate tax whenever taxRate or actual_cost changes
  useEffect(() => {
    if (ticket && ticket.actual_cost !== null) {
      const taxAmount = (ticket.actual_cost * invoiceData.taxRate) / 100;
      setInvoiceData(prev => ({ ...prev, tax: parseFloat(taxAmount.toFixed(2)) }));
    }
  }, [ticket?.actual_cost, invoiceData.taxRate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch repair ticket with customer
      // Try to determine if the ID is a UUID or a ticket number
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);
      
      let query = supabase
        .from('repair_tickets')
        .select(`
          *,
          customer:customer_id(*)
        `);
        
      // Query by UUID or ticket number based on the format
      if (isUuid) {
        query = query.eq('id', params.id);
      } else {
        query = query.eq('ticket_number', params.id);
      }
      
      const { data: ticketData, error: ticketError } = await query.single();
      
      if (ticketError) throw ticketError;
      setTicket(ticketData as unknown as RepairTicket);
      
      // Fetch company info (assuming there's only one company in the system)
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .limit(1)
        .single();
      
      if (companyError) throw companyError;
      setCompany(companyData);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load invoice data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setInvoiceData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = value === '' ? 0 : parseFloat(value);
    setInvoiceData(prev => ({ ...prev, [name]: numValue }));
  };

  const handlePrint = useReactToPrint({
    // @ts-ignore - Type definitions for react-to-print are not available
    content: () => invoiceRef.current,
    documentTitle: `Invoice-${invoiceData.invoiceNumber}`,
    onAfterPrint: () => toast.success('Invoice printed successfully'),
  });

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    
    try {
      toast.loading('Generating PDF...');
      
      const canvas = await html2canvas(invoiceRef.current, {
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
      pdf.save(`Invoice-${invoiceData.invoiceNumber}.pdf`);
      
      toast.dismiss();
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.dismiss();
      toast.error('Failed to generate PDF');
    }
  };

  const handleSendEmail = async () => {
    if (!ticket || !ticket.customer || !ticket.customer.email) {
      toast.error('Customer email not available');
      return;
    }
    
    try {
      toast.loading('Sending invoice...');
      
      // Get company information
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', company.id)
        .single();
      
      if (companyError) throw companyError;
      
      // Generate email content
      const emailContent = generateNotificationEmail({
        companyName: company.name,
        companyLogo: company.logo_url || undefined,
        customerName: `${ticket.customer.first_name} ${ticket.customer.last_name}`,
        ticketNumber: ticket.ticket_number,
        deviceInfo: `${ticket.device_type} ${ticket.device_model}`,
        status: 'Invoice',
        message: `Your invoice for repair service is now available. Total amount: ${formatCurrency(calculateTotal())}.`,
        actionUrl: `${window.location.origin}/dashboard/repair/${ticket.id}/invoice`,
        actionText: 'View Invoice'
      });
      
      // Send the email
      const result = await sendEmail({
        to: ticket.customer.email,
        subject: `Invoice for Repair Service - ${ticket.ticket_number}`,
        html: emailContent,
        ticketId: ticket.id,
        ticketType: 'repair'
      });
      
      if (result.success) {
        // Add a system message about the email notification
        await supabase
          .from('repair_conversations')
          .insert({
            repair_ticket_id: ticket.id,
            sender_type: 'system',
            content: `Invoice sent to ${ticket.customer.email}`,
            message_type: 'email_notification'
          });
        
        toast.dismiss();
        toast.success(`Invoice sent to ${ticket.customer.email}`);
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending invoice email:', error);
      toast.dismiss();
      toast.error('Failed to send invoice email');
    }
  };

  const formatCurrency = (amount: number | null) => {
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

  const calculateSubtotal = () => {
    if (!ticket || ticket.actual_cost === null) return 0;
    return ticket.actual_cost;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal + invoiceData.tax + invoiceData.shipping - invoiceData.discount;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!ticket || !company) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          <h3 className="text-lg font-medium">Invoice data not available</h3>
          <p className="mt-2">Unable to load the necessary data to generate this invoice.</p>
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
          <Link href={`/dashboard/repair/${ticket.id}`} className="mr-4">
            <ArrowLeftIcon className="h-6 w-6 text-gray-500 hover:text-gray-700" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Invoice: {invoiceData.invoiceNumber}
          </h1>
        </div>
        <div className="flex space-x-2">
          {editMode ? (
            <>
              <button
                type="button"
                className="btn-outline"
                onClick={() => setEditMode(false)}
              >
                <XIcon className="mr-2" /> Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setEditMode(false)}
              >
                <SaveIcon className="mr-2" /> Save
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn-outline"
                onClick={() => setEditMode(true)}
              >
                <Edit2Icon className="mr-2" /> Edit
              </button>
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
              <button
                type="button"
                className="btn-primary"
                onClick={handleSendEmail}
                disabled={!ticket.customer?.email}
              >
                <MailIcon className="mr-2" /> Email Invoice
              </button>
            </>
          )}
        </div>
      </div>

      {/* Invoice Preview */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div ref={invoiceRef} className="p-8 max-w-4xl mx-auto">
          {/* Invoice Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              {company.logo_url ? (
                <img 
                  src={company.logo_url} 
                  alt={company.name} 
                  className="h-16 object-contain"
                />
              ) : (
                <h2 className="text-2xl font-bold text-gray-900">{company.name}</h2>
              )}
              <div className="mt-2 text-sm text-gray-500">
                <p>{company.address}</p>
                <p>{company.city}, {company.state} {company.zip_code}</p>
                <p>{company.phone}</p>
                <p>{company.email}</p>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-bold text-gray-900 uppercase">Invoice</h1>
              {editMode ? (
                <div className="mt-2 space-y-1 text-sm">
                  <div>
                    <label className="block text-xs text-gray-500">Invoice Number</label>
                    <input
                      type="text"
                      name="invoiceNumber"
                      className="form-input mt-1 w-full text-right"
                      value={invoiceData.invoiceNumber}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Invoice Date</label>
                    <input
                      type="date"
                      name="invoiceDate"
                      className="form-input mt-1 w-full text-right"
                      value={invoiceData.invoiceDate}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Due Date</label>
                    <input
                      type="date"
                      name="dueDate"
                      className="form-input mt-1 w-full text-right"
                      value={invoiceData.dueDate}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-2 space-y-1 text-sm">
                  <p>
                    <span className="text-gray-500">Invoice Number: </span>
                    <span className="font-medium">{invoiceData.invoiceNumber}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">Date: </span>
                    <span className="font-medium">{formatDate(invoiceData.invoiceDate)}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">Due Date: </span>
                    <span className="font-medium">{formatDate(invoiceData.dueDate)}</span>
                  </p>
                  <p>
                    <span className="text-gray-500">Repair Ticket: </span>
                    <span className="font-medium">{ticket.ticket_number}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-8">
            <h3 className="text-gray-500 font-medium mb-2">Bill To:</h3>
            {ticket.customer ? (
              <div className="text-sm">
                <p className="font-medium">{ticket.customer.first_name} {ticket.customer.last_name}</p>
                <p>{ticket.customer.address}</p>
                <p>{ticket.customer.city}, {ticket.customer.state} {ticket.customer.zip_code}</p>
                <p>{ticket.customer.email}</p>
                <p>{ticket.customer.phone}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Customer information not available</p>
            )}
          </div>

          {/* Device Info */}
          <div className="mb-8">
            <h3 className="text-gray-500 font-medium mb-2">Device Information:</h3>
            <div className="text-sm">
              <p>
                <span className="font-medium">Device: </span>
                {ticket.device_type} - {ticket.device_model}
              </p>
              {ticket.serial_number && (
                <p>
                  <span className="font-medium">Serial Number: </span>
                  {ticket.serial_number}
                </p>
              )}
            </div>
          </div>

          {/* Invoice Items */}
          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 text-left text-sm font-medium text-gray-500">Description</th>
                  <th className="py-2 text-right text-sm font-medium text-gray-500">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-4 text-sm">
                    <div className="font-medium">Repair Service</div>
                    <div className="text-gray-500 mt-1">{ticket.issue_description}</div>
                    {ticket.diagnosis && (
                      <div className="text-gray-500 mt-1">
                        <span className="font-medium">Diagnosis: </span>
                        {ticket.diagnosis}
                      </div>
                    )}
                  </td>
                  <td className="py-4 text-sm text-right font-medium">
                    {formatCurrency(ticket.actual_cost)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Invoice Summary */}
          <div className="mb-8">
            <div className="w-full md:w-1/2 ml-auto">
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                </div>
                {editMode ? (
                  <>
                    <div className="flex justify-between py-1 text-sm">
                      <span className="text-gray-500 flex items-center">
                        Tax Rate (%)
                      </span>
                      <input
                        type="number"
                        name="taxRate"
                        className="form-input w-24 text-right"
                        value={invoiceData.taxRate}
                        onChange={handleNumberInputChange}
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div className="flex justify-between py-1 text-sm">
                      <span className="text-gray-500">Tax</span>
                      <span className="font-medium">{formatCurrency(invoiceData.tax)}</span>
                    </div>
                    <div className="flex justify-between py-1 text-sm">
                      <span className="text-gray-500">Shipping</span>
                      <input
                        type="number"
                        name="shipping"
                        className="form-input w-24 text-right"
                        value={invoiceData.shipping}
                        onChange={handleNumberInputChange}
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div className="flex justify-between py-1 text-sm">
                      <span className="text-gray-500">Discount</span>
                      <input
                        type="number"
                        name="discount"
                        className="form-input w-24 text-right"
                        value={invoiceData.discount}
                        onChange={handleNumberInputChange}
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between py-1 text-sm">
                      <span className="text-gray-500">Tax ({invoiceData.taxRate}%)</span>
                      <span className="font-medium">{formatCurrency(invoiceData.tax)}</span>
                    </div>
                    {invoiceData.shipping > 0 && (
                      <div className="flex justify-between py-1 text-sm">
                        <span className="text-gray-500">Shipping</span>
                        <span className="font-medium">{formatCurrency(invoiceData.shipping)}</span>
                      </div>
                    )}
                    {invoiceData.discount > 0 && (
                      <div className="flex justify-between py-1 text-sm">
                        <span className="text-gray-500">Discount</span>
                        <span className="font-medium">-{formatCurrency(invoiceData.discount)}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between py-2 text-lg font-bold border-t border-gray-200 mt-2">
                  <span>Total</span>
                  <span>{formatCurrency(calculateTotal())}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Terms & Notes */}
          <div className="border-t border-gray-200 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-gray-500 font-medium mb-2">Payment Terms</h3>
                {editMode ? (
                  <textarea
                    name="paymentTerms"
                    className="form-textarea w-full text-sm"
                    rows={2}
                    value={invoiceData.paymentTerms}
                    onChange={handleInputChange}
                  ></textarea>
                ) : (
                  <p className="text-sm">{invoiceData.paymentTerms}</p>
                )}
              </div>
              <div>
                <h3 className="text-gray-500 font-medium mb-2">Notes</h3>
                {editMode ? (
                  <textarea
                    name="notes"
                    className="form-textarea w-full text-sm"
                    rows={2}
                    value={invoiceData.notes}
                    onChange={handleInputChange}
                    placeholder="Add any additional notes here"
                  ></textarea>
                ) : (
                  <p className="text-sm">{invoiceData.notes || 'Thank you for your business!'}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}