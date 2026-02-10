import { NextRequest, NextResponse } from 'next/server';
import { sendProposalEmail } from '@/lib/mailer';
import { AuditResult } from '@/lib/gemini';

interface RequestBody {
  email: string;
  businessName: string;
  websiteUrl: string;
  auditResult: AuditResult;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { email, businessName, websiteUrl, auditResult } = body;

    if (!email || !auditResult) {
      return NextResponse.json(
        { success: false, error: 'Email and audit result are required' },
        { status: 400 }
      );
    }

    const result = await sendProposalEmail({
      email,
      businessName: businessName || 'Business Owner',
      websiteUrl,
      auditResult,
      portfolioUrl: process.env.DEFAULT_PORTFOLIO_URL || 'https://yourportfolio.com',
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Proposal sent successfully!' });
  } catch (error) {
    console.error('Send Proposal Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
