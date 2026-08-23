// ─────────────────────────────────────────────────────────────────────────────
// volumeClamping.test.ts — Tests for volume clamping and gain formulas (blueprint §5.2)
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { clamp01, sliderToGain, computeLayerGain } from "@/audio/AudioEngine";

describe("clamp01", () => {
  it("clamps values below 0 to 0", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(-100)).toBe(0);
  });

  it("clamps values above 1 to 1", () => {
    expect(clamp01(2)).toBe(1);
    expect(clamp01(999)).toBe(1);
  });

  it("passes through values in [0, 1]", () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(1)).toBe(1);
  });

  it("returns 0 for NaN", () => {
    expect(clamp01(NaN)).toBe(0);
  });

  it("returns 0 for Infinity", () => {
    expect(clamp01(Infinity)).toBe(0);
  });

  it("returns 0 for -Infinity", () => {
    expect(clamp01(-Infinity)).toBe(0);
  });
});

describe("sliderToGain", () => {
  it("maps 0 to 0", () => {
    expect(sliderToGain(0)).toBe(0);
  });

  it("maps 1 to 1", () => {
    expect(sliderToGain(1)).toBe(1);
  });

  it("produces power-curve output less than input for mid values", () => {
    // power = 2 → 0.5^2 = 0.25
    expect(sliderToGain(0.5)).toBeCloseTo(0.25);
  });

  it("clamps out-of-range input before applying curve", () => {
    expect(sliderToGain(-5)).toBe(0);
    expect(sliderToGain(5)).toBe(1);
  });

  it("gain is always non-negative", () => {
    for (let v = -0.5; v <= 1.5; v += 0.1) {
      expect(sliderToGain(v)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("computeLayerGain", () => {
  it("returns 0 when layer is disabled", () => {
    expect(computeLayerGain(1, 1, 1, false)).toBe(0);
  });

  it("multiplies all factors when enabled", () => {
    const result = computeLayerGain(0.8, 0.5, 1.0, true);
    expect(result).toBeCloseTo(0.4);
  });

  it("clamps the output to [0, 1]", () => {
    // Even if individual values exceed 1
    const result = computeLayerGain(1, 1, 1, true);
    expect(result).toBeLessThanOrEqual(1);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("returns 0 when masterVolume is 0", () => {
    expect(computeLayerGain(0, 0.8, 1.0, true)).toBe(0);
  });

  it("returns 0 when baseVolume is 0", () => {
    expect(computeLayerGain(0.8, 0, 1.0, true)).toBe(0);
  });
});
