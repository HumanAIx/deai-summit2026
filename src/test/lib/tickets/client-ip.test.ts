import { describe, expect, it } from "vitest";
import { CLIENT_IP_HEADER, clientIpHeaders, forwardedClientIp } from "../../../lib/tickets/client-ip";

describe("forwardedClientIp", () => {
  it("takes the first hop of x-forwarded-for", () => {
    expect(forwardedClientIp({ headers: new Headers({ "x-forwarded-for": " 203.0.113.9 , 10.0.0.1" }) })).toBe("203.0.113.9");
  });
  it("is undefined (never a placeholder) when absent or empty", () => {
    expect(forwardedClientIp({ headers: new Headers() })).toBeUndefined();
    expect(forwardedClientIp({ headers: new Headers({ "x-forwarded-for": "" }) })).toBeUndefined();
  });
});

describe("clientIpHeaders", () => {
  it("sends x-gconf-client-ip only when the IP is known", () => {
    expect(CLIENT_IP_HEADER).toBe("x-gconf-client-ip");
    expect(clientIpHeaders({ ip: "203.0.113.9" })).toEqual({ "x-gconf-client-ip": "203.0.113.9" });
    expect(clientIpHeaders({ ip: undefined })).toEqual({});
  });
});
