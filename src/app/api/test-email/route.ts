import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const simpleTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    try {
      await simpleTransporter.verify();
    } catch (verifyError) {
      console.error('SMTP Verify Error:', verifyError);
      return NextResponse.json(
        {
          success: false,
          error: `SMTP Connection Failed: ${verifyError instanceof Error ? verifyError.message : 'Unknown error'}`,
          details: 'Check your SMTP_USER and SMTP_PASS in .env',
        },
        { status: 500 }
      );
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'AutoClient SMTP Test',
      text: 'If you are receiving this, your SMTP configuration is correct! 🚀',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4f46e5;">AutoClient SMTP Test</h2>
          <p>✅ Your email configuration is working correctly.</p>
          <p><strong>Authenticated User:</strong> ${process.env.SMTP_USER}</p>
          <p>This email was sent from your local AutoClient instance.</p>
        </div>
      `,
    };

    await simpleTransporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: 'Test email sent successfully!' });
  } catch (error) {
    console.error('Test Email Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send test email',
      },
      { status: 500 }
    );
  }
}
