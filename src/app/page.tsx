import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col">
      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-3xl mx-auto">
          {/* Logo */}
          <div className="mb-8 inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-2xl shadow-green-500/30">
            <span className="text-4xl">⚡</span>
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-green-200 to-emerald-400 bg-clip-text text-transparent leading-tight">
            AutoClient
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-400 mb-4">
            Zero-Touch Automated SDR
          </p>

          {/* Description */}
          <p className="text-lg text-gray-500 mb-12 max-w-xl mx-auto">
            Find businesses with outdated websites, audit them with AI,
            and send personalized cold emails — all on autopilot.
          </p>

          {/* CTA Button */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold text-lg rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-green-500/30 hover:-translate-y-0.5"
          >
            <span>🚀</span>
            Launch Dashboard
          </Link>

          {/* Feature Pills */}
          <div className="mt-16 flex flex-wrap justify-center gap-3">
            {[
              '🔍 Google Places Discovery',
              '📸 AI Visual Audit',
              '📧 Auto Email Outreach',
              '📊 Real-time Tracking',
            ].map((feature) => (
              <span
                key={feature}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-gray-400"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-600 text-sm">
        <p>Built with Next.js, Gemini AI, and Playwright</p>
      </footer>
    </div>
  );
}
