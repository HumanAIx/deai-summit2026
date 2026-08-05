import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo-defaults';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://deaisummit.org';

export const metadata: Metadata = generatePageMetadata(null, 'coming-soon', BASE_URL);

export default function ComingSoonLayout({ children }: { children: React.ReactNode }) {
  return children;
}
