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
  const muteAllLayers = useMixStore((s) => s.muteAllLayers);
  const randomizeMix = useMixStore((s) => s.randomizeMix);

  const handleMasterVolume = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMasterVolume(parseFloat(e.target.value));
    },
    [setMasterVolume]
  );

  const handleMeander = useCallback(() => {
    setMeanderEnabled(!meanderEnabled);
  }, [setMeanderEnabled, meanderEnabled]);

  const handleRandomize = useCallback(() => {
    randomizeMix();
    if (!isPlaying) {
      onPlayPause();
    }
  }, [randomizeMix, isPlaying, onPlayPause]);

  return (
    <div className="mixer-dock" role="toolbar" aria-label="Master Controls">
      <button
        className="play-toggle-btn"
        onClick={onPlayPause}
        aria-label={isPlaying ? "Pause audio" : "Play audio"}
        aria-pressed={isPlaying}
        type="button"
        title={isPlaying ? "Pause playback" : "Start playback"}
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

      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <button
          className={`btn-meander ${meanderEnabled ? "btn-meander--active" : ""}`}
          onClick={handleMeander}
          aria-pressed={meanderEnabled}
          aria-label="Toggle Meander low-frequency random walk"
          type="button"
          title="Slowly and naturally modulate volumes over time"
        >
          <span aria-hidden="true">〰️</span>
          Meander
        </button>

        <button
          type="button"
          className="btn-nav"
          onClick={handleRandomize}
          title="Create a surprising random ambient sound combination"
        >
          <span>🎲</span> Random Mix
        </button>

        <button
          type="button"
          className="btn-nav"
          onClick={muteAllLayers}
          title="Clear / mute all active sound layers"
        >
          <span>🔇</span> Clear All
        </button>
      </div>
    </div>
  );
}
