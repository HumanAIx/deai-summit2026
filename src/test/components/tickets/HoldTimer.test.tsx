import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HoldTimer, HoldTimerView } from "../../../components/tickets/checkout/HoldTimer";
import { axeViolations, describeViolations } from "../../helpers/axe";
import { render, screen } from "../../test-utils";

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
