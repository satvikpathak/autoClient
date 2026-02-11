import { chromium, Browser, Page } from 'playwright';

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browser;
}

export interface WebsiteCapture {
  screenshot: Buffer;
  screenshotBase64: string;
  textContent: string;
  emails: string[];
  title: string;
}

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

export async function captureWebsite(url: string): Promise<WebsiteCapture> {
  const browserInstance = await getBrowser();
  const context = await browserInstance.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  
  const page: Page = await context.newPage();
  
  try {
    // Navigate - use domcontentloaded then wait briefly for rendering
    // (networkidle hangs on sites with analytics/ads/websockets)
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Give the page time to render lazy-loaded content
    await page.waitForTimeout(3000);

    // Take screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false,
    });

    // Get page title
    const title = await page.title();

    // Extract text content
    const textContent = await page.evaluate(() => {
      // Remove scripts and styles
      const scripts = document.querySelectorAll('script, style, noscript');
      scripts.forEach(el => el.remove());
      return document.body?.innerText || '';
    });

    // Try to find contact page for more emails
    let allText = textContent;
    const contactLink = await page.$('a[href*="contact"], a[href*="about"], a:has-text("Contact")');
    if (contactLink) {
      try {
        await contactLink.click();
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
        const contactText = await page.evaluate(() => document.body?.innerText || '');
        allText += ' ' + contactText;
      } catch {
        // Ignore contact page errors
      }
    }

    // Extract emails from all text
    const foundEmails = allText.match(EMAIL_REGEX) || [];
    const emails = filterEmails(foundEmails);

    return {
      screenshot,
      screenshotBase64: screenshot.toString('base64'),
      textContent: textContent.slice(0, 15000), // Limit text length
      emails,
      title,
    };
  } finally {
    await context.close();
  }
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
