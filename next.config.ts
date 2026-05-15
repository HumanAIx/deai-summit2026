import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ],
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
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
