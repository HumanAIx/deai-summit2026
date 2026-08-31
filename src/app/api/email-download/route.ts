import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { prefetchCaptchaConfig, verifyCaptchaToken } from '@/lib/prefetch';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM =
  process.env.RESEND_FROM_EMAIL ||
  process.env.RESEND_FROM ||
  'contact@deaisummit.org';
const RESEND_FROM_NAME = process.env.RESEND_FROM_NAME || 'DeAI Summit';
const TENANT_SLUG = process.env.TENANT_SLUG || 'deaisummit';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PER_IP_PER_HOUR = 8;
const MAX_PER_EMAIL_PER_HOUR = 5;
const WINDOW_MS = 60 * 60 * 1000;
/**
 * Resend hard limit is 40MB *after* Base64 (~3/4 of that as raw bytes).
 * Our largest downloads are ~20.3MB flyers — keep headroom for HTML + encoding.
 */
const MAX_ATTACHMENT_BYTES = Math.floor(38 * 1024 * 1024 * 0.75); // ~29.1 MB raw

type RateBucket = { count: number; resetAt: number };
const ipBuckets = new Map<string, RateBucket>();
const emailBuckets = new Map<string, RateBucket>();

function takeToken(map: Map<string, RateBucket>, key: string, max: number): boolean {
  const now = Date.now();
  const existing = map.get(key);
  if (!existing || existing.resetAt <= now) {
    map.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (existing.count >= max) return false;
  existing.count += 1;
  return true;
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') || 'unknown';
}

function isAllowedDocumentUrl(url: string): boolean {
  try {
    // Relative /files/… paths are resolved against SITE_URL below.
    if (url.startsWith('/files/')) {
      return true;
    }
    const u = new URL(url);
    if (
      u.protocol === 'https:' &&
      u.hostname.endsWith('.supabase.co') &&
      u.pathname.includes(`/storage/v1/object/public/tenants/${TENANT_SLUG}/`)
    ) {
      return true;
    }
    const site = new URL(SITE_URL);
    if (u.origin === site.origin && u.pathname.startsWith('/files/')) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function resolveDocumentFetchUrl(url: string): string {
  if (url.startsWith('/files/')) {
    return new URL(url, SITE_URL.replace(/\/+$/, '') + '/').toString();
  }
  return url;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeFilename(name: string): string {
  const trimmed = name.trim() || 'document.pdf';
  return trimmed.replace(/[^\w.\-()+ ]+/g, '_');
}

function formatBrandDisplayName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return 'DeAI Summit';
  // Tenant app_name is often "DeAISummit" — present it as "DeAI Summit" in email.
  if (/^deaisummit$/i.test(trimmed.replace(/\s+/g, ''))) return 'DeAI Summit';
  return trimmed;
}

const EMAIL_LOGO_CID = 'deai-summit-logo';

type EmailBranding = {
  appName: string;
};

/** Tenant display name from ep-api public app-details. */
async function resolveEmailBranding(): Promise<EmailBranding> {
  const fallbackName = formatBrandDisplayName(RESEND_FROM_NAME || 'DeAI Summit');

  try {
    const apiBase = (process.env.NEXT_PUBLIC_GCONF_API_URL || '').replace(/\/+$/, '');
    const apiKey =
      process.env.GCONF_SITE_KEY ||
      process.env.GCONF_API_KEY ||
      process.env.NEXT_PUBLIC_GCONF_API_KEY ||
      '';
    if (!apiBase) return { appName: fallbackName };

    const res = await fetch(`${apiBase}/settings/public/app-details`, {
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        Accept: 'application/json',
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return { appName: fallbackName };

    const json = (await res.json()) as { data?: { app_name?: string } };
    return {
      appName: formatBrandDisplayName(json.data?.app_name || fallbackName),
    };
  } catch (err) {
    console.error('[email-download] branding fetch failed:', err);
    return { appName: fallbackName };
  }
}

/** Sharp horizontal wordmark, inlined via CID (avoids soft remote/favicon fetches). */
async function loadEmailLogoAttachment(): Promise<{
  filename: string;
  content: string;
  content_type: string;
  content_id: string;
} | null> {
  try {
    const filePath = path.join(
      process.cwd(),
      'public',
      'email-logo-deai-summit-dark.png',
    );
    const buffer = await readFile(filePath);
    return {
      filename: 'deai-summit-logo.png',
      content: buffer.toString('base64'),
      content_type: 'image/png',
      content_id: EMAIL_LOGO_CID,
    };
  } catch (err) {
    console.error('[email-download] logo file missing:', err);
    return null;
  }
}

function buildDownloadEmailHtml(options: {
  branding: EmailBranding;
  title: string;
  url: string;
  attached: boolean;
  logoSrc: string;
}): string {
  const brand = escapeHtml(options.branding.appName);
  const logoSrc = escapeHtml(options.logoSrc);
  const safeTitle = escapeHtml(options.title);
  const safeUrl = escapeHtml(options.url);
  const siteHome = escapeHtml(
    (process.env.NEXT_PUBLIC_SITE_URL?.includes('localhost')
      ? 'https://deaisummit.org'
      : SITE_URL
    ).replace(/\/+$/, ''),
  );

  const bodyCopy = options.attached
    ? `Thanks for your interest in <strong style="color:#050A1F;">${brand}</strong>. Your copy of <strong style="color:#050A1F;">${safeTitle}</strong> is attached to this email.`
    : `Thanks for your interest in <strong style="color:#050A1F;">${brand}</strong>. This file is too large to attach, so here’s a secure link to <strong style="color:#050A1F;">${safeTitle}</strong>.`;

  const ctaLabel = options.attached ? 'View online' : 'Download file';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>Your ${brand} download</title>
</head>
<body style="margin:0;padding:0;background-color:#F0F0EF;text-align:left;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background-color:#F0F0EF;">
    <tr>
      <td align="left" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="border-collapse:collapse;width:100%;max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td align="left" bgcolor="#050A1F" style="padding:18px 28px;background-color:#050A1F;">
              <a href="${siteHome}" style="text-decoration:none;">
                <img src="${logoSrc}" alt="${brand}" width="112" height="40" style="display:block;width:112px;height:40px;border:0;outline:none;" />
              </a>
            </td>
          </tr>
          <tr>
            <td align="left" style="height:4px;line-height:4px;font-size:0;background-color:#00B0C2;">&nbsp;</td>
          </tr>
          <tr>
            <td align="left" style="padding:28px 32px 8px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;text-align:left;">
              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.4;letter-spacing:0.08em;text-transform:uppercase;color:#00B0C2;font-weight:700;">
                Download ready
              </p>
              <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;font-weight:700;color:#050A1F;text-align:left;">
                Your ${brand} download
              </h1>
              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#475569;text-align:left;">
                ${bodyCopy}
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 24px 0;">
                <tr>
                  <td align="left" bgcolor="#00B0C2" style="border-radius:999px;">
                    <a href="${safeUrl}" style="display:inline-block;padding:12px 22px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#050A1F;text-decoration:none;border-radius:999px;">
                      ${ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;text-align:left;">
                Or open this link:<br />
                <a href="${safeUrl}" style="color:#00B0C2;word-break:break-all;text-decoration:underline;">${safeUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td align="left" style="padding:24px 32px 28px 32px;border-top:1px solid #EEF0F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;text-align:left;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;text-align:left;">
                If you didn’t request this, you can ignore this email.<br />
                © ${new Date().getFullYear()} ${brand}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function fetchDocumentBytes(url: string): Promise<{
  buffer: Buffer;
  contentType: string;
  filename: string;
} | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const buffer = Buffer.from(await res.arrayBuffer());
    const pathName = (() => {
      try {
        return decodeURIComponent(new URL(url).pathname.split('/').pop() || 'document.pdf');
      } catch {
        return 'document.pdf';
      }
    })();
    return { buffer, contentType, filename: sanitizeFilename(pathName) };
  } catch (err) {
    console.error('[email-download] fetch document failed:', err);
    return null;
  }
}

async function resolveByteSize(url: string, knownSize?: number): Promise<number | null> {
  if (typeof knownSize === 'number' && Number.isFinite(knownSize) && knownSize > 0) {
    return knownSize;
  }
  try {
    const head = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    const len = Number(head.headers.get('content-length') || 0);
    if (Number.isFinite(len) && len > 0) return len;
  } catch {
    /* ignore */
  }
  return null;
}

async function sendDocumentEmail(options: {
  to: string;
  title: string;
  url: string;
  filenameHint?: string;
  knownSize?: number;
}): Promise<'attached' | 'linked'> {
  if (!RESEND_API_KEY) {
    throw new Error('Email delivery is not configured');
  }

  const filename = sanitizeFilename(options.filenameHint || 'document.pdf');
  const byteSize = await resolveByteSize(options.url, options.knownSize);
  const tooLarge = byteSize != null && byteSize > MAX_ATTACHMENT_BYTES;

  // Prefer Resend fetching the public URL (avoids large base64 payloads on Vercel).
  // Fall back to inlined bytes only for relative /files proxy URLs.
  let attachViaPath = options.url.startsWith('https://') && !tooLarge;
  let inlineContent: string | null = null;
  let contentType: string | undefined;

  if (!attachViaPath && !tooLarge) {
    const file = await fetchDocumentBytes(options.url);
    if (file && file.buffer.byteLength > 0 && file.buffer.byteLength <= MAX_ATTACHMENT_BYTES) {
      inlineContent = file.buffer.toString('base64');
      contentType = file.contentType;
    }
  }

  const canAttach = attachViaPath || !!inlineContent;
  const branding = await resolveEmailBranding();
  const logoAttachment = await loadEmailLogoAttachment();
  const logoSrc = logoAttachment ? `cid:${EMAIL_LOGO_CID}` : `${SITE_URL.replace(/\/+$/, '')}/email-logo-deai-summit-dark.png`;
  const html = buildDownloadEmailHtml({
    branding,
    title: options.title,
    url: options.url,
    attached: canAttach,
    logoSrc,
  });

  const payload: Record<string, unknown> = {
    from: `${branding.appName} <${RESEND_FROM}>`,
    to: [options.to],
    subject: `Your download: ${options.title}`,
    html,
  };

  const attachments: Array<Record<string, string>> = [];
  if (logoAttachment) {
    attachments.push(logoAttachment);
  }
  if (attachViaPath) {
    attachments.push({ path: options.url, filename });
  } else if (inlineContent) {
    attachments.push({
      filename,
      content: inlineContent,
      ...(contentType ? { content_type: contentType } : {}),
    });
  }
  if (attachments.length) {
    payload.attachments = attachments;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('[email-download] Resend error:', res.status, body.slice(0, 300));
    let detail = 'Failed to send email';
    try {
      const parsed = JSON.parse(body) as { message?: string };
      if (parsed?.message) detail = parsed.message;
    } catch {
      /* keep generic */
    }
    throw new Error(detail);
  }

  return canAttach ? 'attached' : 'linked';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const documentUrl = typeof body.documentUrl === 'string' ? body.documentUrl.trim() : '';
    const documentTitle =
      typeof body.documentTitle === 'string' && body.documentTitle.trim()
        ? body.documentTitle.trim()
        : 'DeAI Summit document';
    const documentName =
      typeof body.documentName === 'string' && body.documentName.trim()
        ? body.documentName.trim()
        : undefined;
    const knownSize =
      typeof body.documentSize === 'number' && Number.isFinite(body.documentSize)
        ? body.documentSize
        : typeof body.documentSize === 'string' && Number.isFinite(Number(body.documentSize))
          ? Number(body.documentSize)
          : undefined;
    const captchaToken = typeof body.captchaToken === 'string' ? body.captchaToken : '';
    const honeypot = typeof body.website === 'string' ? body.website.trim() : '';
    // Post-gate unlock emails already passed captcha on the form submit.
    const skipCaptcha = body.skipCaptcha === true;

    if (honeypot) {
      return NextResponse.json({ success: true });
    }

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ success: false, error: 'Enter a valid email address.' }, { status: 400 });
    }
    if (!documentUrl || !isAllowedDocumentUrl(documentUrl)) {
      return NextResponse.json({ success: false, error: 'Invalid document.' }, { status: 400 });
    }

    const ip = clientIp(request);
    if (!takeToken(ipBuckets, ip, MAX_PER_IP_PER_HOUR)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests from this network. Please try again later.' },
        { status: 429 },
      );
    }
    if (!takeToken(emailBuckets, email, MAX_PER_EMAIL_PER_HOUR)) {
      return NextResponse.json(
        { success: false, error: 'Too many emails to this address. Please try again later.' },
        { status: 429 },
      );
    }

    if (!skipCaptcha) {
      const captchaConfig = await prefetchCaptchaConfig();
      const captchaRequired = captchaConfig.disabled !== true && !!captchaConfig.site_key;
      if (captchaRequired) {
        if (!captchaToken) {
          return NextResponse.json(
            { success: false, error: 'Please complete the captcha verification.' },
            { status: 400 },
          );
        }
        const valid = await verifyCaptchaToken(captchaToken);
        if (!valid) {
          return NextResponse.json(
            { success: false, error: 'Captcha verification failed. Please try again.' },
            { status: 400 },
          );
        }
      } else if (captchaToken) {
        const valid = await verifyCaptchaToken(captchaToken);
        if (!valid) {
          return NextResponse.json(
            { success: false, error: 'Captcha verification failed. Please try again.' },
            { status: 400 },
          );
        }
      }
    }

    const mode = await sendDocumentEmail({
      to: email,
      title: documentTitle,
      url: resolveDocumentFetchUrl(documentUrl),
      filenameHint: documentName,
      knownSize,
    });

    return NextResponse.json({
      success: true,
      mode,
      message:
        mode === 'attached'
          ? 'We emailed the document as an attachment.'
          : 'This file is too large to attach — we emailed you a download link instead.',
    });
  } catch (error) {
    console.error('[email-download] error:', error);
    if (error instanceof Error && error.message === 'Email delivery is not configured') {
      return NextResponse.json(
        { success: false, error: 'Email delivery is not configured on this site yet.' },
        { status: 500 },
      );
    }
    const message =
      error instanceof Error && error.message && error.message !== 'Failed to send email'
        ? error.message
        : 'Could not send the email. Please try again.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
