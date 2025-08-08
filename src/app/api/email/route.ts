import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { supabase } from '@/lib/supabase';

// Create a reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASSWORD || '',
  },
});

export async function POST(request: Request) {
  try {
    // Verify authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { to, subject, html, text, attachments, ticketId, ticketType } = body;

    // Validate required fields
    if (!to || !subject || (!html && !text)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get company information for the sender
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('name, email, logo_url')
      .eq('user_id', session.user.id)
      .single();

    if (companyError) {
      console.error('Error fetching company data:', companyError);
      return NextResponse.json(
        { error: 'Failed to fetch company data' },
        { status: 500 }
      );
    }

    // Set up email data
    const mailOptions = {
      from: `"${companyData.name}" <${process.env.EMAIL_FROM || companyData.email || process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
      attachments,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    // Log email activity if ticketId is provided
    if (ticketId && ticketType) {
      let tableName = '';
      
      // Determine which table to use based on ticket type
      switch (ticketType) {
        case 'refurbishing':
          tableName = 'refurbishing_conversations';
          break;
        case 'repair':
          tableName = 'repair_conversations';
          break;
        case 'buyback':
          tableName = 'buyback_conversations';
          break;
        default:
          break;
      }
      
      if (tableName) {
        await supabase
          .from(tableName)
          .insert({
            ticket_id: ticketId,
            message: `Email sent: ${subject}`,
            sender_type: 'system',
            sender_id: session.user.id,
            message_type: 'email_notification'
          });
      }
    }

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: (error as Error).message },
      { status: 500 }
    );
  }
}