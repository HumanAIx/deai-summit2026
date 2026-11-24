/**
 * Opens a ticket page whose URL is a secret (the buyer's order link, a holder's ticket link) with a FULL page load,
 * never a client-side route change. On `/tickets` the site's analytics and ad pixels may be loaded, and GA4 / the Meta
 * pixel report every `history.pushState` as a page view — with the token in the URL. A real navigation drops them: the
 * private page's layout loads no tags (`shouldLoadAnalytics`, `isPrivateTicketPath`).
 */
export function openPrivateTicketPage({ path, location = window.location }: { path: string; location?: Pick<Location, "assign"> }): void {
  location.assign(path);
}
