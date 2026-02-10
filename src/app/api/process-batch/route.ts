import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { captureWebsite } from '@/lib/playwright';
import { analyzeWebsite } from '@/lib/gemini';
import { sendProposalEmail } from '@/lib/mailer';
import pLimit from 'p-limit';

// Limit to 2 concurrent browser instances
const limit = pLimit(2);

interface ProcessResult {
  leadId: string;
  businessName: string;
  status: 'EMAILED' | 'SKIPPED' | 'FAILED';
  score?: number;
  message: string;
}

async function processLead(
  lead: { id: string; businessName: string; websiteUrl: string },
  portfolioUrl: string
): Promise<ProcessResult> {
  try {
    // Update status to SCRAPING
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: 'SCRAPING' },
    });

    // Capture website screenshot and content
    const capture = await captureWebsite(lead.websiteUrl);

    // Update status to ANALYZING
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: 'ANALYZING' },
    });

    // Analyze with Gemini
    const auditResult = await analyzeWebsite(
      capture.screenshotBase64,
      capture.textContent
    );

    // Check if we should send email (score < 7 and has email)
    const primaryEmail = capture.emails[0];
    
    if (auditResult.score >= 7) {
      // Website is good enough, skip
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: 'SKIPPED',
          auditScore: auditResult.score,
          auditSummary: JSON.stringify(auditResult),
          email: primaryEmail,
        },
      });

      return {
        leadId: lead.id,
        businessName: lead.businessName,
        status: 'SKIPPED',
        score: auditResult.score,
        message: `Score ${auditResult.score}/10 - Website looks good, skipped`,
      };
    }

    if (!primaryEmail) {
      // No email found, skip
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: 'SKIPPED',
          auditScore: auditResult.score,
          auditSummary: JSON.stringify(auditResult),
        },
      });

      return {
        leadId: lead.id,
        businessName: lead.businessName,
        status: 'SKIPPED',
        score: auditResult.score,
        message: `Score ${auditResult.score}/10 - No contact email found`,
      };
    }

    // Send email
    const emailResult = await sendProposalEmail({
      businessName: lead.businessName,
      email: primaryEmail,
      websiteUrl: lead.websiteUrl,
      auditResult,
      portfolioUrl,
    });

    if (!emailResult.success) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: 'FAILED',
          auditScore: auditResult.score,
          auditSummary: JSON.stringify(auditResult),
          email: primaryEmail,
          errorLog: emailResult.error,
        },
      });

      return {
        leadId: lead.id,
        businessName: lead.businessName,
        status: 'FAILED',
        score: auditResult.score,
        message: `Email failed: ${emailResult.error}`,
      };
    }

    // Success!
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: 'EMAILED',
        auditScore: auditResult.score,
        auditSummary: JSON.stringify(auditResult),
        email: primaryEmail,
        sentAt: new Date(),
      },
    });

    return {
      leadId: lead.id,
      businessName: lead.businessName,
      status: 'EMAILED',
      score: auditResult.score,
      message: `Score ${auditResult.score}/10 - Sent to ${primaryEmail}`,
    };
  } catch (error) {
    console.error(`Error processing lead ${lead.id}:`, error);
    
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: 'FAILED',
        errorLog: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return {
      leadId: lead.id,
      businessName: lead.businessName,
      status: 'FAILED',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// POST /api/process-batch - Process a batch of leads
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, portfolioUrl, batchSize = 5 } = body;

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    const portfolio = portfolioUrl || process.env.DEFAULT_PORTFOLIO_URL || 'https://yourportfolio.com';

    // Fetch the next batch of DISCOVERED leads
    const leads = await prisma.lead.findMany({
      where: {
        campaignId,
        status: 'DISCOVERED',
      },
      take: batchSize,
      select: {
        id: true,
        businessName: true,
        websiteUrl: true,
      },
    });

    if (leads.length === 0) {
      // No more leads to process
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'COMPLETED' },
      });

      return NextResponse.json({
        completed: true,
        results: [],
        message: 'All leads have been processed',
      });
    }

    // Process leads with concurrency limit
    const results = await Promise.all(
      leads.map(lead => limit(() => processLead(lead, portfolio)))
    );

    // Check remaining leads
    const remaining = await prisma.lead.count({
      where: {
        campaignId,
        status: 'DISCOVERED',
      },
    });

    return NextResponse.json({
      completed: remaining === 0,
      remaining,
      results,
      message: `Processed ${results.length} leads, ${remaining} remaining`,
    });
  } catch (error) {
    console.error('Error processing batch:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process batch' },
      { status: 500 }
    );
  }
}
