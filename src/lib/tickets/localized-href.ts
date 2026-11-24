/**
 * DeAI is English-only with no locale prefixes, so every ticket link is the plain path. Kept with the renderer's names
 * so the ported ticket components stay unchanged.
 */
export interface LocaleCtx {
  locale: string;
  defaultLocale: string;
  availableLocales: readonly string[];
}

export const DEAI_LOCALE_CTX: LocaleCtx = { locale: 'en', defaultLocale: 'en', availableLocales: ['en'] };

export function localePrefixFor(ctx?: LocaleCtx): string {
  void ctx;
  return '';
}

export function localizeHref({ href }: { href: string; ctx?: LocaleCtx }): string {
  return href;
}
