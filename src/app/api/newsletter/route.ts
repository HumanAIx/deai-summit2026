import { NextResponse } from 'next/server';

const EXTERNAL_API_URL = process.env.NEXT_PUBLIC_GCONF_API_URL || '';
// SECURITY: prefer server-only GCONF_API_KEY. NEXT_PUBLIC_* is inlined into the
// client bundle and must be rotated upstream. Fallback retained for migration.
const API_KEY = process.env.SITE_API_KEY || process.env.GCONF_API_KEY || process.env.NEXT_PUBLIC_GCONF_API_KEY || '';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: 'Invalid email format' }, { status: 400 });
    }

    const response = await fetch(`${EXTERNAL_API_URL}/forms/newsletter/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ submission_data: { field_1: email } }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to subscribe' },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      message: data.message || 'Successfully subscribed!',
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
