import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { captureWebsite } from '@/lib/playwright';
import { analyzeWebsite } from '@/lib/gemini';
import { crawlSiteData } from '@/lib/firecrawl';
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
  emit: (event: string, data: unknown) => void,
): Promise<ProcessResult> {
  try {
    // Update status to SCRAPING
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: 'SCRAPING' },
    });

    emit('log', { message: `[${lead.businessName}] Capturing screenshot...` });
    emit('log', { message: `[${lead.businessName}] Crawling for emails & content...` });

    // Capture website + crawl site data in PARALLEL
    // Use allSettled so a DNS/network error in Playwright doesn't orphan
    // the still-running Firecrawl call (which would emit logs after the stream closes)
    const [captureResult, crawlResult] = await Promise.allSettled([
      captureWebsite(lead.websiteUrl),
      crawlSiteData(lead.websiteUrl, (msg) => {
        emit('log', { message: `[${lead.businessName}] ${msg}` });
      }),
    ]);

    if (captureResult.status === 'rejected') {
      throw captureResult.reason;
    }

    const capture = captureResult.value;
    const { emails: firecrawlEmails, siteContent } = crawlResult.status === 'fulfilled'
      ? crawlResult.value
      : { emails: [], siteContent: '' };

    // Merge and dedupe emails from both Playwright and Firecrawl
    const allEmails = [...new Set([...capture.emails, ...firecrawlEmails])];

    emit('log', { message: `[${lead.businessName}] Found ${allEmails.length} emails` });

    // Update status to ANALYZING
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: 'ANALYZING' },
    });

    emit('log', { message: `[${lead.businessName}] Analyzing with Gemini...` });

    // Analyze with Gemini (screenshot + text + firecrawl site markdown)
    const auditResult = await analyzeWebsite(
      capture.screenshotBase64,
      capture.textContent,
      siteContent
    );

    // Check if we should send email (score < 7 and has email)
    const primaryEmail = allEmails[0];

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

      const result: ProcessResult = {
        leadId: lead.id,
        businessName: lead.businessName,
        status: 'SKIPPED',
        score: auditResult.score,
        message: `Score ${auditResult.score}/10 - Website looks good, skipped`,
      };
      emit('result', result);
      return result;
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

      const result: ProcessResult = {
        leadId: lead.id,
        businessName: lead.businessName,
        status: 'SKIPPED',
        score: auditResult.score,
        message: `Score ${auditResult.score}/10 - No contact email found`,
      };
      emit('result', result);
      return result;
    }

    // Send email
    emit('log', { message: `[${lead.businessName}] Sending email to ${primaryEmail}...` });

    const emailResult = await sendProposalEmail({
      businessName: lead.businessName,
      email: primaryEmail,
      websiteUrl: lead.websiteUrl,
      auditResult,
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

      const result: ProcessResult = {
        leadId: lead.id,
        businessName: lead.businessName,
        status: 'FAILED',
        score: auditResult.score,
        message: `Email failed: ${emailResult.error}`,
      };
      emit('result', result);
      return result;
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

    const result: ProcessResult = {
      leadId: lead.id,
      businessName: lead.businessName,
      status: 'EMAILED',
      score: auditResult.score,
      message: `Score ${auditResult.score}/10 - Sent to ${primaryEmail}`,
    };
    emit('result', result);
    return result;
  } catch (error) {
    console.error(`Error processing lead ${lead.id}:`, error);

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: 'FAILED',
        errorLog: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    const result: ProcessResult = {
      leadId: lead.id,
      businessName: lead.businessName,
      status: 'FAILED',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
    emit('result', result);
    return result;
  }
}

// POST /api/process-batch - Process a batch of leads (SSE stream)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { campaignId, batchSize = 5 } = body;

  if (!campaignId) {
    return new Response(
      JSON.stringify({ error: 'Campaign ID is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      function emit(event: string, data: unknown) {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      function close() {
        if (closed) return;
        closed = true;
        controller.close();
      }

      try {
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
          await prisma.campaign.update({
            where: { id: campaignId },
            data: { status: 'COMPLETED' },
          });

          emit('done', { completed: true, remaining: 0 });
          close();
          return;
        }

        emit('log', { message: `Processing batch of ${leads.length} leads...` });

        // Process leads with concurrency limit
        await Promise.all(
          leads.map((lead: { id: string; businessName: string; websiteUrl: string }) =>
            limit(() => processLead(lead, emit))
          )
        );

        // Check remaining leads
        const remaining = await prisma.lead.count({
          where: {
            campaignId,
            status: 'DISCOVERED',
          },
        });

        emit('done', { completed: remaining === 0, remaining });
        close();
      } catch (error) {
        console.error('Error processing batch:', error);
        emit('log', { message: `Error: ${error instanceof Error ? error.message : 'Failed to process batch'}` });
        emit('done', { completed: true, remaining: 0 });
        close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
