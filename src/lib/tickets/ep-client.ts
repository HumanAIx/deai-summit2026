import 'server-only';

/**
 * The one module the ticket pages and `/api/tickets/*` handlers use to call ep-api (same contract as GConf.ai's
 * renderer client, so the ported ticket code stays unchanged).
 *
 * - Base URL: `NEXT_PUBLIC_GCONF_API_URL` (already ends in `/api`); ticket calls go to `{base}/site/...`.
 * - Auth: `Authorization: Bearer ${GCONF_SITE_KEY}` only. Ticket routes need an `sk_site_*` key (a tenant key answers
 *   403 SITE_REQUIRED), so there is deliberately NO fallback to `GCONF_API_KEY` here: without a site key every call
 *   fails closed and the pages show "not on sale".
 * - Every call carries `?locale=`; errors become `EpApiError` (status + ep-api `code` + `details`), never the raw fetch
 *   error, and the key never appears in a message.
 */

const DEFAULT_TIMEOUT_MS = 15_000;

export class EpApiError extends Error {
  readonly status: number;
  readonly path: string;
  readonly apiMessage: string;
  readonly code: string | undefined;
  readonly details: Record<string, unknown> | undefined;

  constructor(status: number, path: string, message: string, code?: string, details?: Record<string, unknown>) {
    super(`ep-api ${status} on ${path}: ${message}`);
    this.name = 'EpApiError';
    this.status = status;
    this.path = path;
    this.apiMessage = message;
    this.code = code;
    this.details = details;
  }
}

export interface EpFetchOptions {
  locale: string;
  searchParams?: Record<string, string | number | boolean | undefined>;
  next?: { revalidate?: number | false; tags?: string[] };
  timeoutMs?: number;
  /** A sibling of `/api/site` (e.g. `/api/settings`): same key and error handling, another base path. */
  basePath?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  body?: unknown;
  cache?: 'no-store';
  headers?: Record<string, string>;
  /** Accepted for signature compatibility with the renderer; DeAI is one site, so the env key is always used. */
  siteKey?: string | undefined;
  _retried?: boolean;
}

function apiRoot(): string {
  const raw = process.env.NEXT_PUBLIC_GCONF_API_URL?.trim() ?? '';
  if (!raw) throw new EpApiError(0, '', 'NEXT_PUBLIC_GCONF_API_URL is not set');
  return raw.replace(/\/+$/, '');
}

function siteKey(): string {
  const key = process.env.GCONF_SITE_KEY?.trim() ?? '';
  if (!key) throw new EpApiError(0, '', 'GCONF_SITE_KEY is not set');
  return key;
}

function buildUrl(path: string, options: EpFetchOptions): string {
  const root = apiRoot();
  // `basePath` is given the renderer's way (`/api/settings`); our root already ends in `/api`.
  const base = options.basePath ? `${root}${options.basePath.replace(/^\/api(?=\/|$)/, '')}` : `${root}/site`;
  const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
  url.searchParams.set('locale', options.locale);
  for (const [key, value] of Object.entries(options.searchParams ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function send(path: string, options: EpFetchOptions): Promise<Response> {
  const url = buildUrl(path, options);
  const key = siteKey();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        ...options.headers,
        Authorization: `Bearer ${key}`,
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      signal: controller.signal,
      ...(options.cache ? { cache: options.cache } : {}),
      ...(options.next && !options.cache ? { next: options.next } : {}),
    });
  } catch (err) {
    throw new EpApiError(0, path, err instanceof Error ? err.message : 'network error');
  } finally {
    clearTimeout(timeout);
  }
  // Retry a GET once on 5xx; never a write (it may already have been committed).
  if (response.status >= 500 && !options._retried && (options.method ?? 'GET') === 'GET') {
    return send(path, { ...options, _retried: true });
  }
  return response;
}

interface ErrorBody {
  success?: boolean;
  data?: unknown;
  error?: string;
  code?: string;
  details?: unknown;
}

async function readBody(response: Response): Promise<ErrorBody> {
  return (await response.json().catch(() => ({}))) as ErrorBody;
}

function detailsOf(body: ErrorBody): Record<string, unknown> | undefined {
  const details = body.details;
  return typeof details === 'object' && details !== null && !Array.isArray(details) ? (details as Record<string, unknown>) : undefined;
}

export async function epFetch<T>(path: string, options: EpFetchOptions): Promise<T> {
  const response = await send(path, options);
  const body = await readBody(response);
  if (!response.ok || body.success === false) {
    throw new EpApiError(response.status, path, body.error ?? response.statusText, body.code, detailsOf(body));
  }
  return body.data as T;
}

export interface EpRawResponse {
  body: ArrayBuffer;
  contentType: string | null;
  contentDisposition: string | null;
}

export async function epFetchRaw(path: string, options: EpFetchOptions): Promise<EpRawResponse> {
  const response = await send(path, options);
  if (!response.ok) {
    const body = await readBody(response);
    throw new EpApiError(response.status, path, body.error ?? response.statusText, body.code, detailsOf(body));
  }
  return {
    body: await response.arrayBuffer(),
    contentType: response.headers.get('content-type'),
    contentDisposition: response.headers.get('content-disposition'),
  };
}
