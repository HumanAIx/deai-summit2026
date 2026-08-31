import { NextResponse } from 'next/server';

const EXTERNAL_API_URL = process.env.NEXT_PUBLIC_GCONF_API_URL || '';
const API_KEY =
  process.env.GCONF_SITE_KEY ||
  process.env.GCONF_API_KEY ||
  process.env.NEXT_PUBLIC_GCONF_API_KEY ||
  '';

type RouteContext = { params: Promise<{ idOrSlug: string }> };

/**
 * Thin proxy to ep-api `POST /forms/:idOrSlug/email-document`.
 * Resend + attachment delivery live on ep-api (tenant Resend config).
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { idOrSlug } = await context.params;
    if (!idOrSlug?.trim()) {
      return NextResponse.json({ success: false, error: 'Missing form.' }, { status: 400 });
    }
    if (!EXTERNAL_API_URL || !API_KEY) {
      return NextResponse.json(
        { success: false, error: 'API is not configured.' },
        { status: 500 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const submissionId =
      typeof body.submission_id === 'string'
        ? body.submission_id
        : typeof body.submissionId === 'string'
          ? body.submissionId
          : '';
    const documentPath =
      typeof body.document_path === 'string'
        ? body.document_path
        : typeof body.documentPath === 'string'
          ? body.documentPath
          : '';
    const email =
      typeof body.email === 'string' && body.email.trim()
        ? body.email.trim().toLowerCase()
        : undefined;

    if (!submissionId || !documentPath) {
      return NextResponse.json(
        { success: false, error: 'Missing submission or document.' },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${EXTERNAL_API_URL}/forms/${encodeURIComponent(idOrSlug.trim())}/email-document`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          submission_id: submissionId,
          document_path: documentPath,
          ...(email ? { email } : {}),
        }),
      },
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || data.message || 'Could not send the email. Please try again.',
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      mode: 'attached',
      message: 'We emailed the document as an attachment.',
      data: data.data ?? { delivered: true },
    });
  } catch (error) {
    console.error('[email-document proxy] error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
