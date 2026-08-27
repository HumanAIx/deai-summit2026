'use client';

import { useEffect } from 'react';

type ThirdPartyScriptsProps = {
  gtmId?: string;
  ga4Id?: string;
  linkedinPid?: string;
  redditBoot?: string;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    _linkedin_partner_id?: string;
    _linkedin_data_partner_ids?: string[];
    lintrk?: ((...args: unknown[]) => void) & { q?: unknown[] };
    rdt?: ((...args: unknown[]) => void) & { sendQueue?: unknown[] };
  }
}

function injectInlineScript(id: string, code: string) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('script');
  el.id = id;
  el.text = code;
  document.body.appendChild(el);
}

function injectExternalScript(
  id: string,
  src: string,
  attrs?: Record<string, string>,
) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('script');
  el.id = id;
  el.src = src;
  el.async = true;
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value);
    }
  }
  document.body.appendChild(el);
}

/**
 * Inject third-party scripts via the DOM instead of rendering <script> in JSX.
 * React 19 warns (and next/script still trips it) when script tags are rendered
 * as React children — especially inline analytics snippets.
 */
export function ThirdPartyScripts({
  gtmId,
  ga4Id,
  linkedinPid,
  redditBoot,
}: ThirdPartyScriptsProps) {
  useEffect(() => {
    if (gtmId) {
      injectInlineScript(
        'google-tag-manager',
        `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer',${JSON.stringify(gtmId)});`,
      );
    }

    if (ga4Id) {
      injectExternalScript(
        'google-analytics-src',
        `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`,
      );
      injectInlineScript(
        'google-analytics',
        `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', ${JSON.stringify(ga4Id)});`,
      );
    }

    if (linkedinPid) {
      injectInlineScript(
        'linkedin-partner',
        `_linkedin_partner_id = ${JSON.stringify(linkedinPid)};
window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
window._linkedin_data_partner_ids.push(_linkedin_partner_id);`,
      );
      injectInlineScript(
        'linkedin-insight',
        `(function(l) {
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
})(window.lintrk);`,
      );
    }

    if (redditBoot) {
      injectInlineScript(
        'reddit-pixel',
        `!function(w,d){if(!w.rdt){var p=w.rdt=function(){p.sendQueue.push(arguments)};p.sendQueue=[];var t=d.createElement("script");t.src="https://www.redditstatic.com/ads/pixel.js";t.async=!0;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)}}(window,document);
window.rdt('init',${JSON.stringify(redditBoot)});
window.rdt('track','PageVisit');`,
      );
    }

    injectExternalScript('bitpull-widget', 'https://bitpull.ai/widget/template.js', {
      'data-key': 'cmt2vdx1z00m40vmjcl2v42ny',
      'data-lang': 'en',
      'data-modes': 'both',
      'data-color': '#7b61ff',
      'data-label': 'DEAI Summit',
      'data-title': 'Event Assistant',
      'data-teasers': 'How can I help you?|Questions about your stay?',
    });
  }, [gtmId, ga4Id, linkedinPid, redditBoot]);

  return null;
}
