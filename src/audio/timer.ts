// ─────────────────────────────────────────────────────────────────────────────
// timer.ts — Timer state machine + fade scheduling (blueprint §5.5)
// State flow: idle → running → fading → finished
// ─────────────────────────────────────────────────────────────────────────────

import type { TimerState } from "@/state/mixSchema";
import type { AudioEngine } from "./AudioEngine";

export type TimerStatus = TimerState["status"];

export interface TimerTickResult {
  status: TimerStatus;
  remainingSec: number;
}

/**
 * Tick the timer. Called periodically (e.g. every second via setInterval).
 * Returns the new status and remaining seconds.
 *
 * If the fade window starts, calls engine.scheduleMasterFade().
 * When finished, calls onFinish().
 */
export function tickTimer(
  timer: TimerState,
  engine: AudioEngine,
  onFinish: () => void
): TimerTickResult {
  if (!timer.enabled || timer.status === "idle" || timer.status === "finished") {
    return { status: timer.status, remainingSec: timer.durationSec };
  }

  const elapsed = (performance.now() - (timer.startedAt ?? performance.now())) / 1000;
  const remaining = Math.max(0, timer.durationSec - elapsed);
  const fadeStart = timer.durationSec - timer.fadeSec;

  if (timer.status === "running" && elapsed >= fadeStart) {
    // Begin fade
    engine.scheduleMasterFade(timer.fadeSec);
    return { status: "fading", remainingSec: remaining };
  }

  if (elapsed >= timer.durationSec) {
    onFinish();
    return { status: "finished", remainingSec: 0 };
  }

  return { status: timer.status, remainingSec: remaining };
}

/** Create a fresh idle timer state. */
export function makeIdleTimer(durationSec = 1800, fadeSec = 3): TimerState {
  return {
    enabled: false,
    durationSec,
    fadeSec,
    status: "idle",
  };
}

/** Start the timer — returns a new TimerState with startedAt set. */
export function startTimer(timer: TimerState): TimerState {
  return {
    ...timer,
    enabled: true,
    startedAt: performance.now(),
    status: "running",
  };
}

/** Reset the timer to idle. */
export function resetTimer(timer: TimerState): TimerState {
  return {
    ...timer,
    enabled: false,
    startedAt: undefined,
    status: "idle",
  };
}

/** Format seconds as mm:ss. */
export function formatTime(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Available timer presets (seconds). */
export const TIMER_PRESETS = [
  { label: "15 min", value: 900 },
  { label: "30 min", value: 1800 },
  { label: "45 min", value: 2700 },
  { label: "1 hr", value: 3600 },
  { label: "2 hr", value: 7200 },
];

/** Available fade presets (seconds). */
export const FADE_PRESETS = [
  { label: "1.5 s", value: 1.5 },
  { label: "3 s", value: 3 },
  { label: "5 s", value: 5 },
  { label: "10 s", value: 10 },
  { label: "30 s", value: 30 },
];
