import { useCallback } from "react";
import type { SoundDefinition } from "@/state/mixSchema";
import { useMixStore } from "@/state/store";

interface SoundCardProps {
  sound: SoundDefinition;
  isLoading?: boolean;
}

export function SoundCard({ sound, isLoading }: SoundCardProps) {
  const layer = useMixStore((s) =>
    s.mix.layers.find((l) => l.soundId === sound.id)
  );
  const toggleLayer = useMixStore((s) => s.toggleLayer);
  const setLayerVolume = useMixStore((s) => s.setLayerVolume);
  const isPlaying = useMixStore((s) => s.isPlaying);

  const enabled = layer?.enabled ?? false;
  const baseVolume = layer?.baseVolume ?? sound.defaultVolume;
  const isActive = enabled && isPlaying;

  const handleToggle = useCallback(() => {
    toggleLayer(sound.id);
  }, [toggleLayer, sound.id]);

  const handleVolume = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLayerVolume(sound.id, parseFloat(e.target.value));
    },
    [setLayerVolume, sound.id]
  );

  return (
    <article
      className={`sound-card-item ${isActive ? "sound-card-item--active" : ""}`}
      aria-label={`${sound.title} sound layer`}
    >
      {isLoading && <span className="loading-indicator-dot" aria-label="Loading audio" role="status" />}

      <div className="sound-card-item__top">
        <div className="sound-card-item__meta">
          <span className="sound-card-item__icon" aria-hidden="true">
            {sound.icon}
          </span>
          <span className="sound-card-item__name">{sound.title}</span>
        </div>

        <button
          className="sound-card-item__switch"
          aria-pressed={enabled}
          aria-label={`${enabled ? "Mute" : "Activate"} ${sound.title}`}
          onClick={handleToggle}
          type="button"
        >
          {enabled ? "✓" : "+"}
        </button>
      </div>

      <div className="sound-card-item__slider-box">
        <input
          id={`vol-${sound.id}`}
          type="range"
          className="sound-card-item__slider"
          min={0}
          max={1}
          step={0.01}
          value={baseVolume}
          onChange={handleVolume}
          disabled={!enabled}
          aria-label={`${sound.title} volume level`}
        />
        <span className="sound-card-item__pct" aria-hidden="true">
          {Math.round(baseVolume * 100)}%
        </span>
      </div>
    </article>
  );
}
