import { NextResponse } from 'next/server';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

export async function GET() {
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /_next/',
    // Private ticket pages (secret token in the URL) and the "find my tickets" form.
    'Disallow: /tickets/t/',
    'Disallow: /tickets/order/',
    'Disallow: /tickets/l/',
    'Disallow: /tickets/w/',
    'Disallow: /tickets/me/',
    'Disallow: /tickets/lost',
    '',
    `Sitemap: ${BASE_URL}/sitemap.xml`,
    `Host: ${BASE_URL}`,
    '',
    '# AI content discovery',
    `LLMs-txt: ${BASE_URL}/llms.txt`,
  ].join('\n');

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
