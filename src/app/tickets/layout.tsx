import type { ReactNode } from 'react';
import { DetailPageLayout } from '@/components/DetailPageLayout';
import { siteConfig } from '@/config/site';
import { mapNavigationData, prefetchNavigation, prefetchSocials } from '@/lib/prefetch';

/** DeAI's navbar and footer around every ticket page: the list / checkout and the private token pages. */
export default async function TicketsLayout({ children }: { children: ReactNode }) {
  const [apiNav, socials] = await Promise.all([prefetchNavigation(), prefetchSocials()]);
  const navigationData = apiNav ? mapNavigationData(apiNav) : siteConfig.navigation;
  return (
    <DetailPageLayout navigationData={navigationData} navigationAPIData={apiNav || undefined} socials={socials} navTone="light">
      {children}
    </DetailPageLayout>
  );
}
