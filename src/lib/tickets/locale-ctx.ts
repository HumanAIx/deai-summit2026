import { DEAI_LOCALE_CTX, type LocaleCtx } from './localized-href';

/** Single English locale on DeAI (see `localized-href.ts`). */
export async function ticketsLocaleCtx(): Promise<LocaleCtx> {
  return DEAI_LOCALE_CTX;
}
