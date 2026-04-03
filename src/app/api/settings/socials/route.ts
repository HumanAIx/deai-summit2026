import { NextResponse } from 'next/server';

const EXTERNAL_API_URL = process.env.NEXT_PUBLIC_GCONF_API_URL || 'http://localhost:3000/api';
const API_KEY = process.env.NEXT_PUBLIC_GCONF_API_KEY || '';

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
