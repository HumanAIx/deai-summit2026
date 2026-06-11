import type { MetadataRoute } from 'next';
import { buildPaginationPath, getListingPageCount } from '@/lib/paginationPaths';
import { prefetchSpeakers, prefetchTeam, prefetchSponsors, prefetchPartners, prefetchCompanies, prefetchVenues, prefetchBlogPosts } from '@/lib/prefetch';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

function buildListingPaginationPages(
  listingPath: string,
  itemCount: number,
  listing: 'speakers' | 'team',
  meta: {
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
    priority: number;
  },
): MetadataRoute.Sitemap {
  const totalPages = getListingPageCount(itemCount, listing);
  if (totalPages <= 1) return [];

  const pages: MetadataRoute.Sitemap = [];
  for (let page = 2; page <= totalPages; page++) {
    pages.push({
      url: `${BASE_URL}${buildPaginationPath(listingPath, page)}`,
      lastModified: new Date(),
      changeFrequency: meta.changeFrequency,
      priority: meta.priority,
    });
  }
  return pages;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all dynamic data in parallel
  const [speakers, teamMembers, sponsors, partners, companies, venues, blogPosts] = await Promise.all([
    prefetchSpeakers(),
    prefetchTeam(),
    prefetchSponsors(),
    prefetchPartners(),
    prefetchCompanies(),
    prefetchVenues(),
    prefetchBlogPosts(),
  ]);

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/speakers`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/team`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/partners`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/agenda`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/blog`, changeFrequency: 'weekly', priority: 0.8 },
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

  const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: post.seo?.canonical_url || `${BASE_URL}/blog/${post.slug}`,
    lastModified: post.last_updated ? new Date(post.last_updated) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const paginatedListingPages: MetadataRoute.Sitemap = [
    ...buildListingPaginationPages('/speakers', speakers.length, 'speakers', {
      changeFrequency: 'weekly',
      priority: 0.85,
    }),
    ...buildListingPaginationPages('/team', teamMembers.length, 'team', {
      changeFrequency: 'weekly',
      priority: 0.65,
    }),
  ];

  return [
    ...staticPages,
    ...paginatedListingPages,
    ...speakerPages,
    ...partnerPages,
    ...venuePages,
    ...companyPages,
    ...blogPages,
  ];
}
