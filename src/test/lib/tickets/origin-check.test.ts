import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "../../../lib/tickets/origin-check";

function req(headers: Record<string, string>) {
  return new Request("http://localhost/api/tickets/x", { method: "POST", headers });
}

describe("isSameOriginRequest", () => {
  it("allows a request whose Origin host is the request host", () => {
    expect(isSameOriginRequest({ request: req({ host: "acme.example", origin: "https://acme.example" }) })).toBe(true);
  });

  it("allows a request with no Origin (not a browser cross-site POST)", () => {
    expect(isSameOriginRequest({ request: req({ host: "acme.example" }) })).toBe(true);
  });

  it("refuses another host, another subdomain, another port", () => {
    expect(isSameOriginRequest({ request: req({ host: "acme.example", origin: "https://evil.example" }) })).toBe(false);
    expect(isSameOriginRequest({ request: req({ host: "acme.example", origin: "https://www.acme.example" }) })).toBe(false);
    expect(isSameOriginRequest({ request: req({ host: "localhost:3003", origin: "http://localhost:3000" }) })).toBe(false);
  });

  it("refuses a null / malformed Origin and an Origin with no Host", () => {
    expect(isSameOriginRequest({ request: req({ host: "acme.example", origin: "null" }) })).toBe(false);
    expect(isSameOriginRequest({ request: req({ origin: "https://acme.example" }) })).toBe(false);
  });

  it("compares hosts case-insensitively and ignores the scheme", () => {
    expect(isSameOriginRequest({ request: req({ host: "Acme.Example", origin: "http://acme.example" }) })).toBe(true);
  });
});
