'use client';

import { useState, useEffect } from 'react';
import { LeadsTable } from '@/components/LeadsTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

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
        
        // Calculate stats
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Navigation */}
      <nav className="border-b border-primary/20 bg-black/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              AutoClient
            </h1>
          </div>
          <div className="flex gap-4">
            <Link
              href="/dashboard"
              className="text-gray-400 hover:text-white font-medium px-4 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/results"
              className="text-green-400 font-medium px-4 py-2 rounded-lg bg-green-500/10"
            >
              Results
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-card/30 backdrop-blur border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card/30 backdrop-blur border-green-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-400">
                📧 Emailed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-400">{stats.emailed}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card/30 backdrop-blur border-gray-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                ⏭️ Skipped
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-400">{stats.skipped}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card/30 backdrop-blur border-red-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-400">
                ❌ Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-400">{stats.failed}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card/30 backdrop-blur border-yellow-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-400">
                ⭐ Avg Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-400">{stats.avgScore}/10</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'EMAILED' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('EMAILED')}
            className={filter === 'EMAILED' ? 'bg-green-600' : ''}
          >
            Emailed
          </Button>
          <Button
            variant={filter === 'SKIPPED' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('SKIPPED')}
          >
            Skipped
          </Button>
          <Button
            variant={filter === 'FAILED' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('FAILED')}
            className={filter === 'FAILED' ? 'bg-red-600' : ''}
          >
            Failed
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={fetchLeads}>
            🔄 Refresh
          </Button>
        </div>

        {/* Leads Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin text-4xl mb-4">⚡</div>
              <p className="text-muted-foreground">Loading leads...</p>
            </div>
          </div>
        ) : (
          <LeadsTable leads={filteredLeads} />
        )}
      </main>
    </div>
  );
}
