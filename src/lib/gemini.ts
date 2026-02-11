import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface AuditResult {
  score: number;
  is_boring: boolean;
  flaws: string[];
  improvements: string[];
  hook: string;
}

const SYSTEM_PROMPT = `You are a ruthless but constructive website auditor. Analyze this website using the screenshot, text content, and (when available) the structured site markdown data.

Your Goal: Identify why this site is losing customers and propose fixes to sell a redesign service.

Be specific, actionable, and reference concrete elements you observe. Cover ALL of the following areas:

**Visual Design**: Layout structure, color palette & contrast, typography choices, whitespace/spacing, imagery quality, responsive design signals, visual hierarchy, brand consistency.

**Functionality & UX**: Navigation clarity & depth, forms and input fields, CTAs (placement, copy, contrast), interactive elements, broken patterns, mobile-friendliness indicators, page structure from headings/links.

**Performance & Tech**: Tech stack signals (frameworks, libraries), modern vs outdated practices, render-blocking hints, image optimization, code quality signals.

**Content & SEO**: Copy quality & tone, value proposition clarity, SEO signals (heading structure, meta patterns, internal linking), trust signals (testimonials, certifications, social proof), contact accessibility.

**Accessibility**: Color contrast issues, heading hierarchy, alt text presence, keyboard navigation hints, ARIA patterns, readability.

Output ONLY valid JSON in this exact format:
{
  "score": <number 1-10, where 1 is terrible and 10 is excellent>,
  "is_boring": <boolean, true if design looks older than 2020 or uses templates>,
  "flaws": ["Specific flaw 1", "Specific flaw 2", "...up to 5 flaws"],
  "improvements": ["Specific tech/design fix 1", "Specific fix 2", "...up to 5 improvements"],
  "hook": "A 1-sentence opening for an email that mentions the most glaring flaw politely and professionally"
}`;

export async function analyzeWebsite(
  screenshotBase64: string,
  textContent: string,
  siteMarkdown?: string
): Promise<AuditResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  let prompt = `${SYSTEM_PROMPT}

Website Text Content:
${textContent.slice(0, 8000)}`;

  if (siteMarkdown) {
    prompt += `

--- Structured Site Data (scraped markdown with headings, links, layout) ---
${siteMarkdown.slice(0, 20000)}`;
  }

  prompt += `

Analyze the screenshot, text, and structured data above. Return ONLY the JSON object, no markdown or explanation.`;

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: 'image/png',
        data: screenshotBase64,
      },
    },
    { text: prompt },
  ]);

  const response = await result.response;
  const text = response.text();
  
  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }
  
  try {
    const parsed = JSON.parse(jsonStr.trim());
    return {
      score: Math.min(10, Math.max(1, parsed.score || 5)),
      is_boring: Boolean(parsed.is_boring),
      flaws: Array.isArray(parsed.flaws) ? parsed.flaws : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
      hook: parsed.hook || 'I noticed some opportunities to improve your website.',
    };
  } catch {
    console.error('Failed to parse Gemini response:', text);
    return {
      score: 5,
      is_boring: true,
      flaws: ['Could not analyze website'],
      improvements: ['Manual review recommended'],
      hook: 'I noticed some opportunities to improve your website.',
    };
  }
}
