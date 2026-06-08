'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { DetailPageLayout } from '@/components/DetailPageLayout';
import { AnimatedGrid } from '@/components/AnimatedGrid';
import Markdown from '@/components/Markdown';
import { buildBlogPageModel } from '@/lib/blog-cms';
import type { BlogPost, CMSPageData, NavigationAPIData } from '@/lib/api-types';
import type { NavigationConfig } from '@/config/types';

const accentColors = ['#00B0C2', '#0E6FEB', '#050A1F'];

interface SocialLinkData {
  key: string;
  label: string;
  url: string;
  icon?: string;
  color?: string;
}

interface BlogListClientProps {
  posts: BlogPost[];
  cmsPage: CMSPageData | null;
  navigationData?: NavigationConfig;
  navigationAPIData?: NavigationAPIData;
  socials?: SocialLinkData[];
}

function highlightTitle(text: string): string {
  if (!text) return '';
  if (text.includes('**')) {
    return text.replace(/\*\*(.+?)\*\*/g, '<span class="text-brand-cyan">$1</span>');
  }
  return text.replace(/(DeAI Summit)/gi, '<span class="text-brand-cyan">$1</span>');
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// --- Featured carousel ---

function BlogCarousel({ posts }: { posts: BlogPost[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef(0);

  const startAutoAdvance = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (posts.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % posts.length);
    }, 6000);
  }, [posts.length]);

  useEffect(() => {
    startAutoAdvance();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startAutoAdvance]);

  const goTo = useCallback((index: number) => {
    setActiveIndex(index);
    startAutoAdvance();
  }, [startAutoAdvance]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goTo((activeIndex + 1) % posts.length);
      else goTo((activeIndex - 1 + posts.length) % posts.length);
    }
  };

  if (posts.length === 0) return null;

  const activePost = posts[activeIndex];
  const accent = accentColors[activeIndex % accentColors.length];

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl sm:rounded-2xl border border-white/10 shadow-2xl shadow-brand-cyan/5 min-h-[220px] sm:min-h-[280px] md:aspect-[16/9] md:max-h-[480px]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {posts.map((post, index) => (
        <div
          key={post.id}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: index === activeIndex ? 1 : 0, zIndex: index === activeIndex ? 1 : 0 }}
        >
          {post.featured_image ? (
            <Image src={post.featured_image} alt={post.title} fill className="object-cover" sizes="100vw" priority={index === 0} />
          ) : (
            <div
              className="w-full h-full"
              style={{ background: `linear-gradient(135deg, ${accentColors[index % accentColors.length]} 0%, #050A1F 100%)` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050A1F] via-[#050A1F]/50 to-transparent" />
        </div>
      ))}

      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 sm:p-6 md:p-10 pb-12 sm:pb-10">
        <div className="max-w-3xl">
          {activePost.reading_time > 0 && (
            <span className="inline-block px-2.5 sm:px-3 py-1 mb-2 sm:mb-3 text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-white bg-brand-cyan/90 rounded-full">
              {activePost.reading_time} min read
            </span>
          )}
          <Link href={`/blog/${activePost.slug}`}>
            <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-display font-bold text-white leading-tight mb-2 sm:mb-3 hover:text-brand-cyan transition-colors line-clamp-3 sm:line-clamp-none">
              {activePost.title}
            </h2>
          </Link>
          {activePost.meta_description && (
            <p className="text-white/70 text-xs sm:text-sm md:text-base leading-relaxed line-clamp-2 mb-2 sm:mb-3 max-w-2xl">
              {activePost.meta_description}
            </p>
          )}
          <p className="text-white/40 text-[10px] sm:text-xs font-mono uppercase tracking-widest">
            {formatDate(activePost.published_at)}
          </p>
        </div>
      </div>

      {posts.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo((activeIndex - 1 + posts.length) % posts.length)}
            className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white transition-all touch-manipulation"
            aria-label="Previous article"
          >
            <i className="ri-arrow-left-s-line text-lg sm:text-xl" />
          </button>
          <button
            type="button"
            onClick={() => goTo((activeIndex + 1) % posts.length)}
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white transition-all touch-manipulation"
            aria-label="Next article"
          >
            <i className="ri-arrow-right-s-line text-lg sm:text-xl" />
          </button>
          <div className="absolute bottom-3 sm:bottom-4 right-4 sm:right-6 z-20 flex gap-1.5 sm:gap-2">
            {posts.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goTo(index)}
                className="h-1.5 rounded-full transition-all duration-300 touch-manipulation"
                style={{
                  width: index === activeIndex ? '20px' : '8px',
                  backgroundColor: index === activeIndex ? accent : 'rgba(255,255,255,0.35)',
                }}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// --- Article card ---

function BlogCard({ post, index, featured = false }: { post: BlogPost; index: number; featured?: boolean }) {
  const accent = accentColors[index % accentColors.length];

  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`group block overflow-hidden rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 blog-card-shadow blog-card-enter hover:-translate-y-1 transition-all duration-500 ${
        featured ? 'sm:col-span-2' : ''
      }`}
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <div className="h-1 w-full" style={{ backgroundColor: accent }} />
      <div className={featured ? 'sm:flex' : ''}>
        <div
          className={`relative overflow-hidden bg-[#050A1F] ${
            featured
              ? 'w-full aspect-[16/9] sm:w-[55%] sm:aspect-auto sm:min-h-[220px] md:min-h-[260px]'
              : 'w-full aspect-[16/9]'
          }`}
        >
          {post.featured_image ? (
            <Image
              src={post.featured_image}
              alt={post.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              sizes={featured ? '(max-width: 640px) 100vw, 55vw' : '(max-width: 640px) 100vw, 33vw'}
            />
          ) : (
            <div
              className="w-full h-full min-h-[180px] sm:min-h-[200px] flex items-center justify-center p-4 sm:p-6"
              style={{ background: `linear-gradient(135deg, ${accent} 0%, #050A1F 100%)` }}
            >
              <span className="font-display font-bold text-white text-center text-base sm:text-lg uppercase line-clamp-4">
                {post.title}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050A1F]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className={`p-4 sm:p-6 ${featured ? 'sm:flex-1 sm:flex sm:flex-col sm:justify-center sm:p-8' : ''}`}>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            {post.reading_time > 0 && (
              <span className="text-[10px] font-mono uppercase tracking-widest text-brand-cyan bg-brand-cyan/10 px-2 py-0.5 rounded">
                {post.reading_time} min
              </span>
            )}
            <span className="text-white/40 text-[10px] sm:text-xs font-mono uppercase tracking-widest">
              {formatDate(post.published_at)}
            </span>
          </div>
          <h3
            className={`font-display font-bold text-white leading-snug mb-2 group-hover:text-brand-cyan transition-colors ${
              featured ? 'text-lg sm:text-xl md:text-2xl line-clamp-3' : 'text-base sm:text-lg line-clamp-2'
            }`}
          >
            {post.title}
          </h3>
          {post.meta_description && (
            <p className={`text-white/50 leading-relaxed text-sm ${featured ? 'line-clamp-3 mb-3 sm:mb-4' : 'line-clamp-2 mb-2 sm:mb-3'}`}>
              {post.meta_description}
            </p>
          )}
          <span className="inline-flex items-center gap-1.5 text-brand-cyan text-[10px] sm:text-xs font-mono uppercase tracking-widest group-hover:gap-2.5 transition-all">
            Read article
            <i className="ri-arrow-right-line" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function BlogListClient({
  posts: initialPosts,
  cmsPage,
  navigationData,
  navigationAPIData,
  socials,
}: BlogListClientProps) {
  const model = useMemo(
    () => buildBlogPageModel(cmsPage, initialPosts),
    [cmsPage, initialPosts],
  );

  const carouselPosts = useMemo(() => model.posts.slice(0, 5), [model.posts]);

  return (
    <DetailPageLayout navigationData={navigationData} navigationAPIData={navigationAPIData} socials={socials}>
      {model.hero.show && (
        <section className="relative bg-[#050A1F] text-white overflow-hidden">
          <div className="absolute inset-0 pointer-events-none animated-grid">
            <AnimatedGrid />
          </div>
          <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24">
            <div className="text-center mb-8 sm:mb-10 md:mb-14">
              {model.hero.subtitle && (
                <p className="text-brand-cyan text-xs sm:text-sm font-mono uppercase tracking-[0.15em] sm:tracking-[0.2em] mb-3 sm:mb-4 px-2">
                  {model.hero.subtitle}
                </p>
              )}
              {model.hero.title && (
                <h1
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.1] px-2"
                  dangerouslySetInnerHTML={{ __html: highlightTitle(model.hero.title) }}
                />
              )}
              {model.hero.content && (
                <div className="mt-5 sm:mt-6 max-w-2xl mx-auto px-2 text-left sm:text-center blog-hero-prose">
                  <Markdown content={model.hero.content} className="blog-hero-prose" />
                </div>
              )}
            </div>

            {carouselPosts.length > 0 && <BlogCarousel posts={carouselPosts} />}
          </div>
        </section>
      )}

      {model.hero.show && model.list.show && model.posts.length > 0 && (
        <div className="bg-[#050A1F] pb-3 sm:pb-4">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-brand-cyan/40 to-transparent" />
              <span className="text-brand-cyan text-[10px] sm:text-xs font-mono uppercase tracking-[0.15em] sm:tracking-[0.2em] whitespace-nowrap">
                {model.posts.length} {model.posts.length === 1 ? 'Article' : 'Articles'}
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-brand-cyan/40 to-transparent" />
            </div>
          </div>
        </div>
      )}

      {model.list.show && (
        <section className="bg-[#050A1F] text-white pb-16 sm:pb-20 md:pb-28">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
            {(model.list.subtitle || model.list.title) && (
              <div className="text-center mb-8 sm:mb-12">
                {model.list.subtitle && (
                  <p className="text-brand-cyan text-xs sm:text-sm font-mono uppercase tracking-[0.15em] sm:tracking-[0.2em] mb-2 sm:mb-3">
                    {model.list.subtitle}
                  </p>
                )}
                {model.list.title && (
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold">{model.list.title}</h2>
                )}
              </div>
            )}

            {model.posts.length === 0 ? (
              <div className="text-center py-16 sm:py-24">
                <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/5 border border-white/10 mb-4 sm:mb-6">
                  <i className="ri-article-line text-3xl sm:text-4xl text-white/20" />
                </div>
                <p className="text-white/50 text-base sm:text-lg mb-2">No articles published yet.</p>
                <p className="text-white/30 text-xs sm:text-sm font-mono uppercase tracking-widest">Check back soon</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {model.posts.map((post, index) => (
                  <BlogCard key={post.id} post={post} index={index} featured={index === 0} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </DetailPageLayout>
  );
}
