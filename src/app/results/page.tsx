'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { LeadsTable } from '@/components/LeadsTable';
import { Loader2, RefreshCw, Mail, SkipForward, AlertTriangle, Star, Users } from 'lucide-react';
import { pageVariants, fadeUp, cardHover, buttonTap } from '@/lib/motion';

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

interface Stats {
  total: number;
  emailed: number;
  skipped: number;
  failed: number;
  avgScore: number;
}

const filters = [
  { key: 'all', label: 'All' },
  { key: 'EMAILED', label: 'Emailed' },
  { key: 'SKIPPED', label: 'Skipped' },
  { key: 'FAILED', label: 'Failed' },
];

export default function ResultsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    emailed: 0,
    skipped: 0,
    failed: 0,
    avgScore: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/leads');
      const data = await response.json();

      if (response.ok) {
        setLeads(data.leads || []);

        const allLeads = data.leads || [];
        const emailed = allLeads.filter((l: Lead) => l.status === 'EMAILED').length;
        const skipped = allLeads.filter((l: Lead) => l.status === 'SKIPPED').length;
        const failed = allLeads.filter((l: Lead) => l.status === 'FAILED').length;
        const scores = allLeads
          .filter((l: Lead) => l.auditScore !== null && l.auditScore !== undefined)
          .map((l: Lead) => l.auditScore as number);
        const avgScore = scores.length > 0
          ? Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10) / 10
          : 0;

        setStats({
          total: allLeads.length,
          emailed,
          skipped,
          failed,
          avgScore,
        });
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const filteredLeads = filter === 'all'
    ? leads
    : leads.filter((l) => l.status === filter);

  const statCards = [
    { label: 'Total Leads', value: stats.total, icon: Users },
    { label: 'Emailed', value: stats.emailed, icon: Mail },
    { label: 'Skipped', value: stats.skipped, icon: SkipForward },
    { label: 'Failed', value: stats.failed, icon: AlertTriangle },
    { label: 'Avg Score', value: `${stats.avgScore}/10`, icon: Star },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      <motion.main
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        className="max-w-6xl mx-auto px-6 py-8"
      >
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {statCards.map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              whileHover={cardHover}
              className="border border-white/[0.06] rounded-xl p-5 bg-white/[0.02]"
            >
              <div className="flex items-center gap-2 mb-3">
                <stat.icon className="w-3.5 h-3.5 text-neutral-500" />
                <span className="text-xs font-mono text-neutral-500 uppercase tracking-wider">
                  {stat.label}
                </span>
              </div>
              <p className="text-3xl font-bold text-white font-mono">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Filter Pills + Refresh */}
        <motion.div variants={fadeUp} className="flex items-center gap-2 mb-6">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs font-medium px-4 py-2 rounded-full transition-all ${
                filter === f.key
                  ? 'bg-white text-black'
                  : 'border border-white/[0.08] text-neutral-500 hover:text-white hover:border-white/20'
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="flex-1" />
          <motion.button
            onClick={fetchLeads}
            whileTap={buttonTap}
            className="inline-flex items-center gap-2 text-xs font-mono text-neutral-500 hover:text-white px-4 py-2 rounded-full border border-white/[0.08] hover:border-white/20 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </motion.button>
        </motion.div>

        {/* Leads Table */}
        <motion.div variants={fadeUp}>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-neutral-500 mx-auto mb-4" />
                <p className="text-neutral-500 text-sm font-mono">Loading leads...</p>
              </div>
            </div>
          ) : (
            <LeadsTable leads={filteredLeads} />
          )}
        </motion.div>
      </motion.main>
    </div>
  );
}
