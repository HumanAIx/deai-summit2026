import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HoldTimer, HoldTimerView } from "../../../components/tickets/checkout/HoldTimer";
import { axeViolations, describeViolations } from "../../helpers/axe";
import { fireEvent, render, screen } from "../../test-utils";

describe("HoldTimerView", () => {
  it("shows the countdown as mm:ss in a timer that does not announce every second", async () => {
    const { container } = render(<HoldTimerView remainingMs={9 * 60_000 + 5_000} />);
    const timer = screen.getByRole("timer");
    expect(timer).toHaveTextContent("09:05");
    expect(timer).toHaveAttribute("aria-live", "off");
    expect(screen.getByText("Your tickets are reserved for")).toBeInTheDocument();
    expect(describeViolations(await axeViolations({ container }))).toEqual([]);
  });

  it("speaks only at 5, 2 and 1 minute left (a polite status line), and is silent otherwise", () => {
    const { rerender } = render(<HoldTimerView remainingMs={4 * 60_000 + 30_000} />);
    expect(screen.getByRole("status")).toHaveTextContent("5 minutes left to complete your payment.");
    rerender(<HoldTimerView remainingMs={90_000} />);
    expect(screen.getByRole("status")).toHaveTextContent("2 minutes left to complete your payment.");
    rerender(<HoldTimerView remainingMs={30_000} />);
    expect(screen.getByRole("status")).toHaveTextContent("1 minute left to complete your payment.");
    rerender(<HoldTimerView remainingMs={8 * 60_000} />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    rerender(<HoldTimerView remainingMs={0} />);
    expect(screen.getByRole("timer")).toHaveTextContent("00:00");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});

describe("HoldTimer (the clock)", () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date("2030-01-01T10:00:00Z") }));
  afterEach(() => vi.useRealTimers());

  it("counts down each second and calls onExpire exactly once at zero", async () => {
    const onExpire = vi.fn();
    render(<HoldTimer until="2030-01-01T10:00:03Z" onExpire={onExpire} />);
    expect(screen.getByRole("timer")).toHaveTextContent("00:03");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(screen.getByRole("timer")).toHaveTextContent("00:01");
    expect(onExpire).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(screen.getByRole("timer")).toHaveTextContent("00:00");
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("a deadline that has already passed expires at the first tick", async () => {
    const onExpire = vi.fn();
    render(<HoldTimer until="2030-01-01T09:59:00Z" onExpire={onExpire} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });
});

describe("HoldTimer warning and Extend", () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date("2030-01-01T10:00:00Z") }));
  afterEach(() => vi.useRealTimers());

  const END_IN_90S = "2030-01-01T10:01:30Z";
  const END_IN_5MIN = "2030-01-01T10:05:00Z";

  it("shows nothing but the clock while more than 2 minutes remain", () => {
    render(<HoldTimer until={END_IN_5MIN} onExpire={vi.fn()} canExtend onExtend={vi.fn()} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Extend" })).not.toBeInTheDocument();
  });

  it("the warning appears once the last 2 minutes begin", async () => {
    render(<HoldTimer until="2030-01-01T10:02:02Z" onExpire={vi.fn()} canExtend onExtend={vi.fn()} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Your reservation ends soon. Need more time?");
  });

  it("canExtend + onExtend: an Extend button calls onExtend, shows 'Extending…' while pending, then settles", async () => {
    let resolve: (ok: boolean) => void = () => undefined;
    const onExtend = vi.fn(() => new Promise<boolean>((r) => (resolve = r)));
    render(<HoldTimer until={END_IN_90S} onExpire={vi.fn()} canExtend onExtend={onExtend} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Extend" }));
    expect(onExtend).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Extending…" })).toBeDisabled();
    await act(async () => resolve(true));
    expect(screen.getByRole("button", { name: "Extend" })).toBeEnabled();
    expect(screen.queryByText(/couldn't extend/)).not.toBeInTheDocument();
  });

  it("shows an error text when onExtend resolves false", async () => {
    const onExtend = vi.fn().mockResolvedValue(false);
    render(<HoldTimer until={END_IN_90S} onExpire={vi.fn()} canExtend onExtend={onExtend} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Extend" }));
    });
    expect(screen.getByText("We couldn't extend your reservation. Finish paying before the time runs out.")).toBeInTheDocument();
  });

  it("canExtend=false: the 'can't be extended any further' text and no button", () => {
    render(<HoldTimer until={END_IN_90S} onExpire={vi.fn()} canExtend={false} onExtend={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("can't be extended any further");
    expect(screen.queryByRole("button", { name: "Extend" })).not.toBeInTheDocument();
  });

  it("without onExtend there is no button even when canExtend", () => {
    render(<HoldTimer until={END_IN_90S} onExpire={vi.fn()} canExtend />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("the warning is gone once the hold has expired", async () => {
    render(<HoldTimer until="2030-01-01T10:00:02Z" onExpire={vi.fn()} canExtend onExtend={vi.fn()} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
