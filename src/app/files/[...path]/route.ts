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

function wantsJpeg(request: Request): boolean {
  const format = new URL(request.url).searchParams.get('format')?.toLowerCase();
  return format === 'jpeg' || format === 'jpg';
}

function wantsDownload(request: Request): boolean {
  const flag = new URL(request.url).searchParams.get('download')?.toLowerCase();
  return flag === '1' || flag === 'true' || flag === 'yes';
}

function attachmentFilename(segments: string[]): string {
  const raw = segments[segments.length - 1] || 'download';
  // Keep a conservative ASCII filename for the legacy `filename=` param.
  const safe = raw.replace(/[^\w.\-()+ ]+/g, '_').trim() || 'download';
  return safe;
}

function contentDispositionAttachment(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '') || 'download';
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  request: Request,
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

  // Next's data cache rejects anything over 2MB (logs a noisy error and falls
  // through uncached) — a HEAD probe lets us skip the cache attempt entirely
  // for large files instead of hitting that limit on every request.
  const DATA_CACHE_LIMIT_BYTES = 2 * 1024 * 1024;
  let isLarge = true;
  try {
    const head = await fetch(supabaseUrl, { method: 'HEAD' });
    const contentLength = head.headers.get('content-length');
    if (contentLength) {
      isLarge = Number(contentLength) > DATA_CACHE_LIMIT_BYTES;
    }
  } catch {
    // HEAD failed — assume large and skip the cache attempt; the GET below
    // still runs and reports its own failure if the file truly isn't reachable.
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      supabaseUrl,
      isLarge ? { cache: 'no-store' } : { next: { revalidate: 3600 } },
    );
  } catch (err) {
    console.error(`[files proxy] fetch failed for ${supabaseUrl}:`, err);
    return NextResponse.json({ error: 'Upstream storage request failed' }, { status: 502 });
  }

  if (!upstream.ok) {
    return new NextResponse('File not found', { status: upstream.status === 404 ? 404 : 502 });
  }

  const upstreamType = upstream.headers.get('content-type') || 'application/octet-stream';
  const upstreamBuffer = Buffer.from(await upstream.arrayBuffer());
  const download = wantsDownload(request);
  const baseHeaders: Record<string, string> = {
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  };
  if (download) {
    baseHeaders['Content-Disposition'] = contentDispositionAttachment(attachmentFilename(decoded));
  }

  // Telegram (and some other crawlers) fail to render WebP og:image previews.
  // Social metadata appends ?format=jpeg so we re-encode here.
  if (wantsJpeg(request)) {
    try {
      // Lazy import: sharp is a native-binary package. Loading it only when a
      // JPEG conversion is actually requested means a failure to load it
      // (e.g. a platform/runtime mismatch) is caught right here and falls
      // through to the original bytes below, instead of crashing every
      // request to this route before this branch is ever reached.
      const { default: sharp } = await import('sharp');
      const jpeg = await sharp(upstreamBuffer)
        .rotate()
        .resize({ width: 1200, height: 630, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();

      return new NextResponse(new Uint8Array(jpeg), {
        status: 200,
        headers: {
          ...baseHeaders,
          'Content-Type': 'image/jpeg',
          'Content-Length': String(jpeg.byteLength),
        },
      });
    } catch (err) {
      console.error('[files proxy] JPEG conversion failed:', err);
      // Fall through to original bytes rather than 500 the preview.
    }
  }

  return new NextResponse(new Uint8Array(upstreamBuffer), {
    status: 200,
    headers: {
      ...baseHeaders,
      'Content-Type': upstreamType,
      'Content-Length': String(upstreamBuffer.byteLength),
    },
  });
}
