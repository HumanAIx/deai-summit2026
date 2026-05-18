import Script from "next/script";

import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import "remixicon/fonts/remixicon.css";
import { prefetchPublicAnalyticsTags } from "@/lib/prefetch";
import { resolveRedditBootstrapId } from "@/lib/analytics-tags";

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

export async function generateMetadata(): Promise<Metadata> {
  const tags = await prefetchPublicAnalyticsTags();
  const meta: Metadata = {
    title: "DeAI Summit 2026 - Malta",
    description:
      "Join the Decentralized AI Summit 2026 in Malta. The premier event for the future of AI.",
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

  const gtmScript =
    gtmId.length > 0
      ? `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer',${JSON.stringify(gtmId)});`
      : "";

  const redditScript =
    redditBoot.length > 0
      ? `!function(w,d){if(!w.rdt){var p=w.rdt=function(){p.sendQueue.push(arguments)};p.sendQueue=[];var t=d.createElement("script");t.src="https://www.redditstatic.com/ads/pixel.js";t.async=!0;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)}}(window,document);
window.rdt('init',${JSON.stringify(redditBoot)});
window.rdt('track','PageVisit');`
      : "";

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

        {gtmId ? (
          <Script id="google-tag-manager" strategy="beforeInteractive">
            {gtmScript}
          </Script>
        ) : null}

        {ga4Id ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', ${JSON.stringify(ga4Id)});
              `}
            </Script>
          </>
        ) : null}

        {linkedinPid ? (
          <>
            <Script id="linkedin-partner" strategy="afterInteractive">
              {`
            _linkedin_partner_id = ${JSON.stringify(linkedinPid)};
            window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
            window._linkedin_data_partner_ids.push(_linkedin_partner_id);
              `}
            </Script>
            <Script id="linkedin-insight" strategy="afterInteractive">
              {`
            (function(l) {
              if (!l) {
                window.lintrk = function(a, b) { window.lintrk.q.push([a, b]); };
                window.lintrk.q = [];
              }
              var s = document.getElementsByTagName("script")[0];
              var b = document.createElement("script");
              b.type = "text/javascript";
              b.async = true;
              b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
              s.parentNode.insertBefore(b, s);
            })(window.lintrk);
              `}
            </Script>
            <noscript>
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                alt=""
                src={`https://px.ads.linkedin.com/collect/?pid=${encodeURIComponent(linkedinPid)}&fmt=gif`}
              />
            </noscript>
          </>
        ) : null}

        {redditBoot ? (
          <Script id="reddit-pixel" strategy="afterInteractive">
            {redditScript}
          </Script>
        ) : null}

        {children}
      </body>
    </html>
  );
}
