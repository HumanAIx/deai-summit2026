import { NextResponse } from 'next/server';

const EXTERNAL_API_URL = process.env.NEXT_PUBLIC_GCONF_API_URL || 'http://localhost:3000/api';
// SECURITY: prefer server-only GCONF_API_KEY. NEXT_PUBLIC_* is inlined into the
// client bundle and must be rotated upstream. Fallback retained for migration.
const API_KEY = process.env.SITE_API_KEY || process.env.GCONF_API_KEY || process.env.NEXT_PUBLIC_GCONF_API_KEY || '';

export async function GET() {
  try {
    const response = await fetch(`${EXTERNAL_API_URL}/settings/public/socials`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return NextResponse.json({ success: false, data: [] }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Socials API proxy error:', error);
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}
