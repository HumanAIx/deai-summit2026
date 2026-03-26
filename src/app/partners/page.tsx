import type { Metadata } from 'next';
import { prefetchSponsors, prefetchPartners } from '@/lib/prefetch';
import { SEO_DEFAULTS } from '@/lib/seo-defaults';
import { PartnersListClient } from '@/components/PartnersListClient';
import type { NormalizedSponsor } from '@/lib/api-types';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

export const metadata: Metadata = {
  title: `Sponsors & Partners - ${SEO_DEFAULTS.siteName}`,
  description: 'Meet the sponsors and partners powering DeAI Summit 2026. Join leading organizations shaping the future of decentralized AI.',
  openGraph: {
    title: `Sponsors & Partners - ${SEO_DEFAULTS.siteName}`,
    description: 'Meet the sponsors and partners powering DeAI Summit 2026.',
    type: 'website',
    siteName: SEO_DEFAULTS.siteName,
  },
  twitter: {
    card: SEO_DEFAULTS.twitterCard,
    title: `Sponsors & Partners - ${SEO_DEFAULTS.siteName}`,
    description: 'Meet the sponsors and partners powering DeAI Summit 2026.',
  },
  alternates: {
    canonical: `${BASE_URL}/partners`,
  },
};

export default async function PartnersPage() {
  let sponsors: NormalizedSponsor[] = [];
  let partners: NormalizedSponsor[] = [];

  try {
    [sponsors, partners] = await Promise.all([
      prefetchSponsors(),
      prefetchPartners(),
    ]);
  } catch (error) {
    console.error('Failed to fetch partners data:', error);
  }

  // Separate partners that aren't already sponsors
  const sponsorIds = new Set(sponsors.map(s => s.id));
  const partnersOnly = partners.filter(p => !sponsorIds.has(p.id) && p.isPartner);

  return <PartnersListClient sponsors={sponsors} partners={partnersOnly} />;
}
