import axios from 'axios';

type EmailAttachment = {
  filename: string;
  content?: string;
  path?: string;
  contentType?: string;
  cid?: string;
};

type SendEmailParams = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  ticketId?: string;
  ticketType?: 'refurbishing' | 'repair' | 'buyback';
};

/**
 * Sends an email using the application's email API
 */
export const sendEmail = async (params: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const response = await axios.post('/api/email', params);
    return response.data;
  } catch (error) {
    console.error('Error sending email:', error);
    if (axios.isAxiosError(error) && error.response) {
      return { 
        success: false, 
        error: error.response.data.error || 'Failed to send email' 
      };
    }
    return { 
      success: false, 
      error: 'Failed to send email' 
    };
  }
};

/**
 * Generates HTML content for a notification email
 */
export const generateNotificationEmail = ({
  companyName,
  companyLogo,
  customerName,
  ticketNumber,
  deviceInfo,
  status,
  message,
  actionUrl,
  actionText = 'View Details',
}: {
  companyName: string;
  companyLogo?: string;
  customerName: string;
  ticketNumber: string;
  deviceInfo: string;
  status: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
}): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${companyName} - Notification</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        .logo {
          max-height: 60px;
          max-width: 200px;
        }
        .content {
          background-color: #f9f9f9;
          padding: 20px;
          border-radius: 5px;
        }
        .ticket-info {
          margin: 20px 0;
          padding: 15px;
          background-color: #fff;
          border-radius: 5px;
          border-left: 4px solid #4f46e5;
        }
        .status {
          display: inline-block;
          padding: 5px 10px;
          border-radius: 3px;
          font-size: 14px;
          font-weight: bold;
          background-color: #e5e7eb;
          color: #374151;
        }
        .status.pending { background-color: #fef3c7; color: #92400e; }
        .status.in-progress { background-color: #dbeafe; color: #1e40af; }
        .status.completed { background-color: #d1fae5; color: #065f46; }
        .status.approved { background-color: #d1fae5; color: #065f46; }
        .status.rejected { background-color: #fee2e2; color: #b91c1c; }
        .button {
          display: inline-block;
          padding: 10px 20px;
          margin-top: 20px;
          background-color: #4f46e5;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
        }
        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${companyLogo ? `<img src="${companyLogo}" alt="${companyName}" class="logo">` : `<h2>${companyName}</h2>`}
        </div>
        
        <div class="content">
          <p>Hello ${customerName},</p>
          
          <p>${message}</p>
          
          <div class="ticket-info">
            <p><strong>Ticket:</strong> ${ticketNumber}</p>
            <p><strong>Device:</strong> ${deviceInfo}</p>
            <p><strong>Status:</strong> <span class="status ${status.toLowerCase().replace(' ', '-')}">${status}</span></p>
          </div>
          
          ${actionUrl ? `<a href="${actionUrl}" class="button">${actionText}</a>` : ''}
          
          <p>If you have any questions, please contact us.</p>
          
          <p>Thank you,<br>${companyName} Team</p>
        </div>
        
        <div class="footer">
          <p>This is an automated message, please do not reply directly to this email.</p>
          <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};