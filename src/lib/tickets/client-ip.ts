/** Header ep-api accepts from site-key callers: the buyer's address, for its own per-IP limits. */
export const CLIENT_IP_HEADER = "x-gconf-client-ip";

/** First hop of `x-forwarded-for`, or `undefined` when there is none (never a made-up placeholder). */
export function forwardedClientIp({ headers }: { headers: { get(name: string): string | null } }): string | undefined {
  const first = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first ? first : undefined;
}

/** The headers a tickets ep-api call adds for the buyer's IP (empty when unknown). */
export function clientIpHeaders({ ip }: { ip: string | undefined }): Record<string, string> {
  return ip ? { [CLIENT_IP_HEADER]: ip } : {};
}
