import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/leads - Get leads with pagination and optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get('pageSize') || '50', 10)));

    const where: Record<string, unknown> = {};

    if (campaignId) {
      where.campaignId = campaignId;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    // Run paginated query and total count in parallel
    const [leads, totalCount] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          campaign: {
            select: {
              niche: true,
              location: true,
            },
          },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    // Build stats from groupBy (counts across ALL leads, not just current page)
    const statsWhere: Record<string, unknown> = {};
    if (campaignId) {
      statsWhere.campaignId = campaignId;
    }

    const [statusCounts, scoreAgg] = await Promise.all([
      prisma.lead.groupBy({
        by: ['status'],
        _count: true,
        where: statsWhere,
      }),
      prisma.lead.aggregate({
        _avg: { auditScore: true },
        where: { ...statsWhere, auditScore: { not: null } },
      }),
    ]);

    const statsMap: Record<string, number> = {};
    let total = 0;
    for (const entry of statusCounts) {
      statsMap[entry.status] = entry._count;
      total += entry._count;
    }

    const stats = {
      total,
      emailed: statsMap['EMAILED'] || 0,
      skipped: statsMap['SKIPPED'] || 0,
      failed: statsMap['FAILED'] || 0,
      noWebsite: statsMap['NO_WEBSITE'] || 0,
      avgScore: scoreAgg._avg.auditScore
        ? Math.round(scoreAgg._avg.auditScore * 10) / 10
        : 0,
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    return NextResponse.json({
      leads,
      stats,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}
