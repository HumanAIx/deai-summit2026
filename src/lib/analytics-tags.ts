/**
 * Marketing-site analytics snippet IDs from `/settings/public/analytics-tags` only
 * (Dashboard → Analytics tags). No env-var fallbacks.
 */

export interface PublicAnalyticsTagsResolved {
  gtmId: string;
  ga4MeasurementId: string;
  googleSiteVerification: string;
  linkedinPartnerId: string;
  redditPixelId: string;
  redditContactLeadId: string;
  redditSpeakerLeadId: string;
  /** First enabled Meta Pixel from `tags`. The API has no flat key for it. */
  metaPixelId: string;
}

export type AnalyticsTagsPartial = Partial<Omit<PublicAnalyticsTagsResolved, 'metaPixelId'>> & {
  tags?: Array<{ provider?: unknown; value?: unknown; enabled?: unknown }>;
};

function nz(s: unknown): string {
  return typeof s === 'string' ? s.trim() : '';
}

/** Meta's pixel id is digits only. Reject anything else before it reaches the page. */
const META_PIXEL_ID = /^\d{8,20}$/;

function firstEnabledTag(api: AnalyticsTagsPartial | null | undefined, provider: string): string {
  const tags = Array.isArray(api?.tags) ? api.tags : [];
  for (const tag of tags) {
    if (!tag || tag.provider !== provider || tag.enabled === false) continue;
    const value = nz(tag.value);
    if (value) return value;
  }
  return '';
}

/** Normalize API payload from `/settings/public/analytics-tags` (omit empty strings). */
export function resolveAnalyticsTagsFromApi(api: AnalyticsTagsPartial | null | undefined): PublicAnalyticsTagsResolved {
  const metaPixelId = firstEnabledTag(api, 'meta_pixel');
  return {
    gtmId: nz(api?.gtmId),
    ga4MeasurementId: nz(api?.ga4MeasurementId),
    googleSiteVerification: nz(api?.googleSiteVerification),
    linkedinPartnerId: nz(api?.linkedinPartnerId),
    redditPixelId: nz(api?.redditPixelId),
    redditContactLeadId: nz(api?.redditContactLeadId),
    redditSpeakerLeadId: nz(api?.redditSpeakerLeadId),
    metaPixelId: META_PIXEL_ID.test(metaPixelId) ? metaPixelId : '',
  };
}

/** First non-empty Reddit id for bootstrapping the global pixel loader when only conversion ids are configured. */
export function resolveRedditBootstrapId(tags: PublicAnalyticsTagsResolved): string {
  return tags.redditPixelId || tags.redditContactLeadId || tags.redditSpeakerLeadId;
}

/** Contact Lead: explicit id when set, else site-wide pixel (one id for everything is supported). */
export function redditContactLeadPixel(tags: PublicAnalyticsTagsResolved): string {
  return tags.redditContactLeadId || tags.redditPixelId;
}

/** Speaker Lead: explicit id when set, else site-wide pixel. */
export function redditSpeakerLeadPixel(tags: PublicAnalyticsTagsResolved): string {
  return tags.redditSpeakerLeadId || tags.redditPixelId;
}
