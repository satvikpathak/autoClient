import nodemailer from 'nodemailer';
import path from 'path';
import type { AuditResult } from './gemini';

const WORK_PDF_PATH = path.join(process.cwd(), 'public', 'work', 'ether-inc work.pdf');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface EmailData {
  businessName: string;
  email: string;
  websiteUrl: string;
  auditResult: AuditResult;
}

function generateEmailHtml(data: EmailData): string {
  const { businessName, auditResult } = data;

  const improvementItems = auditResult.improvements
    .slice(0, 3)
    .map(imp => `<li style="margin-bottom:6px;">${imp}</li>`)
    .join('');

  return `<div style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#222;">
  <p>Hey there,</p>

  <p>We were browsing around and came across <b>${businessName}</b>'s website. ${auditResult.hook}</p>

  <p>We're <b>Satvik and Sanatan</b>, two <b>full-stack developers</b>. We build everything from websites and improvements to existing platforms to complete applications. We've been doing this for a while now and your business genuinely caught our eye.</p>

  <p>We spent a few minutes looking things over and spotted a couple of things that could help:</p>

  <ol style="padding-left:20px;">
    ${improvementItems}
  </ol>

  <p>Nothing major to overhaul - these are the kind of tweaks that tend to <b>make a real difference</b> in how visitors experience the site (and whether they stick around).</p>

  <p>We've attached a <b>PDF with some of our recent work</b> so you can get a feel for what we do. No pressure at all - just thought it might be useful context.</p>

  <p>We're big on <b>reasonable pricing</b>, <b>fast delivery</b>, and making sure you're <b>actually happy with the result</b> - that's kind of our whole thing.</p>

  <p>If any of this sounds interesting, we'd be happy to hop on a short call sometime. Totally casual, just to chat through some ideas.</p>

  <p>Either way, hope business is going well!</p>

  <p>Cheers,<br/><b>Satvik &amp; Sanatan</b></p>
</div>`;
}

function generatePlainText(data: EmailData): string {
  const { businessName, auditResult } = data;

  const improvementList = auditResult.improvements
    .slice(0, 3)
    .map((imp, i) => `${i + 1}. ${imp}`)
    .join('\n');

  return `Hey there,

We were browsing around and came across ${businessName}'s website. ${auditResult.hook}

We're Satvik and Sanatan, two full-stack developers. We build everything from websites and improvements to existing platforms to complete applications. We've been doing this for a while now and your business genuinely caught our eye.

We spent a few minutes looking things over and spotted a couple of things that could help:

${improvementList}

Nothing major to overhaul - these are the kind of tweaks that tend to make a real difference in how visitors experience the site (and whether they stick around).

We've attached a PDF with some of our recent work so you can get a feel for what we do. No pressure at all - just thought it might be useful context.

We're big on reasonable pricing, fast delivery, and making sure you're actually happy with the result - that's kind of our whole thing.

If any of this sounds interesting, we'd be happy to hop on a short call sometime. Totally casual, just to chat through some ideas.

Either way, hope business is going well!

Cheers,
Satvik & Sanatan`;
}

function generateSubject(businessName: string): string {
  const subjects = [
    `Quick thought about ${businessName}'s site`,
    `Had a look at ${businessName}'s website`,
    `${businessName} - spotted a couple things`,
    `Idea for ${businessName}'s website`,
  ];
  return subjects[Math.floor(Math.random() * subjects.length)];
}

export async function sendProposalEmail(data: EmailData): Promise<{ success: boolean; error?: string }> {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: data.email,
      subject: generateSubject(data.businessName),
      text: generatePlainText(data),
      html: generateEmailHtml(data),
      attachments: [
        {
          filename: 'ether-inc work.pdf',
          path: WORK_PDF_PATH,
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown email error'
    };
  }
}

export async function verifyEmailConfig(): Promise<boolean> {
  try {
    await transporter.verify();
    return true;
  } catch {
    return false;
  }
}
