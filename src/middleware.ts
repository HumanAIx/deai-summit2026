import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { legacyPrivateLinkRedirect, PATHNAME_HEADER } from '@/lib/tickets/tickets-route';
import { mayBeTicketPage, ticketPageRedirect } from '@/lib/tickets/pages-base';
import { loadTicketPagesBasePath } from '@/lib/tickets/pages-base-lookup';

export async function middleware(request: NextRequest) {
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

    // The legacy private link `/tickets?link={token}` keeps its secret in the query string, where the analytics gate
    // cannot see it: move it to `/tickets/l/{token}` before anything renders.
    const legacy = legacyPrivateLinkRedirect({ pathname, searchParams });
    if (legacy) {
        const response = NextResponse.redirect(new URL(legacy, request.url), 308);
        response.headers.set('Referrer-Policy', 'no-referrer');
        response.headers.set('Cache-Control', 'no-store');
        return response;
    }

    // The dashboard's "Ticket pages address" may name another path than /tickets (e.g. /buy): ticket emails then
    // link to /buy/t/{token} and so on. Send those to the canonical /tickets/… page. The address is looked up only
    // for paths shaped like a ticket page (cached; see loadTicketPagesBasePath), so other pages cost nothing.
    if (mayBeTicketPage(pathname)) {
        const target = ticketPageRedirect({ pathname, basePath: await loadTicketPagesBasePath() });
        if (target) {
            const url = new URL(target, request.url);
            url.search = request.nextUrl.search;
            const response = NextResponse.redirect(url, 308);
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
    ],
};
