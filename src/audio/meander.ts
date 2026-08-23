// ─────────────────────────────────────────────────────────────────────────────
// meander.ts — Bounded low-frequency random walk (blueprint §5.4)
// Produces slow, smooth volume modulation per sound layer.
// ─────────────────────────────────────────────────────────────────────────────

import { clamp01 } from "./AudioEngine";

export type MeanderCleanup = () => void;

/**
 * Start a meander modulation loop for one layer.
 *
 * - Picks a new target multiplier in [0.78, 1.20] every 1.8–4.4 s.
 * - Eases toward it using a cubic smooth-step over requestAnimationFrame.
 * - Calls setOutput(clamp01(baseVolume × multiplier)) on each frame.
 * - Returns a cleanup function to stop the loop.
 *
 * For tab-visibility robustness, gain ramps should also be scheduled on
 * the audio clock by the caller (hybrid approach per blueprint note §5.4).
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

  const tick = () => {
    if (stopped) return;

    // New target in [0.78, 1.20]
    target = 0.78 + Math.random() * 0.42;

    const startMultiplier = multiplier;
    const startTime = performance.now();
    // Transition duration: 1.8–4.4 s
    const duration = 1800 + Math.random() * 2600;

    const frame = (now: number) => {
      if (stopped) return;
      const t = Math.min(1, (now - startTime) / duration);
      // Cubic smooth-step easing
      const eased = t * t * (3 - 2 * t);
      multiplier = startMultiplier + (target - startMultiplier) * eased;
      setOutput(clamp01(getBaseVolume() * multiplier));

      if (t < 1) {
        rafId = requestAnimationFrame(frame);
      } else {
        // Pause 350–1250 ms before next step
        timeoutId = setTimeout(tick, 350 + Math.random() * 900);
      }
    };

    rafId = requestAnimationFrame(frame);
  };

  tick();

  return () => {
    stopped = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
    if (timeoutId !== null) clearTimeout(timeoutId);
  };
}

/** Get the current meander multiplier bounds for testing. */
export const MEANDER_MIN = 0.78;
export const MEANDER_MAX = 1.20;
