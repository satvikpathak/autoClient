'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface LogEntry {
  id: string;
  type: 'SEARCH' | 'AUDIT' | 'EMAIL' | 'SKIP' | 'ERROR' | 'INFO' | 'SUCCESS';
  message: string;
  timestamp: Date;
}

interface TerminalLogsProps {
  logs: LogEntry[];
  isProcessing: boolean;
}

const LOG_COLORS: Record<LogEntry['type'], string> = {
  SEARCH: 'text-cyan-400',
  AUDIT: 'text-yellow-400',
  EMAIL: 'text-green-400',
  SKIP: 'text-gray-400',
  ERROR: 'text-red-400',
  INFO: 'text-blue-400',
  SUCCESS: 'text-emerald-400',
};

const LOG_ICONS: Record<LogEntry['type'], string> = {
  SEARCH: '🔍',
  AUDIT: '📊',
  EMAIL: '📧',
  SKIP: '⏭️',
  ERROR: '❌',
  INFO: 'ℹ️',
  SUCCESS: '✅',
};

export function TerminalLogs({ logs, isProcessing }: TerminalLogsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new logs
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
    <div className="h-full flex flex-col bg-black/90 rounded-lg border border-green-500/30 overflow-hidden relative scanlines">
      {/* Terminal Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-900/80 border-b border-green-500/20">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <span className="text-green-400/80 text-sm font-mono ml-2">
          autoclient@pipeline ~ 
          {isProcessing && <span className="terminal-cursor ml-1">█</span>}
        </span>
        {isProcessing && (
          <span className="ml-auto text-xs text-green-400/60 status-processing">
            ● PROCESSING
          </span>
        )}
      </div>

      {/* Terminal Content */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="font-mono text-sm space-y-1 terminal-scroll">
          {logs.length === 0 ? (
            <div className="text-gray-500 italic">
              <p>{'>'} Waiting for campaign start...</p>
              <p className="text-green-500/50 mt-2">
                {'>'} Type your niche and location, then hit Launch 🚀
              </p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`terminal-line flex items-start gap-2 ${LOG_COLORS[log.type]}`}
              >
                <span className="text-gray-600 shrink-0">
                  [{formatTime(log.timestamp)}]
                </span>
                <span className="shrink-0">{LOG_ICONS[log.type]}</span>
                <span className="font-semibold shrink-0">[{log.type}]</span>
                <span className="text-gray-300">{log.message}</span>
              </div>
            ))
          )}
          
          {isProcessing && (
            <div className="flex items-center gap-2 text-green-400 mt-2">
              <span className="terminal-cursor">█</span>
              <span className="animate-pulse">Processing...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Terminal Footer Stats */}
      <div className="px-4 py-2 bg-gray-900/80 border-t border-green-500/20 flex justify-between text-xs font-mono text-gray-500">
        <span>Total: {logs.length} entries</span>
        <span>
          {logs.filter(l => l.type === 'EMAIL').length} emails sent •{' '}
          {logs.filter(l => l.type === 'SKIP').length} skipped •{' '}
          {logs.filter(l => l.type === 'ERROR').length} errors
        </span>
      </div>
    </div>
  );
}
