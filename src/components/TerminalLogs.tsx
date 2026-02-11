'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface LogEntry {
  id: string;
  type: 'SEARCH' | 'AUDIT' | 'EMAIL' | 'SKIP' | 'ERROR' | 'INFO' | 'SUCCESS' | 'CRAWL';
  message: string;
  timestamp: Date;
}

interface TerminalLogsProps {
  logs: LogEntry[];
  isProcessing: boolean;
}

const LOG_PREFIXES: Record<LogEntry['type'], string> = {
  SEARCH: 'SRCH',
  AUDIT: 'AUDT',
  EMAIL: 'MAIL',
  SKIP: 'SKIP',
  ERROR: 'ERR!',
  INFO: 'INFO',
  SUCCESS: ' OK ',
  CRAWL: 'CRWL',
};

export function TerminalLogs({ logs, isProcessing }: TerminalLogsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="h-full flex flex-col border border-white/[0.06] rounded-xl overflow-hidden bg-[#0c0c0c] relative">
      {/* Top gradient fade overlay for scroll indication */}
      <div className="absolute top-[41px] left-0 right-0 h-6 bg-gradient-to-b from-[#0c0c0c] to-transparent z-10 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-neutral-700" />
        </div>
        <span className="text-neutral-500 text-xs font-mono ml-2">
          terminal
          {isProcessing && <span className="terminal-cursor ml-1 text-white">_</span>}
        </span>
        {isProcessing && (
          <span className="ml-auto text-[10px] text-neutral-500 font-mono status-processing uppercase tracking-wider">
            running
          </span>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="font-mono text-xs space-y-0.5 terminal-scroll">
          {logs.length === 0 ? (
            <div className="text-neutral-600">
              <p>$ awaiting campaign...</p>
              <p className="text-neutral-700 mt-1">
                $ configure niche and location, then launch
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="flex items-start gap-2"
                >
                  <span className="text-neutral-700 shrink-0">
                    {formatTime(log.timestamp)}
                  </span>
                  <span className={`shrink-0 ${
                    log.type === 'ERROR' ? 'text-neutral-300' :
                    log.type === 'SUCCESS' ? 'text-white' :
                    'text-neutral-500'
                  }`}>
                    [{LOG_PREFIXES[log.type]}]
                  </span>
                  <span className={`${
                    log.type === 'ERROR' ? 'text-neutral-400' :
                    log.type === 'SUCCESS' ? 'text-white' :
                    'text-neutral-400'
                  }`}>
                    {log.message}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {isProcessing && (
            <div className="flex items-center gap-2 text-neutral-500 mt-2">
              <span className="terminal-cursor text-white">_</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-white/[0.06] flex justify-between text-[10px] font-mono text-neutral-600">
        <span>{logs.length} entries</span>
        <span>
          {logs.filter(l => l.type === 'EMAIL').length} sent /
          {' '}{logs.filter(l => l.type === 'SKIP').length} skip /
          {' '}{logs.filter(l => l.type === 'ERROR').length} err
        </span>
      </div>
    </div>
  );
}
