import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { searchBusinesses } from '@/lib/places';

// GET /api/campaign - List all campaigns
export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { leads: true },
        },
      },
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

// POST /api/campaign - Create a new campaign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { niche, location } = body;

    if (!niche || !location) {
      return NextResponse.json(
        { error: 'Niche and location are required' },
        { status: 400 }
      );
    }

    // Create campaign in database
    const campaign = await prisma.campaign.create({
      data: {
        niche,
        location,
        status: 'ACTIVE',
      },
    });

    // Search for businesses using Google Places API
    const businesses = await searchBusinesses(niche, location);

    // Create leads for each business found
    const leads = await prisma.lead.createMany({
      data: businesses.map(business => ({
        campaignId: campaign.id,
        businessName: business.name,
        websiteUrl: business.website,
        status: 'DISCOVERED',
      })),
    });

    return NextResponse.json({
      campaign,
      leadsCreated: leads.count,
      message: `Campaign created with ${leads.count} leads discovered`,
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
