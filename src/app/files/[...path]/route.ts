import { NextResponse } from 'next/server';

const TENANT_SLUG = process.env.TENANT_SLUG || 'deaisummit';
const STORAGE_BUCKET = 'tenants';
const STORAGE_HOST =
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_HOST ||
  process.env.SUPABASE_STORAGE_HOST ||
  '';

function isSafeSegment(segment: string): boolean {
  if (!segment) return false;
  try {
    const decoded = decodeURIComponent(segment);
    return !decoded.includes('/') && decoded !== '..' && decoded !== '.';
  } catch {
    return false;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;

  if (!STORAGE_HOST) {
    return NextResponse.json({ error: 'Storage host not configured' }, { status: 503 });
  }

  if (!segments?.length || !segments.every(isSafeSegment)) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
  }

  const decoded = segments.map(s => decodeURIComponent(s));
  const storagePath = `${TENANT_SLUG}/${decoded.join('/')}`;
  const supabaseUrl = `https://${STORAGE_HOST}/storage/v1/object/public/${STORAGE_BUCKET}/${storagePath.split('/').map(encodeURIComponent).join('/')}`;

  const upstream = await fetch(supabaseUrl, { next: { revalidate: 3600 } });

  if (!upstream.ok) {
    return new NextResponse('File not found', { status: upstream.status === 404 ? 404 : 502 });
  }

  const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
  const buffer = await upstream.arrayBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
