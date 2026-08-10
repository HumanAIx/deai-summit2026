import { NextResponse } from 'next/server';

const EXTERNAL_API_URL = process.env.NEXT_PUBLIC_GCONF_API_URL || 'http://localhost:3000/api';
// SECURITY: prefer server-only GCONF_API_KEY. NEXT_PUBLIC_* is inlined into the
// client bundle and must be rotated upstream. Fallback retained for migration.
const API_KEY = process.env.GCONF_SITE_KEY || process.env.GCONF_API_KEY || process.env.NEXT_PUBLIC_GCONF_API_KEY || '';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type'); // 'sponsors', 'supporters', 'venues'

    let endpoint = '/companies';
    // List/search probes (publish checks) and detail lookups must reflect toggles immediately.
    let cacheMode: RequestCache | undefined;
    if (id) {
      endpoint = `/companies/${id}`;
      cacheMode = 'no-store';
    } else if (type) {
      endpoint = `/companies/${type}`;
      cacheMode = type === 'venues' ? 'no-store' : undefined;
    } else {
      // Forward list query params (search, limit, visibility, …).
      const forwarded = new URLSearchParams(searchParams);
      forwarded.delete('id');
      forwarded.delete('type');
      const qs = forwarded.toString();
      endpoint = qs ? `/companies?${qs}` : '/companies';
      cacheMode = 'no-store';
    }

    const response = await fetch(`${EXTERNAL_API_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      ...(cacheMode
        ? { cache: cacheMode }
        : { next: { revalidate: 300 } }),
    });

    if (!response.ok) {
      return NextResponse.json({ success: false, data: null }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Companies API proxy error:', error);
    return NextResponse.json({ success: false, data: null }, { status: 500 });
  }
}
