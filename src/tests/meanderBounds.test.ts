import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MEANDER_MIN, MEANDER_MAX } from "@/audio/meander";

describe("MEANDER bounds constants", () => {
  it("MEANDER_MIN is 0.78", () => { expect(MEANDER_MIN).toBe(0.78); });
  it("MEANDER_MAX is 1.20", () => { expect(MEANDER_MAX).toBe(1.20); });
  it("MEANDER_MAX > MEANDER_MIN", () => { expect(MEANDER_MAX).toBeGreaterThan(MEANDER_MIN); });
});

describe("startMeander output bounds", () => {
  beforeEach(() => {
    let calls = 0;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      if (calls++ < 3) cb(performance.now() + calls * 2000);
      return calls;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("setTimeout", (_cb: () => void) => 0);
    vi.stubGlobal("clearTimeout", vi.fn());
  });

  afterEach(() => { vi.unstubAllGlobals(); });

  it("returns a cleanup function", async () => {
    const { startMeander } = await import("@/audio/meander");
    const cleanup = startMeander("test", () => 0.5, () => {});
    expect(typeof cleanup).toBe("function");
    cleanup();
  });

  it("setOutput values are always in [0, 1]", async () => {
    const { startMeander } = await import("@/audio/meander");
    const outputs: number[] = [];
    const cleanup = startMeander("test", () => 0.5, (v) => outputs.push(v));
    cleanup();
    for (const v of outputs) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("zero base volume gives zero output", async () => {
    const { startMeander } = await import("@/audio/meander");
    const outputs: number[] = [];
    const cleanup = startMeander("test", () => 0, (v) => outputs.push(v));
    cleanup();
    for (const v of outputs) { expect(v).toBe(0); }
  });

  it("negative base volume is clamped to 0", async () => {
    const { startMeander } = await import("@/audio/meander");
    const outputs: number[] = [];
    const cleanup = startMeander("test", () => -5, (v) => outputs.push(v));
    cleanup();
    for (const v of outputs) { expect(v).toBeGreaterThanOrEqual(0); }
  });
});
