import type { NextConfig } from "next";

const isLocal =
  process.env.NEXT_PUBLIC_GCONF_API_URL?.includes('localhost') ||
  process.env.NEXT_PUBLIC_API_URL?.includes('localhost');

const nextConfig: NextConfig = {
  serverExternalPackages: ['sharp'],
  images: {
    // SECURITY NOTE: `hostname: '**'` accepts any HTTPS host and turns
    // /_next/image into a public open image proxy. Replace with an explicit
    // allow-list of the actual image hosts the site renders (Supabase storage,
    // CDN, etc.) — deferred here because removing entries blindly will break
    // production image rendering until every consumed host is enumerated.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      // Local Supabase serves over http on 127.0.0.1 — production always uses https,
      // so this only ever matches local dev.
      ...(isLocal ? [{
        protocol: 'http' as const,
        hostname: '127.0.0.1',
        port: '54321',
        pathname: '/storage/v1/object/public/**',
      }] : []),
    ],
    ...(isLocal && { unoptimized: true }),
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // microphone=(self) required for Bitpull voice widget (getUserMedia).
          // Empty microphone=() forces NotAllowedError even on HTTPS.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
