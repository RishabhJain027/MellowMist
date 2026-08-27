import { useState, useEffect, useRef, useCallback } from "react";
import { SoundCard } from "@/components/SoundCard";
import { MixerControls } from "@/components/MixerControls";
import { PresetPanel } from "@/components/PresetPanel";
import { TimerControls } from "@/components/TimerControls";
import { ShareDialog } from "@/components/ShareDialog";
import { Visualizer } from "@/components/Visualizer";
import { AttributionPage } from "@/components/AttributionPage";
import { BackgroundPicker, BackgroundVideo, type Theme } from "@/components/BackgroundPicker";
import { AudioEngine, clamp01, sliderToGain, computeLayerGain } from "@/audio/AudioEngine";
import { startMeander, type MeanderCleanup } from "@/audio/meander";
import { tickTimer } from "@/audio/timer";
import { useMixStore } from "@/state/store";
import manifestData from "@/assets/manifest.json";
import type { SoundDefinition } from "@/state/mixSchema";

const sounds = manifestData as SoundDefinition[];

export default function App() {
  const [showAttribution, setShowAttribution] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [remainingSec, setRemainingSec] = useState(0);
  const [theme, setTheme] = useState<Theme>("night");

  const engineRef = useRef<AudioEngine | null>(null);
  const meanderCleanups = useRef<Map<string, MeanderCleanup>>(new Map());
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isPlaying = useMixStore((s) => s.isPlaying);
  const mix = useMixStore((s) => s.mix);
  const togglePlayPause = useMixStore((s) => s.togglePlayPause);
  const setTimerStatus = useMixStore((s) => s.setTimerStatus);

  const getEngine = useCallback((): AudioEngine => {
    if (!engineRef.current) engineRef.current = new AudioEngine();
    return engineRef.current;
  }, []);

  const handlePlayPause = useCallback(async () => {
    const engine = getEngine();
    await engine.ensureRunning();
    togglePlayPause();
  }, [getEngine, togglePlayPause]);

  // Sync layers with audio engine
  useEffect(() => {
    if (!isPlaying) {
      if (engineRef.current) {
        mix.layers.forEach((l) => engineRef.current!.setLayerVolume(l.soundId, 0, 0.3));
        engineRef.current.setMasterVolume(mix.masterVolume, 0.3);
      }
      return;
    }
    const engine = getEngine();
    mix.layers.forEach(async (layer) => {
      const sound = sounds.find((s) => s.id === layer.soundId);
      if (!sound) return;
      if (layer.enabled) {
        if (!engine.hasLayer(layer.soundId)) {
          setLoadingIds((prev) => new Set(prev).add(layer.soundId));
          try {
            await engine.addLayer(sound, 0);
          } catch (err) {
            console.warn(`Audio load failed: ${layer.soundId}`, err);
          } finally {
            setLoadingIds((prev) => {
              const n = new Set(prev);
              n.delete(layer.soundId);
              return n;
            });
          }
        }
        engine.setLayerVolume(
          layer.soundId,
          computeLayerGain(mix.masterVolume, sliderToGain(layer.baseVolume), 1, true)
        );
      } else {
        engine.setLayerVolume(layer.soundId, 0, 0.2);
      }
    });
    engine.setMasterVolume(mix.masterVolume);
  }, [isPlaying, mix.layers, mix.masterVolume, getEngine]);

  // Meander audio modulation
  const enabledLayerIds = mix.layers
    .filter((l) => l.enabled)
    .map((l) => l.soundId)
    .sort()
    .join(",");

  useEffect(() => {
    if (!isPlaying || !mix.meanderEnabled) {
      meanderCleanups.current.forEach((c) => c());
      meanderCleanups.current.clear();
      return;
    }

    const currentLayers = useMixStore.getState().mix.layers;
    currentLayers
      .filter((l) => l.enabled)
      .forEach((layer) => {
        if (meanderCleanups.current.has(layer.soundId)) return;

        const cleanup = startMeander(
          layer.soundId,
          () => {
            const current = useMixStore.getState().mix.layers.find((l) => l.soundId === layer.soundId);
            return sliderToGain(current?.baseVolume ?? layer.baseVolume);
          },
          (modulatedGain) => {
            if (engineRef.current?.hasLayer(layer.soundId)) {
              const currentMaster = useMixStore.getState().mix.masterVolume;
              engineRef.current.setLayerVolume(
                layer.soundId,
                computeLayerGain(currentMaster, clamp01(modulatedGain), 1, true)
              );
            }
          }
        );
        meanderCleanups.current.set(layer.soundId, cleanup);
      });

    // Clean up disabled layers
    const enabledSet = new Set(enabledLayerIds.split(",").filter(Boolean));
    meanderCleanups.current.forEach((cleanup, id) => {
      if (!enabledSet.has(id)) {
        cleanup();
        meanderCleanups.current.delete(id);
      }
    });

    return () => {
      meanderCleanups.current.forEach((c) => c());
      meanderCleanups.current.clear();
    };
  }, [isPlaying, mix.meanderEnabled, enabledLayerIds]);

  // Timer interval
  useEffect(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (mix.timer.status === "running" || mix.timer.status === "fading") {
      timerIntervalRef.current = setInterval(() => {
        const engine = engineRef.current;
        if (!engine) return;
        const currentTimer = useMixStore.getState().mix.timer;
        const { status, remainingSec: rem } = tickTimer(
          currentTimer,
          engine,
          () => {
            setTimerStatus("finished");
            useMixStore.getState().resetTimerAction();
          }
        );
        setRemainingSec(rem);
        if (status !== useMixStore.getState().mix.timer.status) {
          setTimerStatus(status);
        }
      }, 1000);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [mix.timer.status, setTimerStatus]);

  // Tab visibility
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && isPlaying && engineRef.current)
        engineRef.current.ensureRunning();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [isPlaying]);

  useEffect(() => () => {
    engineRef.current?.dispose();
    meanderCleanups.current.forEach((c) => c());
  }, []);

  const activeLayersCount = mix.layers.filter((l) => l.enabled).length;

  if (showAttribution) {
    return (
      <div className="app">
        <BackgroundVideo theme={theme} />
        <AttributionPage onBack={() => setShowAttribution(false)} />
      </div>
    );
  }

  return (
    <div className="app">
      {/* Background Video Component with Smooth Translucent Scrim */}
      <BackgroundVideo theme={theme} />

      {/* Top Translucent Glass Navbar */}
      <header className="navbar">
        <div className="navbar__brand">
          <div className="navbar__brand-logo" aria-hidden="true">
            <svg viewBox="0 0 128 128" width="28" height="28">
              <defs>
                <linearGradient id="logoWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#2dd4bf" />
                  <stop offset="50%" stop-color="#38bdf8" />
                  <stop offset="100%" stop-color="#818cf8" />
                </linearGradient>
              </defs>
              <rect width="128" height="128" rx="30" fill="#0f172a" />
              <path d="M 28 48 C 44 38, 56 58, 72 48 C 88 38, 100 52, 100 52" fill="none" stroke="url(#logoWaveGrad)" stroke-width="8" stroke-linecap="round" />
              <path d="M 28 66 C 44 54, 60 76, 76 64 C 88 56, 100 70, 100 70" fill="none" stroke="url(#logoWaveGrad)" stroke-width="8" stroke-linecap="round" />
              <path d="M 28 84 C 42 74, 58 92, 74 82 C 86 76, 100 86, 100 86" fill="none" stroke="url(#logoWaveGrad)" stroke-width="8" stroke-linecap="round" />
            </svg>
          </div>
          <div>
            <span className="navbar__title">MellowMist</span>
            <span className="navbar__subtitle">Ambient Mixer</span>
          </div>
        </div>

        <div className="navbar__controls">
          <BackgroundPicker theme={theme} onChange={setTheme} />
          
          <button
            type="button"
            className="btn-nav"
            onClick={() => setShowShare(true)}
            title="Share mix"
          >
            <span>🔗</span> Share
          </button>
          
          <button
            type="button"
            className="btn-nav"
            onClick={() => setShowAttribution(true)}
            title="Credits"
          >
            Credits
          </button>

          <button
            type="button"
            className="btn-primary-action"
            onClick={handlePlayPause}
          >
            {isPlaying ? "⏸ Pause Mix" : "▶ Start Playback"}
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="main-content">
        {/* Master Control Dock */}
        <section className="master-controller" aria-label="Master Controls">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
              <div className="status-pill">
                <span className={`status-pill__dot ${isPlaying ? "status-pill__dot--live" : ""}`} />
                <span>{isPlaying ? "Live Audio Active" : "Mixer Ready"}</span>
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                <span>{activeLayersCount} active / {sounds.length} tracks</span>
              </div>
            </div>

            <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              Theme: <span style={{ color: "var(--text-main)" }}>{theme}</span>
            </div>
          </div>

          <MixerControls onPlayPause={handlePlayPause} />

          {isPlaying && (
            <div style={{ width: "100%", height: "24px" }}>
              <Visualizer engine={engineRef.current} isPlaying={isPlaying} width={1200} height={24} />
            </div>
          )}
        </section>

        {/* Sound Grid & Sidebar */}
        <div className="workspace-grid">
          <section className="sound-cards-grid" aria-label="Sound Layers">
            {sounds.map((sound) => (
              <SoundCard
                key={sound.id}
                sound={sound}
                isLoading={loadingIds.has(sound.id)}
              />
            ))}
          </section>

          <aside className="sidebar-panel-container" aria-label="Sidebar Controls">
            <TimerControls remainingSec={remainingSec} />
            <PresetPanel />
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div>
          <span>MellowMist — Original Ambient Mixer Studio. </span>
          <button type="button" onClick={() => setShowAttribution(true)}>
            Credits &amp; Audio Licenses
          </button>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <a
            href="https://github.com/RishabhJain027/MellowMist"
            target="_blank"
            rel="noreferrer noopener"
            style={{ color: "var(--text-muted)", textDecoration: "none" }}
          >
            GitHub
          </a>
          <span>•</span>
          <a
            href="https://www.linkedin.com/in/rish-abh27/"
            target="_blank"
            rel="noreferrer noopener"
            style={{ color: "var(--text-muted)", textDecoration: "none" }}
          >
            LinkedIn
          </a>
        </div>
      </footer>

      {showShare && <ShareDialog onClose={() => setShowShare(false)} />}
    </div>
  );
}
