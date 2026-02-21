/**
 * Aircraft Image Search API Route
 *
 * GET /api/aircraft/images?model=Gulfstream+G650&category=heavy_jet&year=2023
 *
 * Returns cached or web-searched aircraft images for the given model.
 * Rate limited to 10 requests per minute per IP.
 *
 * @see lib/aircraft/image-search-service.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAircraftImages } from '@/lib/aircraft/image-search-service';

// Force dynamic rendering - API routes should not be statically generated
export const dynamic = 'force-dynamic';

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again in 1 minute.' },
        { status: 429 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const model = searchParams.get('model');
    const category = searchParams.get('category') || undefined;
    const yearStr = searchParams.get('year');
    const year = yearStr ? parseInt(yearStr, 10) : undefined;

    if (!model || model.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing required query parameter: model' },
        { status: 400 }
      );
    }

    const gallery = await getAircraftImages(model, category, year);

    return NextResponse.json(gallery, {
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (err) {
    console.error('[API /aircraft/images] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch aircraft images' },
      { status: 500 }
    );
  }
}
