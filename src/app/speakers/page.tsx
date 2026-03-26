import type { Metadata } from 'next';
import { prefetchSpeakers } from '@/lib/prefetch';
import { siteConfig } from '@/config/site';
import { SEO_DEFAULTS } from '@/lib/seo-defaults';
import { SpeakersListClient } from '@/components/SpeakersListClient';
import type { NormalizedSpeaker } from '@/lib/api-types';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

export const metadata: Metadata = {
  title: `Speakers - ${SEO_DEFAULTS.siteName}`,
  description: 'Meet the leading voices at DeAI Summit 2026. Speakers from frontier AI, decentralized systems, policy, and academia.',
  openGraph: {
    title: `Speakers - ${SEO_DEFAULTS.siteName}`,
    description: 'Meet the leading voices at DeAI Summit 2026.',
    type: 'website',
    siteName: SEO_DEFAULTS.siteName,
  },
  twitter: {
    card: SEO_DEFAULTS.twitterCard,
    title: `Speakers - ${SEO_DEFAULTS.siteName}`,
    description: 'Meet the leading voices at DeAI Summit 2026.',
  },
  alternates: {
    canonical: `${BASE_URL}/speakers`,
  },
};

export default async function SpeakersPage() {
  let speakers: NormalizedSpeaker[] = [];

  try {
    speakers = await prefetchSpeakers();
  } catch (error) {
    console.error('Failed to fetch speakers:', error);
  }

  // Fallback to hardcoded data if API is unavailable
  if (speakers.length === 0) {
    speakers = siteConfig.speakers.leading.map((s, i) => ({
      id: String(i),
      name: s.name,
      slug: '',
      role: s.role,
      company: s.company,
      image: s.image,
      isFeatured: false,
    }));
  }

  return <SpeakersListClient speakers={speakers} />;
}
