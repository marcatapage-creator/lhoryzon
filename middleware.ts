import NextAuth from "next-auth"
import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"
import { NextResponse } from "next/server"
import { rateLimit } from "./lib/rate-limit"
import { authConfig } from "./auth.config"

const { auth } = NextAuth(authConfig)
const intlMiddleware = createMiddleware(routing)

export default auth(async (req) => {
    const { pathname } = req.nextUrl

    // 1. Rate Limiting for Public/Auth API Routes
    if (pathname.startsWith('/api/auth') || pathname.startsWith('/api/billing')) {
        const ip = req.headers.get('x-forwarded-for') || 'unknown';

        // Strict limit for Auth (5 req/min), looser for billing (20 req/min)
        const limit = pathname.startsWith('/api/auth') ? 5 : 20;

        if (!rateLimit(ip, limit)) {
            return NextResponse.json(
                { error: "Too Many Requests" },
                { status: 429, headers: { 'Retry-After': '60' } }
            );
        }
    }

    // 2. Skip Intl for API routes
    if (pathname.startsWith('/api')) {
        return NextResponse.next();
    }

    // 3. Handle I18n for other routes
    const response = intlMiddleware(req)

    // 4. Add Content Security Policy headers
    const cspHeader = `
        default-src 'self';
        script-src 'self' 'unsafe-eval' 'unsafe-inline' https:;
        style-src 'self' 'unsafe-inline' https:;
        img-src 'self' blob: data: https:;
        font-src 'self' data: https:;
        connect-src 'self' https:;
        frame-src 'self' https:;
    `.replace(/\s{2,}/g, ' ').trim()

    response.headers.set('Content-Security-Policy', cspHeader)

    return response
})

export const config = {
    matcher: [
        '/',
        '/(fr|en)/:path*',
        '/api/auth/:path*',
        '/api/billing/:path*',
        '/((?!api|_next|_vercel|.*\\..*).*)'
    ]
}
