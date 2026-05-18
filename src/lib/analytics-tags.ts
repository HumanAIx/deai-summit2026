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
}

export type AnalyticsTagsPartial = Partial<PublicAnalyticsTagsResolved>;

function nz(s: unknown): string {
  return typeof s === 'string' ? s.trim() : '';
}

/** Normalize API payload from `/settings/public/analytics-tags` (omit empty strings). */
export function resolveAnalyticsTagsFromApi(api: AnalyticsTagsPartial | null | undefined): PublicAnalyticsTagsResolved {
  return {
    gtmId: nz(api?.gtmId),
    ga4MeasurementId: nz(api?.ga4MeasurementId),
    googleSiteVerification: nz(api?.googleSiteVerification),
    linkedinPartnerId: nz(api?.linkedinPartnerId),
    redditPixelId: nz(api?.redditPixelId),
    redditContactLeadId: nz(api?.redditContactLeadId),
    redditSpeakerLeadId: nz(api?.redditSpeakerLeadId),
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
