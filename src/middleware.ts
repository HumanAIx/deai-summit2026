import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ticketsCheckoutEnabled } from '@/lib/tickets/feature-flag';
import { legacyPrivateLinkRedirect, PATHNAME_HEADER } from '@/lib/tickets/tickets-route';

/** Everything the live ticket checkout added: the token pages under `/tickets/*` and the `/api/tickets/*` handlers. */
function isTicketsCheckoutRoute(pathname: string): boolean {
    return pathname.startsWith('/tickets/') || pathname.startsWith('/api/tickets/') || pathname === '/api/captcha-site-key';
}

function ticketsNotFound(request: NextRequest): NextResponse {
    if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json(
            { success: false, error: 'Request failed. Please try again.', code: 'notFound' },
            { status: 404, headers: { 'Cache-Control': 'no-store' } },
        );
    }
    // No route has two segments under `/_tickets-off`, so Next answers its own 404 page without any API call.
    return NextResponse.rewrite(new URL('/_tickets-off/not-found', request.url));
}

export function middleware(request: NextRequest) {
    const { pathname, searchParams } = request.nextUrl;

    // Check for a secret bypass query parameter or cookie
    // Format: ?preview=secret_preview_mode
    // If validation passes, set a cookie to persist the session
    if (searchParams.get('preview') === 'secret_preview_mode') {
        const response = NextResponse.redirect(new URL('/', request.url));
        response.cookies.set('preview_mode', 'true');
        return response;
    }

    // If it's the home page and not in preview mode, rewrite to coming soon
    // const isPreview = request.cookies.get('preview_mode')?.value === 'true';
    // if (pathname === '/' && !isPreview) {
    //     return NextResponse.rewrite(new URL('/coming-soon', request.url));
    // }

    // Tickets checkout off: the new ticket routes do not exist (the Luma `/tickets` page itself stays).
    if (isTicketsCheckoutRoute(pathname) && !ticketsCheckoutEnabled()) {
        return ticketsNotFound(request);
    }

    // The legacy private link `/tickets?link={token}` keeps its secret in the query string, where the analytics gate
    // cannot see it: move it to `/tickets/l/{token}` before anything renders.
    if (ticketsCheckoutEnabled()) {
        const legacy = legacyPrivateLinkRedirect({ pathname, searchParams });
        if (legacy) {
            const response = NextResponse.redirect(new URL(legacy, request.url), 308);
            response.headers.set('Referrer-Policy', 'no-referrer');
            response.headers.set('Cache-Control', 'no-store');
            return response;
        }
    }

    // Forwarded to the root layout, which turns analytics off on private ticket pages (their URL holds a secret).
    const headers = new Headers(request.headers);
    headers.set(PATHNAME_HEADER, pathname);
    return NextResponse.next({ request: { headers } });
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
        '/api/tickets/:path*',
        '/api/captcha-site-key',
    ],
};
