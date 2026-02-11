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

    // Deduplicate: find businesses already in the DB by placeId
    const allPlaceIds = businesses.map(b => b.placeId).filter(Boolean);
    const existingPlaceIds = new Set(
      (await prisma.lead.findMany({
        where: { placeId: { in: allPlaceIds } },
        select: { placeId: true },
      })).map(l => l.placeId)
    );

    const newBusinesses = businesses.filter(b => !existingPlaceIds.has(b.placeId));
    const duplicatesSkipped = businesses.length - newBusinesses.length;

    if (duplicatesSkipped > 0) {
      console.log(`Skipped ${duplicatesSkipped} duplicate businesses`);
    }

    // Split into businesses with and without websites
    const withWebsite = newBusinesses.filter(b => b.hasWebsite);
    const withoutWebsite = newBusinesses.filter(b => !b.hasWebsite);

    // Create leads for businesses with websites
    const websiteLeads = await prisma.lead.createMany({
      data: withWebsite.map(business => ({
        campaignId: campaign.id,
        businessName: business.name,
        placeId: business.placeId,
        websiteUrl: business.website,
        status: 'DISCOVERED' as const,
      })),
    });

    // Create leads for businesses without websites
    const noWebsiteLeads = await prisma.lead.createMany({
      data: withoutWebsite.map(business => ({
        campaignId: campaign.id,
        businessName: business.name,
        placeId: business.placeId,
        websiteUrl: null,
        phone: business.phone || null,
        googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${business.placeId}`,
        status: 'NO_WEBSITE' as const,
      })),
    });

    return NextResponse.json({
      campaign,
      leadsCreated: websiteLeads.count + noWebsiteLeads.count,
      websiteLeads: websiteLeads.count,
      noWebsiteLeads: noWebsiteLeads.count,
      duplicatesSkipped,
      message: `Campaign created with ${websiteLeads.count} website leads and ${noWebsiteLeads.count} no-website leads`,
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
