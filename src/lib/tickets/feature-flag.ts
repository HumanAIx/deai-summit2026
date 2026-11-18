/**
 * `TICKETS_CHECKOUT_ENABLED=true` switches DeAI from the Luma ticket page to the live GConf.ai checkout: the live list
 * on `/tickets`, the private token pages under `/tickets/*`, the `/api/tickets/*` handlers and the CMS Tickets
 * section. Off (the default), `/tickets` is the CMS page with Luma links and every new ticket route answers 404.
 * Server-only on purpose: the browser never decides whether tickets are sold.
 */
export function ticketsCheckoutEnabled(): boolean {
  return process.env.TICKETS_CHECKOUT_ENABLED?.trim().toLowerCase() === 'true';
}
