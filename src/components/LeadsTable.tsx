'use client';

import { motion } from 'framer-motion';
import { Mail, MapPin, MessageCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

function buildWhatsAppUrl(phone: string, businessName: string): string {
  let digits = phone.replace(/\D/g, '');
  // Prepend US country code if no country code present (10 digits = US number)
  if (digits.length === 10) {
    digits = '1' + digits;
  }
  const message = `Hi! I came across ${businessName} and noticed you don't have a website yet. I build modern websites for local businesses — would you be interested in a free mockup?`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

interface Lead {
  id: string;
  businessName: string;
  websiteUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  googleMapsUrl?: string | null;
  auditScore?: number | null;
  status: 'DISCOVERED' | 'SCRAPING' | 'ANALYZING' | 'EMAILED' | 'SKIPPED' | 'FAILED' | 'NO_WEBSITE';
  sentAt?: string | null;
  createdAt: string;
  campaign?: {
    niche: string;
    location: string;
  };
}

interface LeadsTableProps {
  leads: Lead[];
}

const STATUS_STYLES: Record<Lead['status'], { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  DISCOVERED: { variant: 'outline', className: 'border-white/[0.08] text-neutral-500' },
  SCRAPING: { variant: 'secondary', className: 'bg-white/[0.06] text-neutral-400 status-processing' },
  ANALYZING: { variant: 'secondary', className: 'bg-white/[0.06] text-neutral-400 status-processing' },
  EMAILED: { variant: 'default', className: 'bg-white/[0.1] text-white border-white/[0.06]' },
  SKIPPED: { variant: 'secondary', className: 'bg-white/[0.04] text-neutral-500' },
  FAILED: { variant: 'secondary', className: 'bg-white/[0.04] text-neutral-500' },
  NO_WEBSITE: { variant: 'outline', className: 'border-amber-500/30 text-amber-400' },
};

function getScoreStyle(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'text-neutral-600';
  if (score >= 7) return 'text-white font-bold';
  if (score >= 4) return 'text-neutral-300';
  return 'text-neutral-500';
}

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export function LeadsTable({ leads }: LeadsTableProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace('www.', '');
    } catch {
      return url.slice(0, 30);
    }
  };

  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-white/[0.02] hover:bg-white/[0.02] border-b border-white/[0.06]">
            <TableHead className="font-semibold text-neutral-400 text-xs font-mono uppercase tracking-wider">Business</TableHead>
            <TableHead className="font-semibold text-neutral-400 text-xs font-mono uppercase tracking-wider">Website</TableHead>
            <TableHead className="font-semibold text-neutral-400 text-xs font-mono uppercase tracking-wider text-center">Score</TableHead>
            <TableHead className="font-semibold text-neutral-400 text-xs font-mono uppercase tracking-wider">Status</TableHead>
            <TableHead className="font-semibold text-neutral-400 text-xs font-mono uppercase tracking-wider">Email</TableHead>
            <TableHead className="font-semibold text-neutral-400 text-xs font-mono uppercase tracking-wider text-right">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-neutral-500">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-xl border border-white/[0.06] flex items-center justify-center">
                    <Mail className="w-5 h-5 text-neutral-600" />
                  </div>
                  <p className="text-sm font-mono">No leads yet. Start a campaign to find prospects.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            leads.map((lead, i) => (
              <motion.tr
                key={lead.id}
                custom={i}
                variants={rowVariants}
                initial="hidden"
                animate="visible"
                className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
              >
                <TableCell className="font-medium text-white">
                  <div className="flex flex-col">
                    <span>{lead.businessName}</span>
                    {lead.campaign && (
                      <span className="text-xs text-neutral-600 font-mono">
                        {lead.campaign.niche} / {lead.campaign.location}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {lead.websiteUrl ? (
                    <a
                      href={lead.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-400 hover:text-white transition-colors font-mono text-sm"
                    >
                      {truncateUrl(lead.websiteUrl)}
                    </a>
                  ) : lead.googleMapsUrl ? (
                    <a
                      href={lead.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 transition-colors font-mono text-sm"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Google Maps
                    </a>
                  ) : (
                    <span className="text-sm text-neutral-700">&mdash;</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {lead.status === 'NO_WEBSITE' ? (
                    <span className="text-sm text-neutral-600 font-mono">N/A</span>
                  ) : (
                    <span className={`font-bold text-lg font-mono ${getScoreStyle(lead.auditScore)}`}>
                      {lead.auditScore !== null && lead.auditScore !== undefined
                        ? `${lead.auditScore}/10`
                        : '\u2014'}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={STATUS_STYLES[lead.status].variant}
                    className={STATUS_STYLES[lead.status].className}
                  >
                    {lead.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {lead.email ? (
                    <span className="text-sm text-neutral-400 font-mono">{lead.email}</span>
                  ) : lead.phone ? (
                    <a
                      href={buildWhatsAppUrl(lead.phone, lead.businessName)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-mono text-green-400 hover:text-green-300 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </a>
                  ) : (
                    <span className="text-sm text-neutral-700">&mdash;</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-sm text-neutral-500 font-mono">
                  {lead.sentAt ? formatDate(lead.sentAt) : formatDate(lead.createdAt)}
                </TableCell>
              </motion.tr>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
