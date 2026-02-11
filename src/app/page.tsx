'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Search, Camera, Mail, BarChart3 } from 'lucide-react';
import { pageVariants, fadeUp, scaleIn, fadeIn, buttonTap } from '@/lib/motion';

const features = [
  { icon: Search, label: 'Google Places Discovery' },
  { icon: Camera, label: 'AI Visual Audit' },
  { icon: Mail, label: 'Auto Email Outreach' },
  { icon: BarChart3, label: 'Real-time Tracking' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-3xl" />

      {/* Hero Section */}
      <main className="relative flex-1 flex items-center justify-center min-h-screen px-6">
        <motion.div
          variants={pageVariants}
          initial="hidden"
          animate="visible"
          className="text-center max-w-2xl mx-auto"
        >
          {/* Logo */}
          <motion.div
            variants={scaleIn}
            className="mb-10 inline-flex items-center justify-center w-16 h-16 rounded-2xl border border-white/10 bg-white/5"
          >
            <span className="text-2xl font-mono font-bold text-white">A</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={fadeUp}
            className="text-6xl md:text-8xl font-bold mb-6 tracking-tight text-shimmer"
          >
            AutoClient
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeUp}
            className="text-lg md:text-xl text-neutral-500 mb-4 font-mono"
          >
            Zero-Touch Automated SDR
          </motion.p>

          {/* Description */}
          <motion.p
            variants={fadeUp}
            className="text-base text-neutral-600 mb-14 max-w-md mx-auto leading-relaxed"
          >
            Find businesses with outdated websites, audit them with AI,
            and send personalized cold emails — all on autopilot.
          </motion.p>

          {/* CTA Button */}
          <motion.div variants={fadeUp}>
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={buttonTap}
            >
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-3 px-8 py-4 bg-white text-black font-medium text-sm rounded-full transition-all duration-300 hover:bg-neutral-200"
              >
                Launch Dashboard
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </motion.div>

          {/* Feature Pills */}
          <motion.div
            variants={fadeIn}
            className="mt-20 flex flex-wrap justify-center gap-3"
          >
            {features.map((feature) => (
              <motion.span
                key={feature.label}
                variants={fadeUp}
                className="inline-flex items-center gap-2 px-4 py-2 border border-white/[0.06] rounded-full text-xs text-neutral-500 font-mono"
              >
                <feature.icon className="w-3.5 h-3.5" />
                {feature.label}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <motion.footer
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="absolute bottom-0 w-full py-6 text-center text-neutral-700 text-xs font-mono"
      >
        <p>Next.js / Gemini AI / Playwright</p>
      </motion.footer>
    </div>
  );
}
