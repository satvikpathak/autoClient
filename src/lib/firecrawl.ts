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
async function mapWebsite(url: string): Promise<string[]> {
  if (!FIRECRAWL_API_KEY) {
    console.log('[Firecrawl] No API key configured, skipping');
    return [];
  }

  try {
    console.log(`[Firecrawl] Mapping website: ${url}`);
    
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
      console.log('[Firecrawl] Map failed:', data.error);
      return [];
    }

    console.log(`[Firecrawl] Found ${data.links.length} relevant pages`);
    return data.links.slice(0, 5); // Limit to 5 pages to avoid rate limits
  } catch (error) {
    console.error('[Firecrawl] Map error:', error);
    return [];
  }
}

/**
 * Scrape a single URL and extract emails
 */
async function scrapeUrl(url: string): Promise<string[]> {
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
      return [];
    }

    // Extract emails from markdown content
    const foundEmails: string[] = data.data.markdown.match(EMAIL_REGEX) || [];
    
    // Also check for obfuscated emails like "email (at) domain (dot) com"
    const obfuscatedPattern = /([a-zA-Z0-9._-]+)\s*[\(\[]?\s*at\s*[\)\]]?\s*([a-zA-Z0-9.-]+)\s*[\(\[]?\s*dot\s*[\)\]]?\s*([a-zA-Z]{2,6})/gi;
    let match;
    while ((match = obfuscatedPattern.exec(data.data.markdown)) !== null) {
      foundEmails.push(`${match[1]}@${match[2]}.${match[3]}`);
    }

    return foundEmails;
  } catch (error) {
    console.error(`[Firecrawl] Scrape error for ${url}:`, error);
    return [];
  }
}

/**
 * Crawl a website to find hidden emails
 * 1. Maps the site to find contact/about pages
 * 2. Scrapes those pages for emails
 */
export async function crawlForEmails(baseUrl: string): Promise<string[]> {
  if (!FIRECRAWL_API_KEY) {
    return [];
  }

  try {
    // Step 1: Map the website to find relevant pages
    const relevantPages = await mapWebsite(baseUrl);
    
    if (relevantPages.length === 0) {
      // If no pages found, try scraping the base URL directly
      const emails = await scrapeUrl(baseUrl);
      return filterEmails(emails);
    }

    // Step 2: Scrape each relevant page for emails (in parallel)
    console.log(`[Firecrawl] Scraping ${relevantPages.length} pages for emails...`);
    
    const emailPromises = relevantPages.map(url => scrapeUrl(url));
    const emailArrays = await Promise.all(emailPromises);
    
    // Flatten and filter
    const allEmails = emailArrays.flat();
    const filteredEmails = filterEmails(allEmails);
    
    console.log(`[Firecrawl] Found ${filteredEmails.length} unique emails`);
    return filteredEmails;
  } catch (error) {
    console.error('[Firecrawl] Crawl error:', error);
    return [];
  }
}
