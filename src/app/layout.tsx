import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import "remixicon/fonts/remixicon.css";
import { ThirdPartyScripts } from "@/components/ThirdPartyScripts";
import { NavigationLoader } from "@/components/NavigationLoader";
import { prefetchPublicAnalyticsTags } from "@/lib/prefetch";
import { resolveRedditBootstrapId } from "@/lib/analytics-tags";
import { SEO_DEFAULTS, buildSocialMetadata } from "@/lib/seo-defaults";
import { heroMenuScaleBoot } from "@/lib/heroMenuScale";

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
const GA4_MEASUREMENT_ID = "G-10XNHM2ZWW";
const GOOGLE_ADS_ID = "AW-18489910387";
const FACEBOOK_PIXEL_ID = "2771836733083164";

/** Meta base pixel. Runs from the document head on every page. */
const facebookPixelBoot = `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${JSON.stringify(FACEBOOK_PIXEL_ID)});
fbq('track', 'PageView');`;

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
  const ga4Id = tags.ga4MeasurementId || GA4_MEASUREMENT_ID;
  const linkedinPid = tags.linkedinPartnerId;
  const redditBoot = resolveRedditBootstrapId(tags);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: heroMenuScaleBoot }} />
        <script dangerouslySetInnerHTML={{ __html: facebookPixelBoot }} />
      </head>
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

        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            alt=""
            src={`https://www.facebook.com/tr?id=${encodeURIComponent(FACEBOOK_PIXEL_ID)}&ev=PageView&noscript=1`}
          />
        </noscript>

        {children}
        <NavigationLoader />

        <ThirdPartyScripts
          gtmId={gtmId || undefined}
          ga4Id={ga4Id}
          googleAdsId={GOOGLE_ADS_ID}
          linkedinPid={linkedinPid || undefined}
          redditBoot={redditBoot || undefined}
        />
      </body>
    </html>
  );
}
