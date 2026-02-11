'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CampaignForm } from '@/components/CampaignForm';
import { TerminalLogs, LogEntry } from '@/components/TerminalLogs';
import { Navbar } from '@/components/Navbar';
import { Mail, SkipForward, AlertCircle } from 'lucide-react';
import { pageVariants, fadeUp, slideInLeft, slideInRight } from '@/lib/motion';

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
        addLog('SUCCESS', `Found ${data.leadsCreated} businesses with websites`);

        if (data.leadsCreated === 0) {
          addLog('INFO', 'No businesses found. Try a different niche or location.');
          setIsProcessing(false);
          return;
        }

        addLog('AUDIT', 'Starting website audits...');

        let hasMore = true;
        while (hasMore) {
          hasMore = await processNextBatch(data.campaign.id, portfolioUrl);
          if (hasMore) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        addLog('SUCCESS', 'Campaign complete. Check Results for details.');
      } catch (error) {
        addLog('ERROR', error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsProcessing(false);
      }
    },
    [addLog, processNextBatch]
  );

  const emailCount = logs.filter((l) => l.type === 'EMAIL').length;
  const skipCount = logs.filter((l) => l.type === 'SKIP').length;
  const errorCount = logs.filter((l) => l.type === 'ERROR').length;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      <motion.main
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        className="max-w-6xl mx-auto px-6 py-8"
      >
        <motion.div variants={fadeUp} className="mb-8">
          <h2 className="text-2xl font-bold text-white tracking-tight">Dashboard</h2>
          <p className="text-sm text-neutral-500 mt-1 font-mono">Configure and launch campaigns</p>
        </motion.div>

        <div className="grid lg:grid-cols-[380px_1fr] gap-6 h-[calc(100vh-200px)]">
          {/* Left Panel */}
          <motion.div variants={slideInLeft} className="space-y-4">
            <CampaignForm onStart={handleStartCampaign} isProcessing={isProcessing} />

            {/* Stats */}
            <AnimatePresence>
              {currentCampaignId && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="border border-white/[0.06] rounded-xl p-4 bg-white/[0.02] overflow-hidden"
                >
                  <p className="text-xs font-mono text-neutral-500 mb-3 uppercase tracking-wider">Stats</p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Mail className="w-3 h-3 text-neutral-500" />
                      </div>
                      <p className="text-xl font-bold text-white font-mono">{emailCount}</p>
                      <p className="text-[10px] text-neutral-600 font-mono">Emailed</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <SkipForward className="w-3 h-3 text-neutral-500" />
                      </div>
                      <p className="text-xl font-bold text-neutral-400 font-mono">{skipCount}</p>
                      <p className="text-[10px] text-neutral-600 font-mono">Skipped</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <AlertCircle className="w-3 h-3 text-neutral-500" />
                      </div>
                      <p className="text-xl font-bold text-neutral-400 font-mono">{errorCount}</p>
                      <p className="text-[10px] text-neutral-600 font-mono">Errors</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Right Panel - Terminal */}
          <motion.div variants={slideInRight}>
            <TerminalLogs logs={logs} isProcessing={isProcessing} />
          </motion.div>
        </div>
      </motion.main>
    </div>
  );
}
