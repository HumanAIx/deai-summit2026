import { LandingPage } from '@/components/LandingPage';
import { prefetchHomePageData, prefetchNavigation, mapNavigationData } from '@/lib/prefetch';
import type { SocialLink } from '@/lib/prefetch';
import { siteConfig } from '@/config/site';
import { generateEventSchema } from '@/lib/structured-data';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

export default async function Home() {
  let speakers: Awaited<ReturnType<typeof prefetchHomePageData>>['speakers'] = [];
  let sponsors: Awaited<ReturnType<typeof prefetchHomePageData>>['sponsors'] = [];
  let partners: Awaited<ReturnType<typeof prefetchHomePageData>>['partners'] = [];
  let socials: SocialLink[] = [];

  const apiNav = await prefetchNavigation();
  const navigationData = apiNav ? mapNavigationData(apiNav) : undefined;

  try {
    const data = await prefetchHomePageData();
    speakers = data.speakers;
    sponsors = data.sponsors;
    partners = data.partners;
    socials = data.socials;
  } catch (error) {
    console.error('Failed to fetch home page data, using fallback:', error);
  }

  const eventSchema = generateEventSchema(BASE_URL);

  // Map API speakers to LeadingVoice format for the component
  const leadingSpeakers = speakers.length > 0
    ? speakers.map(s => ({
        name: s.name,
        slug: s.slug,
        role: s.role,
        company: s.company,
        image: s.image,
        icon: 'ri-user-line',
      }))
    : siteConfig.speakers.leading.map(s => ({ ...s, slug: '' }));

  // Map API sponsors to marquee format
  const marqueeItems = sponsors.length > 0
    ? sponsors.map(s => ({
        label: s.name,
        slug: s.slug,
        logo: s.logo,
      }))
    : siteConfig.marquee.map(m => ({ ...m, slug: '' }));

  // Map API partners to partner format
  const partnerItems = partners.length > 0
    ? partners.map(p => ({
        name: p.name,
        slug: p.slug,
        logo: p.logo,
        isSponsor: p.isSponsor,
        logoHasDarkBg: p.logoHasDarkBg,
      }))
    : siteConfig.partners.map(p => ({ ...p, slug: '', isSponsor: false }));

  return (
    <>
      {eventSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
        />
      )}
      <LandingPage
        speakers={leadingSpeakers}
        marqueeItems={marqueeItems}
        partnerItems={partnerItems}
        socials={socials}
        navigationData={navigationData}
        navigationAPIData={apiNav || undefined}
      />
    </>
  );
}
