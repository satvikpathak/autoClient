'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Loader2, ArrowRight, ExternalLink, Send, RotateCcw, Check, X } from 'lucide-react';
import { AnalyzeUrlResponse } from '@/app/api/analyze-url/route';
import { pageVariants, fadeUp, slideInLeft, slideInRight, buttonTap } from '@/lib/motion';

function AnimatedScore({ score }: { score: number }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v));
  const displayRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(motionValue, score, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [score, motionValue]);

  useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => {
      if (displayRef.current) {
        displayRef.current.textContent = String(v);
      }
    });
    return unsubscribe;
  }, [rounded]);

  return <span ref={displayRef}>0</span>;
}

export default function AnalyzePage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeUrlResponse | null>(null);
  const [error, setError] = useState('');
  const [emailTo, setEmailTo] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [autoSend, setAutoSend] = useState(true);

  useEffect(() => {
    if (result && result.emails && result.emails.length > 0 && autoSend && !sendingEmail && emailStatus === 'idle') {
      const targetEmail = result.emails[0];
      setEmailTo(targetEmail);
      handleSendProposal(targetEmail);
    }
  }, [result]);

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/analyze-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data: AnalyzeUrlResponse = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to analyze website');
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSendProposal = async (emailOverride?: string) => {
    const targetEmail = emailOverride || emailTo;
    if (!targetEmail.trim() || !result || !result.audit) return;

    setSendingEmail(true);
    setEmailStatus('idle');

    try {
      const response = await fetch('/api/send-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          businessName: result.title || 'Business',
          websiteUrl: result.url,
          auditResult: result.audit,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setEmailStatus('success');
        setEmailTo('');
      } else {
        setEmailStatus('error');
      }
    } catch {
      setEmailStatus('error');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      <motion.main
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        className="max-w-3xl mx-auto px-6 py-12"
      >
        {/* Title */}
        <motion.div variants={fadeUp} className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
            Website Analyzer
          </h1>
          <p className="text-sm text-neutral-500 font-mono">
            Enter any URL for an instant AI-powered audit
          </p>
        </motion.div>

        {/* Input Section */}
        <motion.div
          variants={fadeUp}
          className="border border-white/[0.06] rounded-xl p-6 bg-white/[0.02] mb-8"
        >
          <div className="flex gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleAnalyze()}
              placeholder="example.com"
              className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-lg text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-white/20 transition-colors font-mono"
              disabled={loading}
            />
            <motion.button
              onClick={handleAnalyze}
              disabled={loading}
              whileTap={buttonTap}
              className="px-6 py-3 bg-white text-black font-medium text-sm rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 hover:bg-neutral-200"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing
                </>
              ) : (
                <>
                  Analyze
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </div>

          <div className="flex items-center justify-center gap-2 mt-4">
            <input
              type="checkbox"
              id="autoSend"
              checked={autoSend}
              onChange={(e) => setAutoSend(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-neutral-700 bg-neutral-900 accent-white"
            />
            <label htmlFor="autoSend" className="text-xs text-neutral-500 cursor-pointer select-none font-mono">
              Auto-send proposal if email found
            </label>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 p-3 border border-white/[0.08] rounded-lg text-neutral-400 text-sm font-mono"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Loading State */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-16"
            >
              <Loader2 className="w-8 h-8 animate-spin text-neutral-500 mx-auto mb-4" />
              <p className="text-neutral-500 text-sm font-mono">Capturing screenshot and analyzing...</p>
              <p className="text-neutral-700 text-xs mt-1 font-mono">10-30 seconds</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {result && result.audit && (
            <motion.div
              variants={pageVariants}
              initial="hidden"
              animate="visible"
              className="space-y-5"
            >
              {/* Score */}
              <motion.div variants={fadeUp} className="border border-white/[0.06] rounded-xl p-8 text-center bg-white/[0.02]">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="text-6xl font-bold text-white font-mono mb-2"
                >
                  <AnimatedScore score={result.audit.score} /><span className="text-neutral-600">/10</span>
                </motion.div>
                <p className="text-xs text-neutral-500 font-mono uppercase tracking-wider">
                  {result.audit.is_boring ? 'Outdated Design' : 'Modern Design'}
                </p>
                <p className="text-sm text-neutral-400 mt-2">{result.title}</p>
              </motion.div>

              {/* Screenshot */}
              {result.screenshotBase64 && (
                <motion.div
                  variants={fadeUp}
                  className="border border-white/[0.06] rounded-xl p-4 bg-white/[0.02] overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-neutral-500 uppercase tracking-wider">Screenshot</span>
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-neutral-500 hover:text-white transition-colors flex items-center gap-1 font-mono"
                    >
                      Visit <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <img
                    src={`data:image/png;base64,${result.screenshotBase64}`}
                    alt="Website screenshot"
                    className="w-full rounded-lg border border-white/[0.06]"
                  />
                </motion.div>
              )}

              {/* Hook */}
              <motion.div
                variants={fadeUp}
                className="border border-white/[0.06] rounded-xl p-6 bg-white/[0.02]"
              >
                <span className="text-xs font-mono text-neutral-500 uppercase tracking-wider">Email Hook</span>
                <p className="text-neutral-300 mt-3 text-sm leading-relaxed italic">
                  &ldquo;{result.audit.hook}&rdquo;
                </p>
              </motion.div>

              {/* Flaws & Improvements */}
              <div className="grid md:grid-cols-2 gap-4">
                <motion.div
                  variants={slideInLeft}
                  className="border border-white/[0.06] rounded-xl p-6 bg-white/[0.02]"
                >
                  <span className="text-xs font-mono text-neutral-500 uppercase tracking-wider">Issues</span>
                  <ul className="mt-4 space-y-3">
                    {result.audit.flaws.map((flaw, i) => (
                      <li key={i} className="text-sm text-neutral-400 flex items-start gap-2">
                        <X className="w-3.5 h-3.5 text-neutral-600 mt-0.5 shrink-0" />
                        {flaw}
                      </li>
                    ))}
                  </ul>
                </motion.div>

                <motion.div
                  variants={slideInRight}
                  className="border border-white/[0.06] rounded-xl p-6 bg-white/[0.02]"
                >
                  <span className="text-xs font-mono text-neutral-500 uppercase tracking-wider">Improvements</span>
                  <ul className="mt-4 space-y-3">
                    {result.audit.improvements.map((improvement, i) => (
                      <li key={i} className="text-sm text-neutral-400 flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-neutral-500 mt-0.5 shrink-0" />
                        {improvement}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>

              {/* Send Proposal */}
              <motion.div
                variants={fadeUp}
                className="border border-white/[0.06] rounded-xl p-6 bg-white/[0.02]"
              >
                <span className="text-xs font-mono text-neutral-500 uppercase tracking-wider">Send Proposal</span>
                <div className="flex gap-3 mt-4">
                  <input
                    type="email"
                    placeholder="prospect@email.com"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-lg text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-white/20 transition-colors font-mono"
                  />
                  <motion.button
                    onClick={() => handleSendProposal()}
                    disabled={sendingEmail || !emailTo}
                    whileTap={buttonTap}
                    className="px-5 py-3 bg-white text-black font-medium text-sm rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 hover:bg-neutral-200"
                  >
                    {sendingEmail ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Send
                  </motion.button>
                </div>

                <AnimatePresence>
                  {emailStatus === 'success' && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-neutral-400 text-xs mt-3 font-mono"
                    >
                      Proposal sent successfully
                    </motion.p>
                  )}
                  {emailStatus === 'error' && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-neutral-500 text-xs mt-3 font-mono"
                    >
                      Failed to send. Check SMTP settings.
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Emails Found */}
              {result.emails && result.emails.length > 0 && (
                <motion.div
                  variants={fadeUp}
                  className="border border-white/[0.06] rounded-xl p-6 bg-white/[0.02]"
                >
                  <span className="text-xs font-mono text-neutral-500 uppercase tracking-wider">Emails Found</span>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {result.emails.map((email, i) => (
                      <span key={i} className="px-3 py-1.5 border border-white/[0.08] rounded-full text-neutral-400 text-xs font-mono">
                        {email}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Reset */}
              <motion.div variants={fadeUp} className="text-center pt-2">
                <motion.button
                  onClick={() => {
                    setResult(null);
                    setUrl('');
                    setEmailStatus('idle');
                  }}
                  whileTap={buttonTap}
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/[0.08] text-neutral-500 hover:text-white rounded-lg text-xs font-mono transition-colors hover:border-white/20"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Analyze Another
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>
    </div>
  );
}
