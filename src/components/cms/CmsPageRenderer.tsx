'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLayoutEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AnimatedGrid } from '@/components/AnimatedGrid';
import { DownloadDialog } from '@/components/DownloadDialog';
import { getCompanyPublicPath } from '@/lib/company-public-path';
import { blockListType, blockMarkdownBody, documentDisplayTitle, formatDocumentPageCount, formatDocumentSize, isCompaniesListBlock, isDocumentsListBlock, isMembersListBlock, resolveBlockDocuments, resolveDocumentsGateForm } from '@/lib/cmsBlocks';
import { youtubeToEmbed } from '@/lib/utils';
import type {
  CMSBlock,
  CMSButton,
  CMSCompanyItem,
  CMSDocument,
  CMSFormConfig,
  CMSSpeakerItem,
  Company,
} from '@/lib/api-types';

type CaptchaProps = {
  captchaSiteKey?: string;
  captchaDisabled?: boolean;
  captchaProvider?: string;
};
const CARD_COLORS = ['#00B0C2', '#0E6FEB', '#050A1F', '#00B0C2', '#0E6FEB', '#050A1F'];

function highlightTitle(text: string): string {
  if (text.includes('**')) {
    return text.replace(/\*\*(.+?)\*\*/g, '<span class="text-brand-cyan">$1</span>');
  }
  return text.replace(/(DeAI Summit)/gi, '<span class="text-brand-cyan">$1</span>');
}

function buttonHref(button: CMSButton): string {
  if (button.link) return button.link;
  if (button.action === 'form') return '/contact';
  return '#';
}

function CtaButtons({ buttons }: { buttons?: CMSButton[] }) {
  if (!buttons?.length) return null;
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
      {buttons.map((btn, i) => (
        <Link
          key={`${btn.label}-${i}`}
          href={buttonHref(btn)}
          className={
            i === 0
              ? 'px-8 py-3 rounded-full border border-white bg-white text-[#050A1F] hover:bg-brand-cyan hover:text-white hover:border-brand-cyan transition-all duration-300 text-sm font-bold no-underline'
              : 'px-8 py-3 rounded-full border border-white/30 text-white hover:bg-white/10 transition-all duration-300 text-sm font-bold no-underline'
          }
        >
          {btn.label}
        </Link>
      ))}
    </div>
  );
}

function HeroSection({ block }: { block: CMSBlock }) {
  const title = block.title || 'DeAI Summit 2026';
  const badge = (block.subtitle as string) || (block.badge as string) || '';
  const subtitle =
    (typeof block.description === 'string' && block.description) ||
    blockMarkdownBody(block) ||
    '';

  return (
    <section className="relative bg-[#050A1F] text-white pt-16 pb-16">
      <div className="absolute inset-0 pointer-events-none animated-grid">
        <AnimatedGrid />
      </div>
      <div className="relative z-10 max-w-[1440px] mx-auto px-6 text-center">
        {badge ? (
          <p className="text-brand-cyan text-sm font-mono uppercase tracking-widest mb-4">{badge}</p>
        ) : null}
        <h1
          className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.1] mb-6"
          dangerouslySetInnerHTML={{ __html: highlightTitle(title) }}
        />
        {subtitle ? (
          <div className="text-white/60 text-lg max-w-2xl mx-auto mb-10 prose prose-invert prose-p:my-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{subtitle}</ReactMarkdown>
          </div>
        ) : null}
        <CtaButtons buttons={block.buttons} />
      </div>
    </section>
  );
}

function ContentSection({ block, dark = false }: { block: CMSBlock; dark?: boolean }) {
  const title = block.title?.trim();
  const subtitle = typeof block.subtitle === 'string' ? block.subtitle.trim() : '';
  const body = blockMarkdownBody(block);
  const collectionItems = Array.isArray(block.collectionItems)
    ? (block.collectionItems as Array<{ id?: string; title?: string; text?: string; description?: string }>)
    : [];

  return (
    <section className={dark ? 'bg-[#050A1F] text-white py-16' : 'bg-[#F0F0EF] py-16'}>
      <div className="max-w-4xl mx-auto px-6">
        {title ? (
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-1 h-8 rounded-full ${dark ? 'bg-brand-cyan' : 'bg-brand-cyan'}`} />
            <h2 className={`text-2xl md:text-3xl font-display font-bold ${dark ? 'text-white' : 'text-[#050A1F]'}`}>
              {title}
            </h2>
          </div>
        ) : null}
        {subtitle ? (
          <p className={`mb-6 ${dark ? 'text-white/60' : 'text-slate-600'}`}>{subtitle}</p>
        ) : null}
        {body ? (
          <div className={`legal-prose max-w-none mb-8 ${dark ? 'prose-invert' : ''}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
          </div>
        ) : null}
        {collectionItems.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            {collectionItems.map((item, i) => (
              <div
                key={item.id || i}
                className={`rounded-2xl p-5 border ${dark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}
              >
                {item.title ? (
                  <h3 className={`font-display font-bold mb-2 ${dark ? 'text-white' : 'text-[#050A1F]'}`}>
                    {item.title}
                  </h3>
                ) : null}
                <p className={dark ? 'text-white/70 text-sm' : 'text-slate-600 text-sm'}>
                  {item.description || item.text || ''}
                </p>
              </div>
            ))}
          </div>
        ) : null}
        {block.buttons?.length ? (
          <div className={dark ? '' : '[&_a:first-child]:bg-[#050A1F] [&_a:first-child]:text-white [&_a:first-child]:border-[#050A1F]'}>
            <CtaButtons buttons={block.buttons} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CtaSection({ block }: { block: CMSBlock }) {
  return (
    <section className="bg-[#050A1F] py-16">
      <div className="max-w-3xl mx-auto px-6 text-center">
        {block.title ? (
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-4">{block.title}</h2>
        ) : null}
        {(() => {
          const blurb =
            (typeof block.subtitle === 'string' && block.subtitle) ||
            (typeof block.description === 'string' && block.description) ||
            '';
          return blurb ? <p className="text-white/60 mb-8">{blurb}</p> : null;
        })()}
        <CtaButtons buttons={block.buttons} />
      </div>
    </section>
  );
}

function companyCardHref(item: CMSCompanyItem, listType?: string): string {
  const asCompany = {
    company_slug: item.company_slug,
    company_is_sponsor: item.company_is_sponsor,
    sponsor_published: item.sponsor_published,
    company_is_partner: item.company_is_partner,
    partner_published: item.partner_published,
    company_is_affiliated_hotel: item.company_is_affiliated_hotel,
    affiliated_hotel_published: item.affiliated_hotel_published,
    company_is_venue: item.company_is_venue,
    venue_published: item.venue_published,
  } as Company;

  const preferred = getCompanyPublicPath(asCompany);
  if (preferred.startsWith('/sponsors/') || preferred.startsWith('/partners/') || preferred.startsWith('/partner-hotels/') || preferred.startsWith('/venues/')) {
    return preferred;
  }

  switch (listType) {
    case 'all-sponsors':
      return `/sponsors/${item.company_slug}`;
    case 'all-partners':
      return `/partners/${item.company_slug}`;
    case 'all-affiliated-hotels':
      return `/partner-hotels/${item.company_slug}`;
    case 'all-venues':
      return `/venues/${item.company_slug}`;
    default:
      return `/companies/${item.company_slug}`;
  }
}

function filterCompanyItems(items: CMSCompanyItem[], listType?: string): CMSCompanyItem[] {
  return items.filter((i) => {
    if (i.company_published === false) return false;
    switch (listType) {
      case 'all-sponsors':
        return i.company_is_sponsor === true && i.sponsor_published !== false;
      case 'all-partners':
        return i.company_is_partner === true && i.partner_published !== false;
      case 'all-venues':
        return i.company_is_venue === true && i.venue_published !== false;
      case 'all-affiliated-hotels':
        return i.company_is_affiliated_hotel === true && i.affiliated_hotel_published !== false;
      case 'all-organizers':
        return i.company_is_organizer === true && i.organizer_published !== false;
      default:
        return true;
    }
  });
}

function CompaniesGridSection({ block }: { block: CMSBlock }) {
  const listType = blockListType(block);
  const rawItems = (block.items as unknown as CMSCompanyItem[] | undefined) || [];
  const items = filterCompanyItems(rawItems, listType);
  const title = block.title || sectionTitleForCompanies(listType);

  return (
    <section className="bg-[#F0F0EF] py-16">
      <div className="max-w-[1440px] mx-auto px-6">
        {title ? (
          <div className="flex items-center gap-4 mb-10">
            <div className="w-1 h-8 bg-brand-cyan rounded-full" />
            <h2 className="text-2xl md:text-3xl font-display font-bold text-[#050A1F]">{title}</h2>
          </div>
        ) : null}
        {items.length === 0 ? (
          <p className="text-slate-500 text-center">Nothing published in this list yet.</p>
        ) : (
          <div className="flex flex-wrap justify-center gap-6">
            {items.map((item, index) => {
              const bg = CARD_COLORS[index % CARD_COLORS.length];
              const href = item.company_slug ? companyCardHref(item, listType) : '#';
              return (
                <Link
                  key={item.id}
                  href={href}
                  className="group block w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] xl:w-[calc(25%-18px)] overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl no-underline bg-white border border-gray-200"
                >
                  <div className="relative h-[200px] overflow-hidden bg-[#050A1F]">
                    {item.company_logo || item.venue_photo || item.company_thumbnail ? (
                      <Image
                        src={item.venue_photo || item.company_thumbnail || item.company_logo || ''}
                        alt={item.company_name}
                        fill
                        sizes="280px"
                        className={
                          listType === 'all-affiliated-hotels' || listType === 'all-venues'
                            ? 'object-cover'
                            : 'object-contain p-8 bg-white'
                        }
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-gray-300 font-display font-bold">
                        {item.company_name}
                      </span>
                    )}
                  </div>
                  <div className="p-5 h-[130px] flex flex-col justify-between" style={{ backgroundColor: bg }}>
                    <h3 className="text-white text-base font-display font-extrabold leading-tight group-hover:underline">
                      {item.company_name}
                    </h3>
                    <div className="text-white/60 text-xs font-bold font-mono uppercase tracking-widest group-hover:text-white">
                      View Details →
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function sectionTitleForCompanies(listType?: string): string {
  switch (listType) {
    case 'all-sponsors':
      return 'Sponsors';
    case 'all-partners':
      return 'Partners';
    case 'all-venues':
      return 'Venues';
    case 'all-affiliated-hotels':
      return 'Partner Hotels';
    case 'all-affiliated-restaurants':
      return 'Restaurants';
    case 'all-supporters':
      return 'Supporters';
    case 'all-organizers':
      return 'Organizers';
    default:
      return 'Companies';
  }
}

function memberHref(item: CMSSpeakerItem, listType?: string): string {
  const slug = item.person_slug;
  if (!slug) return '#';
  if (listType === 'all-team-members') return `/team/${slug}`;
  if (listType === 'all-speakers' || listType === 'all-speakers-nobg') return `/speakers/${slug}`;
  if (item.is_speaker) return `/speakers/${slug}`;
  if (item.is_team_member) return `/team/${slug}`;
  return `/speakers/${slug}`;
}

function MembersGridSection({ block }: { block: CMSBlock }) {
  const listType = blockListType(block);
  const items = ((block.items as unknown as CMSSpeakerItem[] | undefined) || []).filter(
    (m) => m.is_published !== false,
  );
  const title =
    block.title ||
    (listType === 'all-team-members'
      ? 'Team'
      : listType === 'all-speakers' || listType === 'all-speakers-nobg'
        ? 'Speakers'
        : 'People');

  return (
    <section className="bg-[#F0F0EF] py-16">
      <div className="max-w-[1440px] mx-auto px-6">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-1 h-8 bg-brand-blue rounded-full" />
          <h2 className="text-2xl md:text-3xl font-display font-bold text-[#050A1F]">{title}</h2>
        </div>
        {items.length === 0 ? (
          <p className="text-slate-500 text-center">No people published in this list yet.</p>
        ) : (
          <div className="flex flex-wrap justify-center gap-6">
            {items.map((person, index) => {
              const name = [person.person_firstname, person.person_surname].filter(Boolean).join(' ');
              const photo = person.person_photo_nobg || person.person_photo;
              const bg = CARD_COLORS[index % CARD_COLORS.length];
              return (
                <Link
                  key={person.id}
                  href={memberHref(person, listType)}
                  className="group block w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] xl:w-[calc(25%-18px)] overflow-hidden rounded-2xl no-underline bg-white border border-gray-200 hover:shadow-xl transition-all"
                >
                  <div className="relative h-[220px] bg-[#050A1F]">
                    {photo ? (
                      <Image src={photo} alt={name} fill sizes="280px" className="object-cover object-top" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-white/40 font-display text-3xl font-bold">
                        {name.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <div className="p-5" style={{ backgroundColor: bg }}>
                    <h3 className="text-white font-display font-extrabold">{name}</h3>
                    {person.person_title ? (
                      <p className="text-white/70 text-xs mt-1 line-clamp-2">{person.person_title}</p>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function YouTubeSection({ block }: { block: CMSBlock }) {
  const url =
    (typeof block.youtubeUrl === 'string' && block.youtubeUrl) ||
    (typeof (block as { videoUrl?: string }).videoUrl === 'string' &&
      (block as { videoUrl?: string }).videoUrl) ||
    '';
  const embed = url ? youtubeToEmbed(url) : null;
  if (!embed) return <ContentSection block={block} />;

  return (
    <section className="bg-white py-16 border-t border-gray-100">
      <div className="max-w-4xl mx-auto px-6">
        {block.title ? (
          <div className="flex items-center gap-4 mb-10">
            <div className="w-1 h-8 bg-red-500 rounded-full" />
            <h2 className="text-2xl md:text-3xl font-display font-bold text-[#050A1F]">{block.title}</h2>
          </div>
        ) : null}
        <div className="aspect-video rounded-2xl overflow-hidden shadow-xl">
          <iframe
            src={embed}
            title={block.title || 'Video'}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}

function LinkOutSection({
  block,
  href,
  label,
}: {
  block: CMSBlock;
  href: string;
  label: string;
}) {
  return (
    <section className="bg-[#F0F0EF] py-16">
      <div className="max-w-3xl mx-auto px-6 text-center">
        {block.title ? (
          <h2 className="text-2xl md:text-3xl font-display font-bold text-[#050A1F] mb-4">{block.title}</h2>
        ) : null}
        {blockMarkdownBody(block) ? (
          <div className="text-slate-600 mb-8 legal-prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{blockMarkdownBody(block)}</ReactMarkdown>
          </div>
        ) : null}
        <Link
          href={href}
          className="inline-flex px-8 py-3 rounded-full bg-[#050A1F] text-white text-sm font-bold no-underline hover:bg-brand-cyan transition-colors"
        >
          {label}
        </Link>
      </div>
    </section>
  );
}

function DocumentsSection({
  block,
  captcha,
  formConfigs,
}: {
  block: CMSBlock;
  captcha?: CaptchaProps;
  formConfigs?: Record<string, CMSFormConfig> | null;
}) {
  const title = block.title?.trim() || 'Downloads';
  const body = blockMarkdownBody(block);
  const documents = resolveBlockDocuments(block);
  const gateForm = resolveDocumentsGateForm(block, formConfigs);
  const [selected, setSelected] = useState<CMSDocument | null>(null);

  return (
    <>
      <section className="relative bg-[#050A1F] text-white pt-16 pb-12">
        <div className="absolute inset-0 pointer-events-none animated-grid">
          <AnimatedGrid />
        </div>
        <div className="relative z-10 max-w-[1440px] mx-auto px-6 text-center">
          <p className="text-brand-cyan text-sm font-mono uppercase tracking-widest mb-4">Resources</p>
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.1] mb-6"
            dangerouslySetInnerHTML={{ __html: highlightTitle(title) }}
          />
          {body ? (
            <div className="text-white/65 text-lg max-w-2xl mx-auto prose prose-invert prose-p:my-2 prose-a:text-brand-cyan">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
            </div>
          ) : null}
        </div>
      </section>

      <section className="bg-[#F0F0EF] py-16 md:py-20 w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10">
          {documents.length === 0 ? (
            <p className="text-center text-slate-500">No downloads are available yet.</p>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-7">
              {documents.map((doc) => (
                <DocumentCard key={doc.path || doc.url} doc={doc} onOpen={() => setSelected(doc)} />
              ))}
            </div>
          )}
        </div>
      </section>

      <DownloadDialog
        doc={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        gateForm={gateForm}
        captchaSiteKey={captcha?.captchaSiteKey}
        captchaDisabled={captcha?.captchaDisabled}
        captchaProvider={captcha?.captchaProvider}
      />
    </>
  );
}

function DocumentCard({ doc, onOpen }: { doc: CMSDocument; onOpen: () => void }) {
  const label = documentDisplayTitle(doc);
  const thumb = doc.thumbnailUrl || null;
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const isLandscape = orientation === 'landscape';

  useLayoutEffect(() => {
    const img = imgRef.current;
    if (!img || !thumb) return;

    const applyOrientation = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setOrientation(img.naturalWidth >= img.naturalHeight ? 'landscape' : 'portrait');
      }
    };

    // Cached images often finish before React attaches onLoad — check `complete`.
    if (img.complete) {
      applyOrientation();
      return;
    }

    img.addEventListener('load', applyOrientation);
    return () => img.removeEventListener('load', applyOrientation);
  }, [thumb]);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group flex flex-col self-center overflow-hidden rounded-3xl bg-white border border-black/5 shadow-[0_18px_50px_-28px_rgba(5,10,31,0.45)] transition-all duration-500 hover:-translate-y-1 hover:border-brand-cyan/40 hover:shadow-[0_28px_70px_-24px_rgba(0,176,194,0.35)] text-left ${
        isLandscape
          ? 'w-full max-w-[34rem] sm:w-[34rem]'
          : 'w-full max-w-[17rem] sm:w-[17rem]'
      }`}
      aria-label={`Open options for ${label}`}
    >
      <div
        className={`relative w-full overflow-hidden rounded-t-3xl bg-[#0a1028] ${
          isLandscape ? 'h-44 sm:h-48' : 'aspect-[3/4]'
        }`}
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element -- external storage previews; avoid /_next/image + /files proxy failures locally
          <img
            ref={imgRef}
            src={thumb}
            alt={`Preview of ${label}`}
            className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/35">
            <i className="ri-file-pdf-2-line text-5xl" />
            <span className="text-xs font-mono uppercase tracking-widest">PDF</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050A1F]/45 via-transparent to-transparent" />
        <div className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/15 px-3 py-1.5 text-white text-[10px] font-mono uppercase tracking-[0.18em]">
          <i className="ri-file-download-line text-brand-cyan" />
          Get
        </div>
      </div>
      <div className="p-5">
        <h3 className="text-[#050A1F] text-base font-display font-bold leading-snug group-hover:text-brand-cyan transition-colors">
          {label}
        </h3>
        <p className="mt-2 text-xs font-mono uppercase tracking-widest text-slate-400">
          {[
            doc.mimeType?.includes('pdf') || doc.name?.toLowerCase().endsWith('.pdf') ? 'PDF' : null,
            formatDocumentPageCount(doc.pageCount),
            formatDocumentSize(doc.size),
          ]
            .filter(Boolean)
            .join(' · ') || 'Document'}
        </p>
      </div>
    </button>
  );
}

function BlockRouter({
  block,
  index,
  captcha,
  formConfigs,
}: {
  block: CMSBlock;
  index: number;
  captcha?: CaptchaProps;
  formConfigs?: Record<string, CMSFormConfig> | null;
}) {
  const layout = (block as { layout?: string }).layout;
  const addon = block.addon;

  if (isDocumentsListBlock(block) || addon === 'documents-list') {
    return <DocumentsSection block={block} captcha={captcha} formConfigs={formConfigs} />;
  }
  if (isCompaniesListBlock(block) || addon === 'companies-list') {
    return <CompaniesGridSection block={block} />;
  }
  if (isMembersListBlock(block) || addon === 'members-list') {
    return <MembersGridSection block={block} />;
  }
  if (addon === 'youtube' || block.type === 'youtube') {
    return <YouTubeSection block={block} />;
  }
  if (addon === 'schedule' || block.type === 'schedule') {
    return <LinkOutSection block={block} href="/schedule" label="View schedule" />;
  }
  if (addon === 'events-list') {
    return <LinkOutSection block={block} href="/agenda" label="View agenda" />;
  }
  if (addon === 'blog-articles-list') {
    return <LinkOutSection block={block} href="/blog" label="View insights" />;
  }
  if (addon === 'form') {
    return <LinkOutSection block={block} href="/contact" label="Open contact form" />;
  }
  if (addon === 'gallery' || addon === 'carousel' || block.type === 'gallery' || block.type === 'carousel') {
    // Hydrated gallery items vary; fall back to copy + CTA until assets are mapped.
    return <ContentSection block={block} />;
  }
  if (addon === 'faq' || block.type === 'faq') {
    return <ContentSection block={block} />;
  }
  if (addon === 'testimonials-list' || addon === 'pricing-tiers') {
    return <ContentSection block={block} />;
  }

  if (block.type === 'cta' || block.type === 'call-to-action') {
    return <CtaSection block={block} />;
  }
  if (block.type === 'hero' || block.type === 'heading' || layout === 'hero' || index === 0) {
    // First block or explicit hero → dark hero treatment when it looks like a page intro
    if (index === 0 || block.type === 'hero' || layout === 'hero') {
      return <HeroSection block={block} />;
    }
  }
  if (block.type === 'simple' || block.type === 'content' || block.type === 'text') {
    return <ContentSection block={block} dark={layout === 'centered' && !!block.buttons?.length} />;
  }

  // Unknown / leftover — still show something useful
  if (block.title || blockMarkdownBody(block) || block.buttons?.length) {
    return <ContentSection block={block} />;
  }
  return null;
}

interface CmsPageRendererProps {
  blocks: CMSBlock[];
  pageTitle?: string;
  formConfigs?: Record<string, CMSFormConfig> | null;
  captchaSiteKey?: string;
  captchaDisabled?: boolean;
  captchaProvider?: string;
}

/**
 * Generic CMS page body for DeAI Summit — routes content/simple boxes and addons
 * (documents-list, companies-list, members-list, youtube, etc.) into on-brand sections.
 */
export function CmsPageRenderer({
  blocks,
  pageTitle,
  formConfigs,
  captchaSiteKey,
  captchaDisabled,
  captchaProvider,
}: CmsPageRendererProps) {
  const captcha: CaptchaProps = { captchaSiteKey, captchaDisabled, captchaProvider };

  if (!blocks.length) {
    return (
      <section className="bg-[#F0F0EF] py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h1 className="text-3xl font-display font-bold text-[#050A1F] mb-4">
            {pageTitle || 'Coming soon'}
          </h1>
          <p className="text-slate-500">This page hasn&apos;t got any published sections yet.</p>
        </div>
      </section>
    );
  }

  return (
    <>
      {blocks.map((block, index) => (
        <BlockRouter
          key={block.id || `block-${index}`}
          block={block}
          index={index}
          captcha={captcha}
          formConfigs={formConfigs}
        />
      ))}
    </>
  );
}
