import { NextResponse } from 'next/server';
import { prefetchSpeakers, prefetchSponsors, prefetchPartners, prefetchCompanies, prefetchVenues } from '@/lib/prefetch';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').replace(/[#*_`>\[\]()]/g, '').replace(/\s+/g, ' ').trim();
}

export async function GET() {
  const [speakers, sponsors, partners, companies, venues] = await Promise.all([
    prefetchSpeakers(),
    prefetchSponsors(),
    prefetchPartners(),
    prefetchCompanies(),
    prefetchVenues(),
  ]);

  const lines: string[] = [];

  // Header
  lines.push('# DeAI Summit 2026');
  lines.push('');
  lines.push('> The Global Inflection Point for AI Governance. Where frontier AI, decentralized systems, and global regulators confront the future of intelligence. Is-Siġġiewi, Malta — 28-30 October 2026.');
  lines.push('');

  // Key Pages
  lines.push('## Key Pages');
  lines.push('');
  lines.push(`- [Home](${BASE_URL}): Main landing page`);
  lines.push(`- [Speakers](${BASE_URL}/speakers): All confirmed speakers`);
  lines.push(`- [Partners](${BASE_URL}/partners): Sponsors and partners`);
  lines.push(`- [Agenda](${BASE_URL}/agenda): Event programme and formats`);
  lines.push(`- [Terms](${BASE_URL}/terms): Terms and conditions`);
  lines.push(`- [Privacy](${BASE_URL}/privacy): Privacy policy`);
  lines.push('');

  // Event Info
  lines.push('## Event Details');
  lines.push('');
  lines.push('- **Name:** DeAI Summit 2026');
  lines.push('- **Date:** 28-30 October 2026');
  lines.push('- **Venue:** Monte Kristo Estate, Is-Siġġiewi, Malta');
  lines.push('- **Organizer:** HumanAIx Foundation');
  lines.push('- **Website:** https://deaisummit.org');
  lines.push('');

  // Speakers
  if (speakers.length > 0) {
    lines.push('## Speakers');
    lines.push('');
    for (const s of speakers.slice(0, 30)) {
      const desc = [s.role, s.company].filter(Boolean).join(', ');
      lines.push(`- [${s.name}](${BASE_URL}/speakers/${s.slug})${desc ? `: ${desc}` : ''}`);
    }
    if (speakers.length > 30) {
      lines.push(`- ... and ${speakers.length - 30} more speakers at [${BASE_URL}/speakers](${BASE_URL}/speakers)`);
    }
    lines.push('');
  }

  // Sponsors
  if (sponsors.length > 0) {
    lines.push('## Sponsors');
    lines.push('');
    for (const s of sponsors.slice(0, 20)) {
      const bio = s.bio ? `: ${stripHtml(s.bio).slice(0, 100)}` : '';
      lines.push(`- [${s.name}](${BASE_URL}/partners/${s.slug})${bio}`);
    }
    lines.push('');
  }

  // Partners
  const sponsorIds = new Set(sponsors.map(s => s.id));
  const partnersOnly = partners.filter(p => !sponsorIds.has(p.id));
  if (partnersOnly.length > 0) {
    lines.push('## Partners');
    lines.push('');
    for (const p of partnersOnly.slice(0, 20)) {
      const bio = p.bio ? `: ${stripHtml(p.bio).slice(0, 100)}` : '';
      lines.push(`- [${p.name}](${BASE_URL}/partners/${p.slug})${bio}`);
    }
    lines.push('');
  }

  // Venues
  if (venues.length > 0) {
    lines.push('## Venues');
    lines.push('');
    for (const v of venues) {
      const bio = v.company_bio ? `: ${stripHtml(v.company_bio).slice(0, 100)}` : '';
      const location = [v.company_city, v.company_country === 'MT' ? 'Malta' : v.company_country].filter(Boolean).join(', ');
      lines.push(`- [${v.company_name}](${BASE_URL}/venues/${v.company_slug})${location ? ` (${location})` : ''}${bio}`);
    }
    lines.push('');
  }

  // Companies
  const venueIds = new Set(venues.map(v => v.id));
  const partnerIds = new Set([...sponsors.map(s => s.id), ...partners.map(p => p.id), ...venueIds]);
  const otherCompanies = companies.filter(c => !partnerIds.has(c.id));
  if (otherCompanies.length > 0) {
    lines.push('## Companies');
    lines.push('');
    for (const c of otherCompanies.slice(0, 20)) {
      const bio = c.company_bio ? `: ${stripHtml(c.company_bio).slice(0, 100)}` : '';
      lines.push(`- [${c.company_name}](${BASE_URL}/companies/${c.company_slug})${bio}`);
    }
    lines.push('');
  }

  // Contact
  lines.push('## Contact');
  lines.push('');
  lines.push('- Email: contact@deaisummit.org');
  lines.push('- LinkedIn: https://www.linkedin.com/company/deai-summit');
  lines.push('');

  // Footer
  lines.push('---');
  lines.push('');
  lines.push(`> Generated from [DeAI Summit](${BASE_URL}). For full sitemap see [sitemap.xml](${BASE_URL}/sitemap.xml).`);

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
