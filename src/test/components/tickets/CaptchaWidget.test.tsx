import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../../test-utils";

type Grecaptcha = { ready: (cb: () => void) => void; execute: ReturnType<typeof vi.fn> };
const win = window as unknown as { grecaptcha?: Grecaptcha };

let CaptchaWidget: typeof import("../../../components/tickets/CaptchaWidget").CaptchaWidget;

const flush = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
const scripts = () => Array.from(document.querySelectorAll("script")).filter((s) => s.src.includes("recaptcha"));

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules(); // the script load is cached per page: each test starts a "fresh page"
  document.head.innerHTML = "";
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ site_key: "SITE KEY/1", disabled: false }))));
  ({ CaptchaWidget } = await import("../../../components/tickets/CaptchaWidget"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete win.grecaptcha;
});

describe("CaptchaWidget, reCAPTCHA v3", () => {
  function mountV3({ execute = vi.fn().mockResolvedValue("tok-1") } = {}) {
    win.grecaptcha = { ready: (cb) => cb(), execute };
    const onToken = vi.fn();
    const onUnavailable = vi.fn();
    const view = render(<CaptchaWidget provider="recaptcha-v3" onToken={onToken} onUnavailable={onUnavailable} />);
    return { onToken, onUnavailable, execute, ...view };
  }

  it("loads api.js?render=<siteKey> (encoded), then grecaptcha.ready → execute(siteKey, { action: 'ticket_order' }) and reports the token", async () => {
    const { onToken, execute, container } = mountV3();
    await flush();
    const [script] = scripts();
    expect(script?.src).toBe("https://www.google.com/recaptcha/api.js?render=SITE%20KEY%2F1");
    await act(async () => {
      script?.onload?.(new Event("load"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(execute).toHaveBeenCalledWith("SITE KEY/1", { action: "ticket_order" });
    expect(onToken).toHaveBeenCalledWith("tok-1");
    expect(container).toBeEmptyDOMElement(); // invisible: renders nothing
  });

  it("refreshes the token every 90 seconds, and stops after unmount", async () => {
    const execute = vi.fn().mockResolvedValueOnce("tok-1").mockResolvedValueOnce("tok-2").mockResolvedValue("tok-3");
    const { onToken, unmount } = mountV3({ execute });
    await flush();
    await act(async () => {
      scripts()[0]?.onload?.(new Event("load"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(execute).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(89_000);
    });
    expect(execute).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(execute).toHaveBeenCalledTimes(2);
    expect(onToken).toHaveBeenLastCalledWith("tok-2");
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300_000);
    });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("an execute rejection (e.g. a refused key) fails open, says so in words and logs it; no token", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { onToken, onUnavailable, container } = mountV3({ execute: vi.fn().mockRejectedValue(new Error("nope")) });
    await flush();
    await act(async () => {
      scripts()[0]?.onload?.(new Event("load"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(onUnavailable).toHaveBeenCalledTimes(1);
    expect(onToken).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')?.textContent).toMatch(/security check could not load/);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("recaptcha-v3 could not run"));
    warn.mockRestore();
  });

  it("a script that fails to load calls onUnavailable", async () => {
    const { onUnavailable } = mountV3();
    await flush();
    await act(async () => {
      scripts()[0]?.onerror?.(new Event("error"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(onUnavailable).toHaveBeenCalledTimes(1);
  });

  it("a site with the captcha disabled calls onUnavailable without loading a script", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ site_key: "", disabled: true }))));
    const { onUnavailable } = mountV3();
    await flush();
    expect(onUnavailable).toHaveBeenCalledTimes(1);
    expect(scripts()).toHaveLength(0);
  });
});

describe("CaptchaWidget, the other providers keep their explicit render script", () => {
  it("reCAPTCHA v2 uses render=explicit and draws its labelled container", async () => {
    const view = render(<CaptchaWidget provider="recaptcha" onToken={vi.fn()} onUnavailable={vi.fn()} />);
    await flush();
    expect(scripts()[0]?.src).toBe("https://www.google.com/recaptcha/api.js?render=explicit");
    expect(view.container.querySelector('[role="group"]')).not.toBeNull();
  });

  type V2 = { ready: (cb: () => void) => void; render: ReturnType<typeof vi.fn> };
  async function mountV2(renderImpl: (el: HTMLElement, params: Record<string, unknown>) => number) {
    const v2 = win as unknown as { grecaptcha?: V2 };
    v2.grecaptcha = { ready: (cb) => cb(), render: vi.fn(renderImpl) };
    const onUnavailable = vi.fn();
    const view = render(<CaptchaWidget provider="recaptcha" onToken={vi.fn()} onUnavailable={onUnavailable} />);
    await flush();
    await act(async () => {
      scripts()[0]?.onload?.(new Event("load"));
      await vi.advanceTimersByTimeAsync(0);
    });
    return { onUnavailable, view, render: v2.grecaptcha.render };
  }

  it("v2: the provider's error-callback (e.g. 'Invalid key type') replaces the box with a message, logged, fail open", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    let params: Record<string, unknown> = {};
    const { onUnavailable, view } = await mountV2((_el, p) => {
      params = p;
      return 0;
    });
    expect(typeof params["error-callback"]).toBe("function");
    await act(async () => {
      (params["error-callback"] as () => void)();
    });
    expect(onUnavailable).toHaveBeenCalledTimes(1);
    expect(view.container.querySelector('[role="group"]')).toBeNull();
    expect(view.container.querySelector('[role="alert"]')?.textContent).toMatch(/security check could not load/);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("v2: a render that throws (a key the provider refuses outright) is the same message, never a dead box", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { onUnavailable, view } = await mountV2(() => {
      throw new Error("Invalid site key");
    });
    expect(onUnavailable).toHaveBeenCalledTimes(1);
    expect(view.container.querySelector('[role="alert"]')).not.toBeNull();
    warn.mockRestore();
  });
});
