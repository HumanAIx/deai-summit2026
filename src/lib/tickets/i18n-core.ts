import { IntlMessageFormat } from 'intl-messageformat';
import messages from './messages.en.json';

/**
 * English-only stand-in for the slice of next-intl the ticket pages use (`t(key, values)`, `t.has(key)` and the
 * date / number / list formatter). The messages are GConf.ai's renderer catalogue (`tickets.*`, `block.ticketsBlock.*`,
 * `a11y.*`) with the same keys, so a later move to real i18n only swaps this module. ICU plurals and selects work
 * through `intl-messageformat`, the parser next-intl itself uses.
 */

export const TICKETS_LOCALE = 'en';

type Values = Record<string, string | number | Date | boolean | null | undefined>;

export interface Translator {
  (key: string, values?: Values): string;
  has(key: string): boolean;
}

const compiled = new Map<string, IntlMessageFormat>();

function lookup(path: string): unknown {
  let node: unknown = messages;
  for (const part of path.split('.')) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

function fullKey(namespace: string | undefined, key: string): string {
  return namespace ? `${namespace}.${key}` : key;
}

export function createTranslator(namespace?: string): Translator {
  const translate = ((key: string, values?: Values) => {
    const path = fullKey(namespace, key);
    const message = lookup(path);
    if (typeof message !== 'string') {
      if (process.env.NODE_ENV !== 'production') console.warn(`[tickets i18n] missing message ${path}`);
      return path;
    }
    let format = compiled.get(path);
    if (!format) {
      format = new IntlMessageFormat(message, TICKETS_LOCALE, undefined, { ignoreTag: true });
      compiled.set(path, format);
    }
    return String(format.format(values as Record<string, string | number | boolean | Date | null | undefined>));
  }) as Translator;
  translate.has = (key: string) => typeof lookup(fullKey(namespace, key)) === 'string';
  return translate;
}

export interface Formatter {
  dateTime(value: Date | number, options?: Intl.DateTimeFormatOptions): string;
  dateTimeRange(start: Date | number, end: Date | number, options?: Intl.DateTimeFormatOptions): string;
  number(value: number, options?: Intl.NumberFormatOptions): string;
  list(items: Iterable<string>, options?: Intl.ListFormatOptions): string;
}

export function createFormatter(): Formatter {
  return {
    dateTime: (value, options) => new Intl.DateTimeFormat(TICKETS_LOCALE, options).format(value),
    dateTimeRange: (start, end, options) => new Intl.DateTimeFormat(TICKETS_LOCALE, options).formatRange(start, end),
    number: (value, options) => new Intl.NumberFormat(TICKETS_LOCALE, options).format(value),
    list: (items, options) => new Intl.ListFormat(TICKETS_LOCALE, options).format(items),
  };
}
