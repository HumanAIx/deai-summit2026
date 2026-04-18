import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LegalPageShell } from '@/components/LegalPageShell';
import { siteConfig } from '@/config/site';
import {
  prefetchCMSPage,
  prefetchNavigation,
  prefetchSocials,
  mapNavigationData,
} from '@/lib/prefetch';
import type { CMSBlock } from '@/lib/api-types';

export default async function PrivacyPage() {
  const [cmsPage, apiNav, socials] = await Promise.all([
    prefetchCMSPage('privacy-statement'),
    prefetchNavigation(),
    prefetchSocials(),
  ]);

  const navigationData = apiNav ? mapNavigationData(apiNav) : siteConfig.navigation;

  const rawBlocks = cmsPage?.content?.blocks;
  const blocks: CMSBlock[] = Array.isArray(rawBlocks)
    ? (rawBlocks as CMSBlock[])
    : rawBlocks
      ? (Object.values(rawBlocks) as CMSBlock[])
      : [];

  const firstBlock = blocks.find((b) => (b as Record<string, unknown>).published !== false);
  const title = (firstBlock?.title as string) || 'Privacy Statement';
  const body = (firstBlock?.content as string) || '';

  return (
    <LegalPageShell
      title={title}
      navigationData={navigationData}
      navigationAPIData={apiNav || undefined}
      socials={socials}
    >
      {body ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
      ) : (
        <p className="text-slate-500">This page hasn&apos;t been published yet.</p>
      )}
    </LegalPageShell>
  );
}
