const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || '';
const FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev/v1';

const EMAIL_REGEX = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g;

// Common spam/generic emails to filter out
const SPAM_EMAIL_PATTERNS = [
  /noreply@/i,
  /no-reply@/i,
  /donotreply@/i,
  /support@/i,
  /example\./i,
  /test@/i,
  /admin@/i,
  /webmaster@/i,
  /@sentry\./i,
  /@wixpress\./i,
  /@wordpress\./i,
];

function filterEmails(emails: string[]): string[] {
  const unique = [...new Set(emails.map(e => e.toLowerCase()))];
  return unique.filter(email => {
    return !SPAM_EMAIL_PATTERNS.some(pattern => pattern.test(email));
  });
}

interface MapResponse {
  success: boolean;
  links?: string[];
  error?: string;
}

interface ScrapeResponse {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    links?: string[];
  };
  error?: string;
}

/**
 * Map a website to find relevant pages (contact, about, team, etc.)
 */
async function mapWebsite(url: string, onLog?: (msg: string) => void): Promise<string[]> {
  if (!FIRECRAWL_API_KEY) {
    const msg = '[Firecrawl] No API key configured, skipping';
    console.log(msg);
    onLog?.(msg);
    return [];
  }

  try {
    const msg1 = `[Firecrawl] Mapping website: ${url}`;
    console.log(msg1);
    onLog?.(msg1);

    const response = await fetch(`${FIRECRAWL_BASE_URL}/map`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        search: 'contact about team',
        limit: 10,
      }),
    });

    const data: MapResponse = await response.json();

    if (!data.success || !data.links) {
      const msg = `[Firecrawl] Map failed: ${data.error}`;
      console.log(msg);
      onLog?.(msg);
      return [];
    }

    const msg2 = `[Firecrawl] Found ${data.links.length} relevant pages`;
    console.log(msg2);
    onLog?.(msg2);
    return data.links.slice(0, 5); // Limit to 5 pages to avoid rate limits
  } catch (error) {
    console.error('[Firecrawl] Map error:', error);
    onLog?.(`[Firecrawl] Map error: ${error}`);
    return [];
  }
}

/**
 * Scrape a single URL and extract emails + markdown content
 */
async function scrapeUrl(url: string): Promise<{ emails: string[]; markdown: string }> {
  try {
    const response = await fetch(`${FIRECRAWL_BASE_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
      }),
    });

    const data: ScrapeResponse = await response.json();

    if (!data.success || !data.data?.markdown) {
      return { emails: [], markdown: '' };
    }

    const markdown = data.data.markdown;

    // Extract emails from markdown content
    const foundEmails: string[] = markdown.match(EMAIL_REGEX) || [];

    // Also check for obfuscated emails like "email (at) domain (dot) com"
    const obfuscatedPattern = /([a-zA-Z0-9._-]+)\s*[\(\[]?\s*at\s*[\)\]]?\s*([a-zA-Z0-9.-]+)\s*[\(\[]?\s*dot\s*[\)\]]?\s*([a-zA-Z]{2,6})/gi;
    let match;
    while ((match = obfuscatedPattern.exec(markdown)) !== null) {
      foundEmails.push(`${match[1]}@${match[2]}.${match[3]}`);
    }

    return { emails: foundEmails, markdown };
  } catch (error) {
    console.error(`[Firecrawl] Scrape error for ${url}:`, error);
    return { emails: [], markdown: '' };
  }
}

const SITE_CONTENT_CAP = 30000;

/**
 * Crawl a website to find emails AND collect rich site content (markdown)
 * 1. Maps the site to find relevant pages
 * 2. Scrapes those pages for emails + markdown
 * Returns both deduplicated emails and concatenated site content
 */
export async function crawlSiteData(baseUrl: string, onLog?: (msg: string) => void): Promise<{ emails: string[]; siteContent: string }> {
  if (!FIRECRAWL_API_KEY) {
    return { emails: [], siteContent: '' };
  }

  try {
    // Step 1: Map the website to find relevant pages
    const relevantPages = await mapWebsite(baseUrl, onLog);

    const pagesToScrape = relevantPages.length > 0 ? relevantPages : [baseUrl];

    // Step 2: Scrape each page for emails + markdown (in parallel)
    const msg1 = `[Firecrawl] Scraping ${pagesToScrape.length} pages for emails & content...`;
    console.log(msg1);
    onLog?.(msg1);

    const results = await Promise.all(pagesToScrape.map(url => scrapeUrl(url)));

    // Collect emails and markdown
    const allEmails = results.flatMap(r => r.emails);
    const filteredEmails = filterEmails(allEmails);

    const siteContent = results
      .map(r => r.markdown)
      .filter(Boolean)
      .join('\n\n---\n\n')
      .slice(0, SITE_CONTENT_CAP);

    const msg2 = `[Firecrawl] Found ${filteredEmails.length} unique emails, ${siteContent.length} chars of site content`;
    console.log(msg2);
    onLog?.(msg2);
    return { emails: filteredEmails, siteContent };
  } catch (error) {
    console.error('[Firecrawl] Crawl error:', error);
    onLog?.(`[Firecrawl] Crawl error: ${error}`);
    return { emails: [], siteContent: '' };
  }
}

/**
 * Crawl a website to find hidden emails (legacy wrapper)
 */
export async function crawlForEmails(baseUrl: string): Promise<string[]> {
  const { emails } = await crawlSiteData(baseUrl);
  return emails;
}
