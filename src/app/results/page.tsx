'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { LeadsTable } from '@/components/LeadsTable';
import { Loader2, RefreshCw, Mail, SkipForward, AlertTriangle, Star, Users, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { pageVariants, fadeUp, cardHover, buttonTap } from '@/lib/motion';

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

interface Stats {
  total: number;
  emailed: number;
  skipped: number;
  failed: number;
  noWebsite: number;
  avgScore: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const filters = [
  { key: 'all', label: 'All' },
  { key: 'EMAILED', label: 'Emailed' },
  { key: 'SKIPPED', label: 'Skipped' },
  { key: 'FAILED', label: 'Failed' },
  { key: 'NO_WEBSITE', label: 'No Website' },
];

export default function ResultsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    emailed: 0,
    skipped: 0,
    failed: 0,
    noWebsite: 0,
    avgScore: 0,
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 50,
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const fetchLeads = useCallback(async (fetchPage: number, fetchFilter: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(fetchPage), pageSize: '50' });
      if (fetchFilter !== 'all') {
        params.set('status', fetchFilter);
      }

      const response = await fetch(`/api/leads?${params}`);
      const data = await response.json();

      if (response.ok) {
        setLeads(data.leads || []);
        if (data.stats) {
          setStats(data.stats);
        }
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads(page, filter);
  }, [page, filter, fetchLeads]);

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setPage(1);
  };

  const statCards = [
    { label: 'Total Leads', value: stats.total, icon: Users },
    { label: 'Emailed', value: stats.emailed, icon: Mail },
    { label: 'Skipped', value: stats.skipped, icon: SkipForward },
    { label: 'Failed', value: stats.failed, icon: AlertTriangle },
    { label: 'No Website', value: stats.noWebsite, icon: MapPin },
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
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
              onClick={() => handleFilterChange(f.key)}
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
            onClick={() => fetchLeads(page, filter)}
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
            <LeadsTable leads={leads} />
          )}
        </motion.div>

        {/* Pagination Controls */}
        {!isLoading && pagination.totalPages > 1 && (
          <motion.div
            variants={fadeUp}
            className="flex items-center justify-center gap-4 mt-6"
          >
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrev}
              className="inline-flex items-center gap-1.5 text-xs font-mono px-4 py-2 rounded-full border border-white/[0.08] text-neutral-500 hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-neutral-500 disabled:hover:border-white/[0.08]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            <span className="text-xs font-mono text-neutral-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total leads)
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasNext}
              className="inline-flex items-center gap-1.5 text-xs font-mono px-4 py-2 rounded-full border border-white/[0.08] text-neutral-500 hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-neutral-500 disabled:hover:border-white/[0.08]"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </motion.main>
    </div>
  );
}
