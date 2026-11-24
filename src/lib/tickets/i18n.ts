import { createFormatter, createTranslator, TICKETS_LOCALE, type Formatter, type Translator } from './i18n-core';

/** Client + server hooks with next-intl's names (English only, see `i18n-core.ts`). Pure functions: safe in both. */
export function useTranslations(namespace?: string): Translator {
  return createTranslator(namespace);
}

export function useFormatter(): Formatter {
  return createFormatter();
}

export function useLocale(): string {
  return TICKETS_LOCALE;
}
