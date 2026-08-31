import { NextResponse } from 'next/server';

const EXTERNAL_API_URL = process.env.NEXT_PUBLIC_GCONF_API_URL || '';
const API_KEY =
  process.env.GCONF_SITE_KEY ||
  process.env.GCONF_API_KEY ||
  process.env.NEXT_PUBLIC_GCONF_API_KEY ||
  '';

type RouteContext = { params: Promise<{ idOrSlug: string }> };

/**
 * Thin proxy to ep-api form submit — used by the downloads gate dialog.
 * Captcha, rate limits, and email notifications are handled by ep-api.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { idOrSlug } = await context.params;
    if (!idOrSlug?.trim()) {
      return NextResponse.json({ success: false, error: 'Missing form.' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const captchaToken =
      typeof body.captchaToken === 'string'
        ? body.captchaToken
        : typeof body.captcha_token === 'string'
          ? body.captcha_token
          : undefined;
    const submissionData =
      body.submission_data && typeof body.submission_data === 'object'
        ? body.submission_data
        : (() => {
            const {
              captchaToken: _a,
              captcha_token: _b,
              formSlug: _c,
              formId: _d,
              download_request: _e,
              ...rest
            } = body;
            return rest;
          })();

    if (!submissionData || typeof submissionData !== 'object' || Object.keys(submissionData).length === 0) {
      return NextResponse.json({ success: false, error: 'Missing form fields.' }, { status: 400 });
    }

    const downloadRequest =
      body.download_request && typeof body.download_request === 'object'
        ? body.download_request
        : undefined;

    const response = await fetch(
      `${EXTERNAL_API_URL}/forms/${encodeURIComponent(idOrSlug.trim())}/submit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
        },
        body: JSON.stringify({
          submission_data: submissionData,
          captcha_token: captchaToken,
          ...(downloadRequest ? { download_request: downloadRequest } : {}),
        }),
      },
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to submit form' },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      message: data.message || 'Submitted successfully',
      data: data.data ?? null,
    });
  } catch (error) {
    console.error('[forms submit proxy] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
