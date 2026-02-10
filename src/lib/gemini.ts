import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface AuditResult {
  score: number;
  is_boring: boolean;
  flaws: string[];
  improvements: string[];
  hook: string;
}

const SYSTEM_PROMPT = `You are a ruthless but constructive UI/UX Auditor. Analyze this landing page screenshot and text.

Your Goal: Identify why this site is losing customers and propose a fix to sell a redesign service.

Be specific and actionable. Focus on:
- Visual design (colors, typography, spacing, imagery)
- User experience (navigation, CTAs, mobile responsiveness)
- Trust signals (testimonials, certifications, contact info)
- Performance indicators (load time, modern tech)
- Content quality (copywriting, value proposition)

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
  textContent: string
): Promise<AuditResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `${SYSTEM_PROMPT}

Website Text Content:
${textContent.slice(0, 8000)}

Analyze the screenshot and text above. Return ONLY the JSON object, no markdown or explanation.`;

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
