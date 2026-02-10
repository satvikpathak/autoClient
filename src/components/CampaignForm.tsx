'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CampaignFormProps {
  onStart: (data: { niche: string; location: string; portfolioUrl: string }) => void;
  isProcessing: boolean;
}

export function CampaignForm({ onStart, isProcessing }: CampaignFormProps) {
  const [niche, setNiche] = useState('');
  const [location, setLocation] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');

  // Load portfolio URL from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('autoclient_portfolio');
    if (saved) setPortfolioUrl(saved);
  }, []);

  // Save portfolio URL to localStorage
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
    <Card className="bg-card/50 backdrop-blur border-primary/20">
      <CardHeader>
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
          🎯 New Campaign
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Find businesses with outdated websites and pitch your services
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="niche" className="text-sm font-medium">
              Business Niche
            </Label>
            <Input
              id="niche"
              placeholder="e.g., Dentist, Gym, Plumber, Restaurant..."
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              disabled={isProcessing}
              className="bg-background/50 border-primary/30 focus:border-green-500 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm font-medium">
              Location
            </Label>
            <Input
              id="location"
              placeholder="e.g., Austin, TX or New York, NY..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isProcessing}
              className="bg-background/50 border-primary/30 focus:border-green-500 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="portfolio" className="text-sm font-medium">
              Your Portfolio URL
            </Label>
            <Input
              id="portfolio"
              placeholder="https://yourportfolio.com"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              disabled={isProcessing}
              className="bg-background/50 border-primary/30 focus:border-green-500 transition-colors"
            />
            <p className="text-xs text-muted-foreground">
              Saved locally • Included in outreach emails
            </p>
          </div>

          <Button
            type="submit"
            disabled={!niche || !location || isProcessing}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-6 text-lg transition-all duration-300 hover:shadow-lg hover:shadow-green-500/25"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="animate-pulse">⚡</span>
                Processing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>🚀</span>
                Launch Campaign
              </span>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
