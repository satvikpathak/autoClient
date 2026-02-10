import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface LeadWithStatus {
  status: string;
}

// GET /api/campaign/[id] - Get campaign with leads
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        leads: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Calculate stats
    const stats = {
      total: campaign.leads.length,
      discovered: campaign.leads.filter((l: LeadWithStatus) => l.status === 'DISCOVERED').length,
      scraping: campaign.leads.filter((l: LeadWithStatus) => l.status === 'SCRAPING').length,
      analyzing: campaign.leads.filter((l: LeadWithStatus) => l.status === 'ANALYZING').length,
      emailed: campaign.leads.filter((l: LeadWithStatus) => l.status === 'EMAILED').length,
      skipped: campaign.leads.filter((l: LeadWithStatus) => l.status === 'SKIPPED').length,
      failed: campaign.leads.filter((l: LeadWithStatus) => l.status === 'FAILED').length,
    };

    return NextResponse.json({ campaign, stats });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}

// PATCH /api/campaign/[id] - Update campaign status
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!['ACTIVE', 'COMPLETED', 'PAUSED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    );
  }
}
