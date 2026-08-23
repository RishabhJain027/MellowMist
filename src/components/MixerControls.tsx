import { useCallback } from "react";
import { useMixStore } from "@/state/store";

interface MixerControlsProps {
  onPlayPause: () => void;
}

export function MixerControls({ onPlayPause }: MixerControlsProps) {
  const isPlaying = useMixStore((s) => s.isPlaying);
  const masterVolume = useMixStore((s) => s.mix.masterVolume);
  const meanderEnabled = useMixStore((s) => s.mix.meanderEnabled);
  const setMasterVolume = useMixStore((s) => s.setMasterVolume);
  const setMeanderEnabled = useMixStore((s) => s.setMeanderEnabled);

  const handleMasterVolume = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMasterVolume(parseFloat(e.target.value));
    },
    [setMasterVolume]
  );

  const handleMeander = useCallback(() => {
    setMeanderEnabled(!meanderEnabled);
  }, [setMeanderEnabled, meanderEnabled]);

  return (
    <div className="mixer-dock" role="toolbar" aria-label="Master Controls">
      <button
        className="play-toggle-btn"
        onClick={onPlayPause}
        aria-label={isPlaying ? "Pause audio" : "Play audio"}
        aria-pressed={isPlaying}
        type="button"
      >
        {isPlaying ? "⏸" : "▶"}
      </button>

      <div className="volume-slider-group">
        <span className="volume-icon" aria-hidden="true">🔊</span>
        <label htmlFor="master-volume-input" className="sr-only">Master volume</label>
        <input
          id="master-volume-input"
          type="range"
          className="slider-master"
          min={0}
          max={1}
          step={0.01}
          value={masterVolume}
          onChange={handleMasterVolume}
          aria-label="Master volume"
        />
        <span className="volume-readout">
          {Math.round(masterVolume * 100)}%
        </span>
      </div>

      <button
        className={`btn-meander ${meanderEnabled ? "btn-meander--active" : ""}`}
        onClick={handleMeander}
        aria-pressed={meanderEnabled}
        aria-label="Toggle Meander low-frequency random walk"
        type="button"
      >
        <span aria-hidden="true">〰️</span>
        Meander Drift
      </button>
    </div>
  );
}
