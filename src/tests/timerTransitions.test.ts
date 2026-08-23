// ─────────────────────────────────────────────────────────────────────────────
// timerTransitions.test.ts — Timer state machine tests (blueprint §5.5)
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { makeIdleTimer, startTimer, resetTimer } from "@/audio/timer";
import type { TimerState } from "@/state/mixSchema";

describe("makeIdleTimer", () => {
  it("creates a timer in idle status", () => {
    const t = makeIdleTimer();
    expect(t.status).toBe("idle");
  });

  it("sets enabled to false", () => {
    const t = makeIdleTimer();
    expect(t.enabled).toBe(false);
  });

  it("uses provided duration", () => {
    const t = makeIdleTimer(3600, 5);
    expect(t.durationSec).toBe(3600);
    expect(t.fadeSec).toBe(5);
  });

  it("has no startedAt", () => {
    const t = makeIdleTimer();
    expect(t.startedAt).toBeUndefined();
  });
});

describe("startTimer", () => {
  it("transitions status from idle to running", () => {
    const idle = makeIdleTimer(1800);
    const running = startTimer(idle);
    expect(running.status).toBe("running");
  });

  it("sets enabled to true", () => {
    const idle = makeIdleTimer();
    const running = startTimer(idle);
    expect(running.enabled).toBe(true);
  });

  it("sets startedAt to a number", () => {
    const idle = makeIdleTimer();
    const before = performance.now();
    const running = startTimer(idle);
    const after = performance.now();
    expect(running.startedAt).toBeGreaterThanOrEqual(before);
    expect(running.startedAt).toBeLessThanOrEqual(after);
  });

  it("preserves durationSec and fadeSec", () => {
    const idle = makeIdleTimer(2700, 10);
    const running = startTimer(idle);
    expect(running.durationSec).toBe(2700);
    expect(running.fadeSec).toBe(10);
  });

  it("is immutable — does not mutate the original", () => {
    const idle = makeIdleTimer();
    startTimer(idle);
    expect(idle.status).toBe("idle");
    expect(idle.enabled).toBe(false);
  });
});

describe("resetTimer", () => {
  it("resets status to idle", () => {
    const running: TimerState = {
      enabled: true,
      durationSec: 1800,
      startedAt: performance.now(),
      fadeSec: 3,
      status: "running",
    };
    const reset = resetTimer(running);
    expect(reset.status).toBe("idle");
  });

  it("sets enabled to false", () => {
    const running: TimerState = {
      enabled: true,
      durationSec: 1800,
      startedAt: performance.now(),
      fadeSec: 3,
      status: "running",
    };
    const reset = resetTimer(running);
    expect(reset.enabled).toBe(false);
  });

  it("clears startedAt", () => {
    const running: TimerState = {
      enabled: true,
      durationSec: 1800,
      startedAt: performance.now(),
      fadeSec: 3,
      status: "running",
    };
    const reset = resetTimer(running);
    expect(reset.startedAt).toBeUndefined();
  });

  it("preserves durationSec after reset", () => {
    const running: TimerState = {
      enabled: true,
      durationSec: 3600,
      startedAt: performance.now(),
      fadeSec: 5,
      status: "fading",
    };
    const reset = resetTimer(running);
    expect(reset.durationSec).toBe(3600);
  });
});

describe("Timer state machine flow", () => {
  it("follows idle → running → (reset) → idle", () => {
    const idle = makeIdleTimer(900);
    expect(idle.status).toBe("idle");

    const running = startTimer(idle);
    expect(running.status).toBe("running");

    const backToIdle = resetTimer(running);
    expect(backToIdle.status).toBe("idle");
  });
});
