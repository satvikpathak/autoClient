'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Lead {
  id: string;
  businessName: string;
  websiteUrl: string;
  email?: string | null;
  auditScore?: number | null;
  status: 'DISCOVERED' | 'SCRAPING' | 'ANALYZING' | 'EMAILED' | 'SKIPPED' | 'FAILED';
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
  DISCOVERED: { variant: 'outline', className: 'border-gray-500 text-gray-400' },
  SCRAPING: { variant: 'secondary', className: 'bg-blue-500/20 text-blue-400 status-processing' },
  ANALYZING: { variant: 'secondary', className: 'bg-yellow-500/20 text-yellow-400 status-processing' },
  EMAILED: { variant: 'default', className: 'bg-green-500/20 text-green-400 border-green-500/50' },
  SKIPPED: { variant: 'secondary', className: 'bg-gray-500/20 text-gray-400' },
  FAILED: { variant: 'destructive', className: 'bg-red-500/20 text-red-400' },
};

function getScoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'text-gray-500';
  if (score >= 7) return 'text-green-400';
  if (score >= 4) return 'text-yellow-400';
  return 'text-red-400';
}

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
    <div className="rounded-lg border border-primary/20 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-semibold">Business</TableHead>
            <TableHead className="font-semibold">Website</TableHead>
            <TableHead className="font-semibold text-center">Score</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Email</TableHead>
            <TableHead className="font-semibold text-right">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-4xl">📭</span>
                  <p>No leads yet. Start a campaign to find prospects!</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            leads.map((lead) => (
              <TableRow key={lead.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{lead.businessName}</span>
                    {lead.campaign && (
                      <span className="text-xs text-muted-foreground">
                        {lead.campaign.niche} • {lead.campaign.location}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <a
                    href={lead.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                  >
                    {truncateUrl(lead.websiteUrl)}
                  </a>
                </TableCell>
                <TableCell className="text-center">
                  <span className={`font-bold text-lg ${getScoreColor(lead.auditScore)}`}>
                    {lead.auditScore !== null && lead.auditScore !== undefined
                      ? `${lead.auditScore}/10`
                      : '—'}
                  </span>
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
                    <span className="text-sm text-muted-foreground">{lead.email}</span>
                  ) : (
                    <span className="text-sm text-gray-600">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {lead.sentAt ? formatDate(lead.sentAt) : formatDate(lead.createdAt)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
