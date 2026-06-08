'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DetailPageLayout } from '@/components/DetailPageLayout';
import Markdown from '@/components/Markdown';
import type { BlogPost, BlogContentBlock, BlogPublisher, NavigationAPIData } from '@/lib/api-types';
import type { NavigationConfig } from '@/config/types';

interface SocialLinkData {
  key: string;
  label: string;
  url: string;
  icon?: string;
  color?: string;
}

interface BlogDetailClientProps {
  post: BlogPost;
  publishers: BlogPublisher[];
  navigationData?: NavigationConfig;
  navigationAPIData?: NavigationAPIData;
  socials?: SocialLinkData[];
}

const accentColors = ['#00B0C2', '#0E6FEB', '#050A1F'];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getYouTubeEmbedUrl(url: string): string {
  if (url.includes('/embed/')) return url;
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  return url.replace('watch?v=', 'embed/');
}

function TweetEmbed({ tweetUrl }: { tweetUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  const loadWidget = useCallback(() => {
    const win = window as unknown as { twttr?: { widgets?: { load?: (el?: HTMLElement) => void } } };
    if (win.twttr?.widgets?.load && containerRef.current) {
      win.twttr.widgets.load(containerRef.current);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    const win = window as unknown as { twttr?: { widgets?: { load?: (el?: HTMLElement) => void } } };
    if (win.twttr?.widgets?.load) {
      loadWidget();
      return;
    }

    if (!document.getElementById('twitter-wjs')) {
      const script = document.createElement('script');
      script.id = 'twitter-wjs';
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.onload = () => setTimeout(loadWidget, 100);
      document.head.appendChild(script);
    } else {
      const check = setInterval(() => {
        if (win.twttr?.widgets?.load) {
          clearInterval(check);
          loadWidget();
        }
      }, 200);
      return () => clearInterval(check);
    }
  }, [tweetUrl, loadWidget]);

  const normalizedUrl = tweetUrl.replace('https://x.com/', 'https://twitter.com/');

  return (
    <div ref={containerRef} className="my-8">
      {!loaded && (
        <div className="flex items-center justify-center py-8 text-[#050A1F]/40 text-sm">
          Loading tweet...
        </div>
      )}
      <blockquote className="twitter-tweet" data-dnt="true">
        <a href={normalizedUrl}>{normalizedUrl}</a>
      </blockquote>
    </div>
  );
}

function parseContentBlocks(post: BlogPost): BlogContentBlock[] {
  if (post.content_blocks && post.content_blocks.length > 0) {
    return post.content_blocks.filter(b => b.published !== false);
  }
  if (!post.content) return [];
  try {
    const parsed = JSON.parse(post.content);
    if (Array.isArray(parsed)) {
      return (parsed as BlogContentBlock[]).filter(b => b.published !== false);
    }
    return [{ id: 'raw', type: 'markdown', content: post.content, published: true }];
  } catch {
    return [{ id: 'raw', type: 'markdown', content: post.content, published: true }];
  }
}

function PublisherAvatar({ publisher, accentColor }: { publisher: BlogPublisher; accentColor: string }) {
  if (publisher.image) {
    return (
      <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 flex-shrink-0" style={{ borderColor: accentColor }}>
        <Image src={publisher.image} alt={publisher.name} fill className="object-cover" />
      </div>
    );
  }
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
      style={{ backgroundColor: accentColor }}
    >
      {publisher.name.charAt(0)}
    </div>
  );
}

function PublisherLink({
  publisher,
  accentColor,
}: {
  publisher: BlogPublisher;
  accentColor: string;
}) {
  const href = publisher.isTeam
    ? `/team/${publisher.slug || publisher.id}`
    : publisher.isSpeaker
      ? `/speakers/${publisher.slug || publisher.id}`
      : null;

  const inner = (
    <div className="flex items-center gap-3">
      <PublisherAvatar publisher={publisher} accentColor={accentColor} />
      <div>
        <p className="text-[#050A1F] text-sm font-semibold">{publisher.name}</p>
        <p className="text-xs font-mono uppercase tracking-widest" style={{ color: accentColor }}>
          {publisher.role}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block rounded-xl px-3 py-2 -mx-3 hover:bg-[#050A1F]/[0.03] transition-colors">
        {inner}
      </Link>
    );
  }
  return <div className="px-3 py-2 -mx-3">{inner}</div>;
}

export function BlogDetailClient({
  post,
  publishers,
  navigationData,
  navigationAPIData,
  socials,
}: BlogDetailClientProps) {
  const router = useRouter();

  const handleBack = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof window !== 'undefined' && document.referrer) {
      try {
        const ref = new URL(document.referrer);
        if (ref.origin === window.location.origin) {
          e.preventDefault();
          router.back();
          return;
        }
      } catch {}
    }
  };

  const contentBlocks = useMemo(() => parseContentBlocks(post), [post]);

  const accentColor = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < post.slug.length; i++) {
      hash = ((hash << 5) - hash) + post.slug.charCodeAt(i);
      hash = hash & hash;
    }
    return accentColors[Math.abs(hash) % accentColors.length];
  }, [post.slug]);

  const authors = publishers.filter(p => p.role === 'author');
  const editors = publishers.filter(p => p.role === 'editor');

  return (
    <DetailPageLayout navigationData={navigationData} navigationAPIData={navigationAPIData} socials={socials}>
      {/* Hero */}
      {post.featured_image ? (
        <section className="relative -mt-[140px] pt-[140px]">
          <div className="relative w-full h-[38vh] sm:h-[42vh] md:h-[45vh] min-h-[240px] sm:min-h-[300px] max-h-[520px]">
            <Image src={post.featured_image} alt={post.title} fill priority className="object-cover" sizes="100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050A1F] via-[#050A1F]/40 to-[#050A1F]/20" />
            <div className="absolute bottom-0 left-0 right-0 py-6 sm:py-8 md:py-12">
              <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
                <Link
                  href="/blog"
                  onClick={handleBack}
                  className="text-brand-cyan text-xs font-mono uppercase tracking-widest hover:underline mb-4 inline-flex items-center gap-1"
                >
                  <i className="ri-arrow-left-line" /> All Articles
                </Link>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="text-white/60 text-xs font-mono uppercase tracking-widest">Insights</span>
                  {post.reading_time > 0 && (
                    <>
                      <span className="text-white/30">·</span>
                      <span className="text-white/60 text-xs font-mono uppercase tracking-widest">
                        {post.reading_time} min read
                      </span>
                    </>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-display font-bold text-white leading-[1.2] max-w-4xl break-words">
                  {post.title}
                </h1>
                <p className="mt-4 text-white/70 text-sm md:text-base flex items-center gap-2">
                  <i className="ri-calendar-line text-brand-cyan" />
                  {formatDate(post.published_at)}
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="relative bg-[#050A1F] text-white pt-6 sm:pt-8 pb-10 sm:pb-12">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
            <Link
              href="/blog"
              onClick={handleBack}
              className="text-brand-cyan text-xs font-mono uppercase tracking-widest hover:underline mb-6 inline-flex items-center gap-1"
            >
              <i className="ri-arrow-left-line" /> All Articles
            </Link>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-white/60 text-xs font-mono uppercase tracking-widest">Insights</span>
              {post.reading_time > 0 && (
                <>
                  <span className="text-white/30">·</span>
                  <span className="text-white/60 text-xs">{post.reading_time} min read</span>
                </>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold leading-[1.2] max-w-4xl break-words">
              {post.title}
            </h1>
            <p className="mt-4 text-white/70 flex items-center gap-2">
              <i className="ri-calendar-line text-brand-cyan" />
              {formatDate(post.published_at)}
            </p>
          </div>
        </section>
      )}

      {/* Breadcrumb */}
      <div className="bg-[#0A1228] border-b border-white/5">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
          <nav className="flex items-center gap-2 py-2.5 sm:py-3 text-[10px] sm:text-xs font-mono uppercase tracking-widest text-white/40" aria-label="Breadcrumb">
            <Link href="/blog" className="hover:text-brand-cyan transition-colors shrink-0">Blog</Link>
            <i className="ri-arrow-right-s-line text-white/20 shrink-0" />
            <span className="text-white/60 truncate">{post.slug}</span>
          </nav>
        </div>
      </div>

      {/* Content */}
      <section className="bg-[#F0F0EF]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
          <div className="grid lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-14">
            {/* Sidebar */}
            <aside className="lg:col-span-1 order-first lg:order-last">
              <div className="lg:sticky lg:top-[160px]">
                <div className="bg-white rounded-xl sm:rounded-2xl border border-[#050A1F]/8 p-4 sm:p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-1 h-8 rounded-full" style={{ backgroundColor: accentColor }} />
                    <h3 className="font-display font-bold text-[#050A1F] text-lg">Post Details</h3>
                  </div>

                  <div className="space-y-5 text-sm">
                    <div>
                      <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: accentColor }}>
                        Published
                      </p>
                      <p className="text-[#050A1F]">{formatDate(post.published_at)}</p>
                    </div>

                    {post.reading_time > 0 && (
                      <div>
                        <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: accentColor }}>
                          Reading Time
                        </p>
                        <p className="text-[#050A1F]">{post.reading_time} minutes</p>
                      </div>
                    )}

                    {post.last_updated && post.last_updated !== post.published_at && (
                      <div>
                        <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: accentColor }}>
                          Last Updated
                        </p>
                        <p className="text-[#050A1F]">{formatDate(post.last_updated)}</p>
                      </div>
                    )}

                    {authors.length > 0 && (
                      <div>
                        <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: accentColor }}>
                          Author
                        </p>
                        <div className="space-y-1">
                          {authors.map(p => (
                            <PublisherLink key={p.id} publisher={p} accentColor={accentColor} />
                          ))}
                        </div>
                      </div>
                    )}

                    {editors.length > 0 && (
                      <div>
                        <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: accentColor }}>
                          {editors.length === 1 ? 'Editor' : 'Editors'}
                        </p>
                        <div className="space-y-1">
                          {editors.map(p => (
                            <PublisherLink key={p.id} publisher={p} accentColor={accentColor} />
                          ))}
                        </div>
                      </div>
                    )}

                    {post.seo?.meta_keywords && (
                      <div>
                        <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: accentColor }}>
                          Topics
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {post.seo.meta_keywords.split(',').map(kw => kw.trim()).filter(Boolean).map(kw => (
                            <span
                              key={kw}
                              className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#050A1F]/5 text-[#050A1F]/60"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </aside>

            {/* Main content */}
            <div className="lg:col-span-2 min-w-0">
              {contentBlocks.length > 0 ? (
                contentBlocks.map(block => {
                  if (block.type === 'markdown' && block.content) {
                    return <Markdown key={block.id} content={block.content} />;
                  }
                  if (block.type === 'youtube' && block.videoUrl) {
                    return (
                      <div key={block.id} className="my-10">
                        {block.title && (
                          <h3 className="font-display font-bold text-[#050A1F] text-xl mb-4">{block.title}</h3>
                        )}
                        <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-xl shadow-lg">
                          <iframe
                            src={getYouTubeEmbedUrl(block.videoUrl)}
                            className="absolute top-0 left-0 w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={block.title || 'YouTube video'}
                          />
                        </div>
                      </div>
                    );
                  }
                  if (block.type === 'tweet' && block.tweetUrl) {
                    return (
                      <div key={block.id} className="my-10">
                        {block.title && (
                          <h3 className="font-display font-bold text-[#050A1F] text-xl mb-4">{block.title}</h3>
                        )}
                        <TweetEmbed tweetUrl={block.tweetUrl} />
                      </div>
                    );
                  }
                  return null;
                })
              ) : post.meta_description ? (
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-1 h-8 bg-brand-cyan rounded-full" />
                    <h2 className="text-2xl font-display font-bold text-[#050A1F]">Summary</h2>
                  </div>
                  <p className="blog-prose text-lg">{post.meta_description}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Back link */}
      <section className="bg-white border-t border-gray-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Link
            href="/blog"
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-brand-cyan font-mono text-xs sm:text-sm uppercase tracking-widest hover:underline transition-colors"
          >
            <i className="ri-arrow-left-line" />
            Back to all articles
          </Link>
        </div>
      </section>
    </DetailPageLayout>
  );
}
