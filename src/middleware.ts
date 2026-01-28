import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Check for a secret bypass query parameter or cookie
    // Format: ?preview=secret_preview_mode
    const isPreview = request.nextUrl.searchParams.get('preview') === 'secret_preview_mode' ||
        request.cookies.get('preview_mode')?.value === 'true';

    // If validation passes, set a cookie to persist the session
    if (request.nextUrl.searchParams.get('preview') === 'secret_preview_mode') {
        const response = NextResponse.redirect(new URL('/', request.url));
        response.cookies.set('preview_mode', 'true');
        return response;
    }

    // Define paths to exclude from rewriting (api, static files, etc)
    const isExcluded =
        request.nextUrl.pathname.startsWith('/api') ||
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.startsWith('/static') ||
        request.nextUrl.pathname.includes('.'); // File extensions

    // If it's the home page and not in preview mode, rewrite to coming soon
    if (request.nextUrl.pathname === '/' && !isPreview && !isExcluded) {
        return NextResponse.rewrite(new URL('/coming-soon', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
