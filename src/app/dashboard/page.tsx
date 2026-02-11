'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CampaignForm } from '@/components/CampaignForm';
import { TerminalLogs, LogEntry } from '@/components/TerminalLogs';
import { Navbar } from '@/components/Navbar';
import { Mail, SkipForward, AlertCircle, MapPin, Pause } from 'lucide-react';
import { pageVariants, fadeUp, slideInLeft, slideInRight, buttonTap } from '@/lib/motion';

export default function DashboardPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);
  const [noWebsiteCount, setNoWebsiteCount] = useState(0);
  const pauseRef = useRef(false);

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
    async (campaignId: string) => {
      try {
        const response = await fetch('/api/process-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId, batchSize: 5 }),
        });

        if (!response.ok) {
          const data = await response.json();
          addLog('ERROR', data.error || 'Failed to process batch');
          return false;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          addLog('ERROR', 'No response stream');
          return false;
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let hasMore = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Split by double newline (SSE event boundary)
          const parts = buffer.split('\n\n');
          // Keep the last part as it may be incomplete
          buffer = parts.pop() || '';

          for (const part of parts) {
            if (!part.trim()) continue;

            const lines = part.split('\n');
            let eventType = '';
            let eventData = '';

            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.slice(7);
              } else if (line.startsWith('data: ')) {
                eventData = line.slice(6);
              }
            }

            if (!eventType || !eventData) continue;

            try {
              const data = JSON.parse(eventData);

              if (eventType === 'log') {
                const msg: string = data.message || '';
                if (msg.includes('[Firecrawl]')) {
                  addLog('CRAWL', msg);
                } else {
                  addLog('INFO', msg);
                }
              } else if (eventType === 'result') {
                if (data.status === 'EMAILED') {
                  addLog('EMAIL', `${data.businessName} - ${data.message}`);
                } else if (data.status === 'SKIPPED') {
                  addLog('SKIP', `${data.businessName} - ${data.message}`);
                } else {
                  addLog('ERROR', `${data.businessName} - ${data.message}`);
                }
              } else if (eventType === 'done') {
                if (data.remaining > 0) {
                  addLog('INFO', `${data.remaining} leads remaining...`);
                }
                hasMore = !data.completed;
              }
            } catch {
              // Ignore malformed JSON
            }
          }
        }

        return hasMore;
      } catch (error) {
        addLog('ERROR', error instanceof Error ? error.message : 'Network error');
        return false;
      }
    },
    [addLog]
  );

  const handleStartCampaign = useCallback(
    async ({ niche, location }: { niche: string; location: string }) => {
      setIsProcessing(true);
      setLogs([]);
      pauseRef.current = false;

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
        setNoWebsiteCount(data.noWebsiteLeads || 0);
        addLog('SUCCESS', `Found ${data.websiteLeads || data.leadsCreated} businesses with websites`);
        if (data.noWebsiteLeads > 0) {
          addLog('INFO', `Found ${data.noWebsiteLeads} businesses without websites`);
        }
        if (data.duplicatesSkipped > 0) {
          addLog('INFO', `Skipped ${data.duplicatesSkipped} duplicate businesses`);
        }

        if (data.leadsCreated === 0) {
          addLog('INFO', 'No businesses found. Try a different niche or location.');
          setIsProcessing(false);
          return;
        }

        addLog('AUDIT', 'Starting website audits...');

        let hasMore = true;
        while (hasMore && !pauseRef.current) {
          hasMore = await processNextBatch(data.campaign.id);
          if (hasMore && !pauseRef.current) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        if (pauseRef.current && hasMore) {
          // Set campaign status to PAUSED
          await fetch(`/api/campaign/${data.campaign.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'PAUSED' }),
          });
          addLog('INFO', 'Campaign paused. Remaining leads will not be processed.');
        } else {
          addLog('SUCCESS', 'Campaign complete. Check Results for details.');
        }
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

            {/* Pause Button */}
            {isProcessing && (
              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileTap={buttonTap}
                onClick={() => { pauseRef.current = true; }}
                className="w-full inline-flex items-center justify-center gap-2 text-sm font-mono text-red-400 px-4 py-3 rounded-xl border border-red-500/20 hover:border-red-500/40 hover:bg-red-500/5 transition-colors"
              >
                <Pause className="w-4 h-4" />
                Pause Campaign
              </motion.button>
            )}

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
                  <div className="grid grid-cols-4 gap-4 text-center">
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
                    <div>
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <MapPin className="w-3 h-3 text-amber-500" />
                      </div>
                      <p className="text-xl font-bold text-amber-400 font-mono">{noWebsiteCount}</p>
                      <p className="text-[10px] text-neutral-600 font-mono">No Website</p>
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
