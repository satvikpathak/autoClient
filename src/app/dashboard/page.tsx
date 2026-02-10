'use client';

import { useState, useCallback } from 'react';
import { CampaignForm } from '@/components/CampaignForm';
import { TerminalLogs, LogEntry } from '@/components/TerminalLogs';
import Link from 'next/link';

export default function DashboardPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogs((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type,
        message,
        timestamp: new Date(),
      },
    ]);
  }, []);

  const processNextBatch = useCallback(
    async (campaignId: string, portfolioUrl: string) => {
      try {
        const response = await fetch('/api/process-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId, portfolioUrl, batchSize: 5 }),
        });

        const data = await response.json();

        if (!response.ok) {
          addLog('ERROR', data.error || 'Failed to process batch');
          return false;
        }

        // Log each result
        for (const result of data.results || []) {
          if (result.status === 'EMAILED') {
            addLog('EMAIL', `${result.businessName} - ${result.message}`);
          } else if (result.status === 'SKIPPED') {
            addLog('SKIP', `${result.businessName} - ${result.message}`);
          } else {
            addLog('ERROR', `${result.businessName} - ${result.message}`);
          }
        }

        if (data.remaining > 0) {
          addLog('INFO', `${data.remaining} leads remaining...`);
        }

        return !data.completed;
      } catch (error) {
        addLog('ERROR', error instanceof Error ? error.message : 'Network error');
        return false;
      }
    },
    [addLog]
  );

  const handleStartCampaign = useCallback(
    async ({ niche, location, portfolioUrl }: { niche: string; location: string; portfolioUrl: string }) => {
      setIsProcessing(true);
      setLogs([]);

      addLog('INFO', `Starting campaign: ${niche} in ${location}`);
      addLog('SEARCH', `Searching for ${niche} businesses in ${location}...`);

      try {
        // Create campaign and discover leads
        const response = await fetch('/api/campaign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ niche, location }),
        });

        const data = await response.json();

        if (!response.ok) {
          addLog('ERROR', data.error || 'Failed to create campaign');
          setIsProcessing(false);
          return;
        }

        setCurrentCampaignId(data.campaign.id);
        addLog('SUCCESS', `Found ${data.leadsCreated} businesses with websites!`);

        if (data.leadsCreated === 0) {
          addLog('INFO', 'No businesses found. Try a different niche or location.');
          setIsProcessing(false);
          return;
        }

        addLog('AUDIT', 'Starting website audits...');

        // Process batches until done
        let hasMore = true;
        while (hasMore) {
          hasMore = await processNextBatch(data.campaign.id, portfolioUrl);
          // Small delay between batches
          if (hasMore) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        addLog('SUCCESS', '🎉 Campaign complete! Check the Results page for details.');
      } catch (error) {
        addLog('ERROR', error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsProcessing(false);
      }
    },
    [addLog, processNextBatch]
  );

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
              className="text-green-400 font-medium px-4 py-2 rounded-lg bg-green-500/10"
            >
              Dashboard
            </Link>
            <Link
              href="/results"
              className="text-gray-400 hover:text-white font-medium px-4 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              Results
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-[400px_1fr] gap-8 h-[calc(100vh-180px)]">
          {/* Left Panel - Form */}
          <div className="space-y-6">
            <CampaignForm onStart={handleStartCampaign} isProcessing={isProcessing} />

            {/* Stats Card */}
            {currentCampaignId && (
              <div className="bg-card/30 backdrop-blur border border-primary/20 rounded-lg p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Quick Stats
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-400">
                      {logs.filter((l) => l.type === 'EMAIL').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Emailed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-400">
                      {logs.filter((l) => l.type === 'SKIP').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Skipped</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-400">
                      {logs.filter((l) => l.type === 'ERROR').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Errors</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Terminal */}
          <TerminalLogs logs={logs} isProcessing={isProcessing} />
        </div>
      </main>
    </div>
  );
}
