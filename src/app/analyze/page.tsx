'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AnalyzeUrlResponse } from '@/app/api/analyze-url/route';

export default function AnalyzePage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeUrlResponse | null>(null);
  const [error, setError] = useState('');
  const [emailTo, setEmailTo] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [autoSend, setAutoSend] = useState(true);

  // Auto-send effect
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

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400';
    if (score >= 5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 8) return 'from-green-500/20 to-green-600/10 border-green-500/30';
    if (score >= 5) return 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30';
    return 'from-red-500/20 to-red-600/10 border-red-500/30';
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <nav className="border-b border-white/10 bg-slate-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            AutoClient
          </Link>
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors">
            ← Back to Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-3">
            🔍 Website Analyzer
          </h1>
          <p className="text-slate-400 text-lg">
            Enter any URL to get an instant AI-powered audit
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10 rounded-2xl p-6 mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleAnalyze()}
              placeholder="Enter website URL (e.g., example.com)"
              className="flex-1 px-5 py-4 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
              disabled={loading}
            />
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-indigo-500/25"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Analyzing...
                </>
              ) : (
                'Analyze'
              )}
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 mt-4 text-slate-400">
            <input
              type="checkbox"
              id="autoSend"
              checked={autoSend}
              onChange={(e) => setAutoSend(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500/50"
            />
            <label htmlFor="autoSend" className="text-sm cursor-pointer select-none">
              Auto-send proposal if email found
            </label>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-block animate-pulse">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔍</span>
              </div>
            </div>
            <p className="text-slate-400 text-lg">Taking screenshot and analyzing with AI...</p>
            <p className="text-slate-500 text-sm mt-2">This may take 10-30 seconds</p>
          </div>
        )}

        {/* Results */}
        {result && result.audit && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Score Card */}
            <div className={`bg-gradient-to-br ${getScoreBg(result.audit.score)} border rounded-2xl p-8 text-center`}>
              <div className={`text-6xl font-bold ${getScoreColor(result.audit.score)} mb-2`}>
                {result.audit.score}/10
              </div>
              <p className="text-slate-400">
                {result.audit.is_boring ? '⚠️ Outdated Design Detected' : '✨ Modern Design'}
              </p>
              <p className="text-white font-medium mt-2">{result.title}</p>
            </div>

            {/* Screenshot */}
            {result.screenshotBase64 && (
              <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-4 overflow-hidden">
                <h3 className="text-white font-semibold mb-3">📸 Screenshot</h3>
                <img
                  src={`data:image/png;base64,${result.screenshotBase64}`}
                  alt="Website screenshot"
                  className="w-full rounded-lg border border-white/10"
                />
              </div>
            )}

            {/* Hook */}
            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-3">💬 Suggested Email Hook</h3>
              <p className="text-slate-300 italic">&ldquo;{result.audit.hook}&rdquo;</p>
            </div>

            {/* Flaws & Improvements */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Flaws */}
              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
                <h3 className="text-red-400 font-semibold mb-4 flex items-center gap-2">
                  <span>❌</span> Issues Found
                </h3>
                <ul className="space-y-3">
                  {result.audit.flaws.map((flaw, i) => (
                    <li key={i} className="text-slate-300 flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span>
                      {flaw}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Improvements */}
              <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-6">
                <h3 className="text-green-400 font-semibold mb-4 flex items-center gap-2">
                  <span>✅</span> Suggested Improvements
                </h3>
                <ul className="space-y-3">
                  {result.audit.improvements.map((improvement, i) => (
                    <li key={i} className="text-slate-300 flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">•</span>
                      {improvement}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Send Proposal Section */}
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-3">🚀 Send Proposal</h3>
              <p className="text-slate-400 text-sm mb-4">
                Found a prospect? Send them this audit instantly.
              </p>
              
              <div className="flex gap-3">
                <input
                  type="email"
                  placeholder="Enter prospect's email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="flex-1 px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all"
                />
                <button
                  onClick={() => handleSendProposal()}
                  disabled={sendingEmail || !emailTo}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {sendingEmail ? 'Sending...' : 'Send Proposal'}
                </button>
              </div>

              {emailStatus === 'success' && (
                <p className="text-green-400 text-sm mt-3 animate-in fade-in">
                  ✅ Proposal sent successfully!
                </p>
              )}
              {emailStatus === 'error' && (
                <p className="text-red-400 text-sm mt-3 animate-in fade-in">
                  ❌ Failed to send proposal. Check your SMTP settings.
                </p>
              )}
            </div>

            {/* Emails Found */}
            {result.emails && result.emails.length > 0 && (
              <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-3">📧 Emails Found</h3>
                <div className="flex flex-wrap gap-2">
                  {result.emails.map((email, i) => (
                    <span key={i} className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-300 text-sm">
                      {email}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Analyze Another */}
            <div className="text-center pt-4">
              <button
                onClick={() => {
                  setResult(null);
                  setUrl('');
                }}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
              >
                Analyze Another Website
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
