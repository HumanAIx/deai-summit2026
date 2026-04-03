import { NextResponse } from 'next/server';

const EXTERNAL_API_URL = process.env.NEXT_PUBLIC_GCONF_API_URL || 'http://localhost:3000/api';
const API_KEY = process.env.NEXT_PUBLIC_GCONF_API_KEY || '';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type'); // 'sponsors', 'supporters', 'venues'

    let endpoint = '/companies';
    if (id) {
      endpoint = `/companies/${id}`;
    } else if (type) {
      endpoint = `/companies/${type}`;
    }

    const response = await fetch(`${EXTERNAL_API_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      next: { revalidate: 300 },
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
