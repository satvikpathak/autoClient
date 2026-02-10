import nodemailer from 'nodemailer';
import type { AuditResult } from './gemini';

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
  portfolioUrl: string;
}

function generateEmailBody(data: EmailData): string {
  const { businessName, auditResult, portfolioUrl } = data;
  
  const improvementList = auditResult.improvements
    .slice(0, 3)
    .map((imp, i) => `${i + 1}. ${imp}`)
    .join('\n');

  return `Hi Team,

${auditResult.hook}

I'm a web developer who specializes in helping businesses like ${businessName} convert more visitors into customers through modern, high-performing websites.

Based on my initial review, here are a few quick wins that could make a significant difference:

${improvementList}

I'd love to show you what a refreshed, conversion-optimized site could look like.

Here's some of my previous work: ${portfolioUrl}

Would you be open to a quick 15-minute call this week to discuss?

Best regards,
A Web Developer Who Noticed Your Potential

P.S. Feel free to reply directly to this email if you have any questions.`;
}

function generateSubject(businessName: string): string {
  const subjects = [
    `Quick idea for ${businessName}'s website`,
    `Feedback on ${businessName} website`,
    `Noticed something about ${businessName}'s online presence`,
    `${businessName} website - opportunity spotted`,
  ];
  return subjects[Math.floor(Math.random() * subjects.length)];
}

export async function sendProposalEmail(data: EmailData): Promise<{ success: boolean; error?: string }> {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: data.email,
      subject: generateSubject(data.businessName),
      text: generateEmailBody(data),
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
