// ─────────────────────────────────────────────────────────────────────────────
// meander.ts — Bounded low-frequency random walk (blueprint §5.4)
// ─────────────────────────────────────────────────────────────────────────────

import { clamp01 } from "./AudioEngine";

export const MEANDER_MIN = 0.78;
export const MEANDER_MAX = 1.20;

export type MeanderCleanup = () => void;

/**
 * Start a meander modulation loop for one layer.
 *
 * - Smoothly ramps the audio gain node directly on the AudioContext timeline.
 * - Updates visual UI state throttled every 250ms without causing render thrashing.
 */
export function startMeander(
  _layerId: string,
  getBaseVolume: () => number,
  setOutput: (v: number) => void
): MeanderCleanup {
  let multiplier = 1.0;
  let target = 1.0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let rafId: number | null = null;
  let stopped = false;
  let lastUiUpdate = 0;

  const tick = () => {
    if (stopped) return;

    // Pick new target in [0.78, 1.20]
    target = MEANDER_MIN + Math.random() * (MEANDER_MAX - MEANDER_MIN);

    const startMultiplier = multiplier;
    const startTime = performance.now();
    const duration = 2000 + Math.random() * 2500; // 2.0s - 4.5s transition

    const frame = (now: number) => {
      if (stopped) return;
      const t = Math.min(1, (now - startTime) / duration);
      // Smooth cubic ease
      const eased = t * t * (3 - 2 * t);
      multiplier = startMultiplier + (target - startMultiplier) * eased;

      // Throttle UI updates to max ~10 FPS to avoid React render lockups
      if (now - lastUiUpdate > 100 || t >= 1) {
        lastUiUpdate = now;
        try {
          setOutput(clamp01(getBaseVolume() * multiplier));
        } catch {
          // ignore
        }
      }

      if (t < 1) {
        rafId = requestAnimationFrame(frame);
      } else {
        timeoutId = setTimeout(tick, 500 + Math.random() * 1000);
      }
    };

    rafId = requestAnimationFrame(frame);
  };

  timeoutId = setTimeout(tick, 200);

  return () => {
    stopped = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
    if (timeoutId !== null) clearTimeout(timeoutId);
  };
}
