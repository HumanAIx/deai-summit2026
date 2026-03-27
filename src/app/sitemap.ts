import type { MetadataRoute } from 'next';
import { prefetchSpeakers, prefetchSponsors, prefetchPartners, prefetchCompanies, prefetchVenues } from '@/lib/prefetch';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all dynamic data in parallel
  const [speakers, sponsors, partners, companies, venues] = await Promise.all([
    prefetchSpeakers(),
    prefetchSponsors(),
    prefetchPartners(),
    prefetchCompanies(),
    prefetchVenues(),
  ]);

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/speakers`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/partners`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/agenda`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/terms`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/privacy`, changeFrequency: 'monthly', priority: 0.3 },
  ];

  // Speaker detail pages
  const speakerPages: MetadataRoute.Sitemap = speakers.map((speaker) => ({
    url: `${BASE_URL}/speakers/${speaker.slug}`,
    changeFrequency: 'weekly' as const,
    priority: speaker.isFeatured ? 0.8 : 0.7,
  }));

  // Partner/sponsor detail pages
  const sponsorIds = new Set(sponsors.map(s => s.id));
  const partnerPages: MetadataRoute.Sitemap = [
    ...sponsors.map((sponsor) => ({
      url: `${BASE_URL}/partners/${sponsor.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...partners
      .filter(p => !sponsorIds.has(p.id))
      .map((partner) => ({
        url: `${BASE_URL}/partners/${partner.slug}`,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })),
  ];

  // Venue detail pages
  const venueIds = new Set(venues.map(v => v.id));
  const venuePages: MetadataRoute.Sitemap = venues.map((venue) => ({
    url: `${BASE_URL}/venues/${venue.company_slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  // Company detail pages (non-sponsor, non-partner, non-venue companies)
  const excludeIds = new Set([...sponsors.map(s => s.id), ...partners.map(p => p.id), ...venueIds]);
  const companyPages: MetadataRoute.Sitemap = companies
    .filter(c => !excludeIds.has(c.id))
    .map((company) => ({
      url: `${BASE_URL}/companies/${company.company_slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }));

  return [
    ...staticPages,
    ...speakerPages,
    ...partnerPages,
    ...venuePages,
    ...companyPages,
  ];
}
