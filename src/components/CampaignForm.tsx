'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight } from 'lucide-react';
import { staggerContainer, fadeUp, buttonTap } from '@/lib/motion';

interface CampaignFormProps {
  onStart: (data: { niche: string; location: string; portfolioUrl: string }) => void;
  isProcessing: boolean;
}

export function CampaignForm({ onStart, isProcessing }: CampaignFormProps) {
  const [niche, setNiche] = useState('');
  const [location, setLocation] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('autoclient_portfolio');
    if (saved) setPortfolioUrl(saved);
  }, []);

  useEffect(() => {
    if (portfolioUrl) {
      localStorage.setItem('autoclient_portfolio', portfolioUrl);
    }
  }, [portfolioUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche || !location) return;
    onStart({ niche, location, portfolioUrl });
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="border border-white/[0.06] rounded-xl p-6 bg-white/[0.02]"
    >
      <motion.div variants={fadeUp} className="mb-6">
        <h3 className="text-lg font-semibold text-white tracking-tight">New Campaign</h3>
        <p className="text-xs text-neutral-500 mt-1 font-mono">
          Find businesses with outdated websites
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <motion.div variants={fadeUp} className="space-y-2">
          <Label htmlFor="niche" className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
            Niche
          </Label>
          <Input
            id="niche"
            placeholder="Dentist, Gym, Plumber..."
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            disabled={isProcessing}
            className="bg-white/[0.03] border-white/[0.08] text-white placeholder-neutral-600 focus:border-white/20 transition-colors h-11"
          />
        </motion.div>

        <motion.div variants={fadeUp} className="space-y-2">
          <Label htmlFor="location" className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
            Location
          </Label>
          <Input
            id="location"
            placeholder="Austin, TX..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={isProcessing}
            className="bg-white/[0.03] border-white/[0.08] text-white placeholder-neutral-600 focus:border-white/20 transition-colors h-11"
          />
        </motion.div>

        <motion.div variants={fadeUp} className="space-y-2">
          <Label htmlFor="portfolio" className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
            Portfolio URL
          </Label>
          <Input
            id="portfolio"
            placeholder="https://yourportfolio.com"
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
            disabled={isProcessing}
            className="bg-white/[0.03] border-white/[0.08] text-white placeholder-neutral-600 focus:border-white/20 transition-colors h-11"
          />
          <p className="text-[10px] text-neutral-600 font-mono">
            Saved locally. Included in outreach emails.
          </p>
        </motion.div>

        <motion.div variants={fadeUp}>
          <motion.div whileTap={buttonTap}>
            <Button
              type="submit"
              disabled={!niche || !location || isProcessing}
              className="w-full bg-white text-black hover:bg-neutral-200 font-medium py-6 text-sm transition-all duration-200 rounded-lg"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Launch Campaign
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </motion.div>
        </motion.div>
      </form>
    </motion.div>
  );
}
