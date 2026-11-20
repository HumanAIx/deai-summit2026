import { createFormatter, createTranslator, TICKETS_LOCALE, type Formatter, type Translator } from './i18n-core';

/** Server-side counterparts of next-intl/server (English only, see `i18n-core.ts`). */
export async function getTranslations(namespace?: string): Promise<Translator> {
  return createTranslator(namespace);
}

export async function getFormatter(): Promise<Formatter> {
  return createFormatter();
}

export async function getLocale(): Promise<string> {
  return TICKETS_LOCALE;
}
