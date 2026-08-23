import { useCallback } from "react";
import { useMixStore } from "@/state/store";
import { TIMER_PRESETS, FADE_PRESETS, formatTime } from "@/audio/timer";

interface TimerControlsProps {
  remainingSec: number;
}

export function TimerControls({ remainingSec }: TimerControlsProps) {
  const timer = useMixStore((s) => s.mix.timer);
  const setTimer = useMixStore((s) => s.setTimer);
  const startTimerAction = useMixStore((s) => s.startTimerAction);
  const resetTimerAction = useMixStore((s) => s.resetTimerAction);

  const handlePreset = useCallback(
    (value: number) => {
      if (timer.status === "running" || timer.status === "fading") return;
      setTimer({ durationSec: value });
    },
    [setTimer, timer.status]
  );

  const handleFade = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setTimer({ fadeSec: parseFloat(e.target.value) });
    },
    [setTimer]
  );

  const isActive = timer.status === "running" || timer.status === "fading";
  const displayTime = isActive ? formatTime(remainingSec) : formatTime(timer.durationSec);

  const statusText =
    timer.status === "fading"
      ? "Gradually fading out…"
      : timer.status === "finished"
      ? "Session complete"
      : timer.status === "running"
      ? "Timer active"
      : "Timer idle";

  return (
    <div className="panel-widget" aria-label="Sleep timer controls">
      <div className="panel-widget__title">
        <span aria-hidden="true">⏱</span> Sleep Timer
      </div>

      <div className="timer-countdown-val" aria-live="polite">
        {displayTime}
      </div>

      <div className="timer-preset-tags">
        {TIMER_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            className={`timer-preset-tag ${timer.durationSec === p.value ? "timer-preset-tag--selected" : ""}`}
            onClick={() => handlePreset(p.value)}
            disabled={isActive}
            aria-pressed={timer.durationSec === p.value}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="timer-fade-selector">
        <span>Fade duration</span>
        <select
          className="timer-fade-select"
          value={timer.fadeSec}
          onChange={handleFade}
          disabled={isActive}
          aria-label="Fade duration"
        >
          {FADE_PRESETS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div className="timer-button-row">
        {!isActive && timer.status !== "finished" ? (
          <button
            type="button"
            className="btn-timer-primary"
            onClick={startTimerAction}
          >
            Start Timer
          </button>
        ) : (
          <button
            type="button"
            className="btn-timer-secondary"
            onClick={resetTimerAction}
          >
            Reset
          </button>
        )}
      </div>

      <p className="timer-status-hint">
        {statusText}
      </p>
    </div>
  );
}
