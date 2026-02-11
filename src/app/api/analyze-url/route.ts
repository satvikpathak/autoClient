import { NextRequest, NextResponse } from 'next/server';
import { captureWebsite } from '@/lib/playwright';
import { analyzeWebsite, AuditResult } from '@/lib/gemini';
import { crawlSiteData } from '@/lib/firecrawl';

export interface AnalyzeUrlResponse {
  success: boolean;
  url: string;
  title?: string;
  emails?: string[];
  screenshotBase64?: string;
  audit?: AuditResult;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    let validUrl: string;
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      validUrl = parsed.href;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    console.log(`[Analyze] Starting parallel analysis: ${validUrl}`);

    // Run Playwright capture and Firecrawl in PARALLEL
    const [capture, { emails: firecrawlEmails, siteContent }] = await Promise.all([
      captureWebsite(validUrl),
      crawlSiteData(validUrl),
    ]);

    console.log(`[Analyze] Playwright found ${capture.emails.length} emails`);
    console.log(`[Analyze] Firecrawl found ${firecrawlEmails.length} emails, ${siteContent.length} chars of site content`);

    // Merge and dedupe emails from both sources
    const allEmails = [...new Set([...capture.emails, ...firecrawlEmails])];
    console.log(`[Analyze] Total unique emails: ${allEmails.length}`);

    console.log(`[Analyze] Analyzing with Gemini AI...`);

    // Analyze with Gemini (screenshot + text + firecrawl site markdown)
    const audit = await analyzeWebsite(capture.screenshotBase64, capture.textContent, siteContent);

    console.log(`[Analyze] Complete! Score: ${audit.score}/10`);

    const response: AnalyzeUrlResponse = {
      success: true,
      url: validUrl,
      title: capture.title,
      emails: allEmails,
      screenshotBase64: capture.screenshotBase64,
      audit,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Analyze] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze website',
      },
      { status: 500 }
    );
  }
}
