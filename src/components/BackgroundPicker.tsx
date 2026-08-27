import { useRef, useEffect } from "react";

export type Theme = "morning" | "afternoon" | "evening" | "night";

export const THEMES: { id: Theme; label: string; emoji: string; desc: string }[] = [
  { id: "morning", label: "Morning", emoji: "🌅", desc: "Crisp sunrise daylight" },
  { id: "afternoon", label: "Afternoon", emoji: "☀️", desc: "Warm bright focus" },
  { id: "evening", label: "Evening", emoji: "🌆", desc: "Golden dusk glow" },
  { id: "night", label: "Night", emoji: "🌙", desc: "Deep starlit calm" },
];

interface BackgroundPickerProps {
  theme: Theme;
  onChange: (t: Theme) => void;
}

export function BackgroundPicker({ theme, onChange }: BackgroundPickerProps) {
  return (
    <div className="bg-picker" role="group" aria-label="Change environment video background">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`bg-picker__btn ${theme === t.id ? "bg-picker__btn--active" : ""}`}
          onClick={() => onChange(t.id)}
          aria-pressed={theme === t.id}
          title={t.desc}
        >
          <span className="bg-picker__emoji">{t.emoji}</span>
          <span className="bg-picker__text">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

interface BackgroundVideoProps {
  theme: Theme;
}

export function BackgroundVideo({ theme }: BackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const videoSrc = `${base}/videos/${theme}.mp4`;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.src = videoSrc;
    v.load();
    const playPromise = v.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // autoplay without user interaction handled gracefully
      });
    }
  }, [videoSrc]);

  return (
    <div className="video-background-wrapper" aria-hidden="true">
      <video
        ref={videoRef}
        key={theme}
        className="bg-video"
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
      />
      <div className="bg-video-scrim" />
    </div>
  );
}
