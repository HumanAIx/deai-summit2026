import { NextResponse } from 'next/server';

const TENANT_SLUG = process.env.TENANT_SLUG || 'deaisummit';
const STORAGE_BUCKET = 'tenants';
// Strip an accidental scheme/trailing slash (e.g. if the env var was set to
// "https://host.supabase.co/") so we don't build a malformed "https://https://..." URL.
const STORAGE_HOST = (
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_HOST ||
  process.env.SUPABASE_STORAGE_HOST ||
  ''
)
  .trim()
  .replace(/^https?:\/\//i, '')
  .replace(/\/+$/, '');

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

  let upstream: Response;
  try {
    upstream = await fetch(supabaseUrl, { next: { revalidate: 3600 } });
  } catch (err) {
    console.error(`[files proxy] fetch failed for ${supabaseUrl}:`, err);
    return NextResponse.json({ error: 'Upstream storage request failed' }, { status: 502 });
  }

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
