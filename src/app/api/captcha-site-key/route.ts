import { NextResponse } from 'next/server';
import { prefetchCaptchaConfig } from '@/lib/prefetch';

/**
 * The site's captcha provider and PUBLIC site key for the ticket checkout's `CaptchaWidget` (a client component that
 * cannot hold the API key). Same ep-api read (`/settings/public/captcha`) the contact and download forms use.
 */
export async function GET() {
  const data = await prefetchCaptchaConfig();
  return NextResponse.json({ provider: data.provider, site_key: data.site_key, disabled: data.disabled });
}
