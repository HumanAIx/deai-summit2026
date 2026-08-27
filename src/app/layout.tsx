import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import "remixicon/fonts/remixicon.css";
import { ThirdPartyScripts } from "@/components/ThirdPartyScripts";
import { prefetchPublicAnalyticsTags } from "@/lib/prefetch";
import { resolveRedditBootstrapId } from "@/lib/analytics-tags";
import { SEO_DEFAULTS, buildSocialMetadata } from "@/lib/seo-defaults";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://deaisummit.org";

export async function generateMetadata(): Promise<Metadata> {
  const tags = await prefetchPublicAnalyticsTags();
  const meta: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: SEO_DEFAULTS.defaultTitle,
    description: SEO_DEFAULTS.defaultDescription,
    ...buildSocialMetadata({
      title: SEO_DEFAULTS.defaultTitle,
      description: SEO_DEFAULTS.defaultDescription,
      baseUrl: SITE_URL,
    }),
  };
  if (tags.googleSiteVerification) {
    meta.verification = { google: tags.googleSiteVerification };
  }
  return meta;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tags = await prefetchPublicAnalyticsTags();
  const gtmId = tags.gtmId;
  const ga4Id = tags.ga4MeasurementId;
  const linkedinPid = tags.linkedinPartnerId;
  const redditBoot = resolveRedditBootstrapId(tags);

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${playfair.variable} antialiased`}
        suppressHydrationWarning
      >
        {gtmId ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(gtmId)}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
              title="Google Tag Manager"
            />
          </noscript>
        ) : null}

        {linkedinPid ? (
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              alt=""
              src={`https://px.ads.linkedin.com/collect/?pid=${encodeURIComponent(linkedinPid)}&fmt=gif`}
            />
          </noscript>
        ) : null}

        {children}

        <ThirdPartyScripts
          gtmId={gtmId || undefined}
          ga4Id={ga4Id || undefined}
          linkedinPid={linkedinPid || undefined}
          redditBoot={redditBoot || undefined}
        />
      </body>
    </html>
  );
}
