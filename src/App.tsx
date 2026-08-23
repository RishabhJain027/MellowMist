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
  const setLayerMeander = useMixStore((s) => s.setLayerMeander);
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
          computeLayerGain(mix.masterVolume, sliderToGain(layer.baseVolume), layer.meanderMultiplier, true)
        );
      } else {
        engine.setLayerVolume(layer.soundId, 0, 0.2);
      }
    });
    engine.setMasterVolume(mix.masterVolume);
  }, [isPlaying, mix.layers, mix.masterVolume, getEngine]);

  // Meander modulation
  useEffect(() => {
    if (!isPlaying || !mix.meanderEnabled) {
      meanderCleanups.current.forEach((c) => c());
      meanderCleanups.current.clear();
      mix.layers.forEach((l) => setLayerMeander(l.soundId, 1));
      return;
    }
    getEngine();
    mix.layers
      .filter((l) => l.enabled)
      .forEach((layer) => {
        if (meanderCleanups.current.has(layer.soundId)) return;
        const cleanup = startMeander(
          layer.soundId,
          () => sliderToGain(useMixStore.getState().mix.layers.find((l) => l.soundId === layer.soundId)?.baseVolume ?? layer.baseVolume),
          (v) => {
            const clamped = clamp01(v);
            setLayerMeander(layer.soundId, clamped / Math.max(0.001, sliderToGain(layer.baseVolume)));
            if (engineRef.current?.hasLayer(layer.soundId))
              engineRef.current.setLayerVolume(layer.soundId, computeLayerGain(mix.masterVolume, clamped, 1, true));
          }
        );
        meanderCleanups.current.set(layer.soundId, cleanup);
      });
    mix.layers
      .filter((l) => !l.enabled)
      .forEach((l) => {
        const c = meanderCleanups.current.get(l.soundId);
        if (c) {
          c();
          meanderCleanups.current.delete(l.soundId);
        }
      });
    return () => {
      meanderCleanups.current.forEach((c) => c());
      meanderCleanups.current.clear();
    };
  }, [isPlaying, mix.meanderEnabled, mix.layers, mix.masterVolume, getEngine, setLayerMeander]);

  // Timer
  useEffect(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (mix.timer.status === "running" || mix.timer.status === "fading") {
      timerIntervalRef.current = setInterval(() => {
        const engine = engineRef.current;
        if (!engine) return;
        const { status, remainingSec: rem } = tickTimer(
          useMixStore.getState().mix.timer,
          engine,
          () => {
            setTimerStatus("finished");
            useMixStore.getState().resetTimerAction();
          }
        );
        setRemainingSec(rem);
        if (status !== useMixStore.getState().mix.timer.status) setTimerStatus(status);
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
      {/* Background Video Component */}
      <BackgroundVideo theme={theme} />

      {/* Top Glass Navbar */}
      <header className="navbar">
        <div className="navbar__brand">
          <div className="navbar__brand-badge">🌫️</div>
          <div>
            <span className="navbar__title">MellowMist</span>
            <span className="navbar__subtitle">Acoustic Atmosphere</span>
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
        <section className="hero-header">
          <div>
            <span className="hero-header__badge">Ambient Sound Studio</span>
            <h1 className="hero-header__title">Sculpt your soundscape.</h1>
            <p className="hero-header__subtitle">
              Layer natural frequencies, white noise, and relaxing ambiences for focus and deep rest.
            </p>
          </div>

          <div className="live-metrics">
            <div className="metric-card">
              <span className="metric-card__number">{activeLayersCount}</span>
              <span className="metric-card__label">Active Sounds</span>
            </div>
            <div className="metric-card">
              <span className="metric-card__number">{Math.round(mix.masterVolume * 100)}%</span>
              <span className="metric-card__label">Master Output</span>
            </div>
          </div>
        </section>

        {/* Master Control Dock */}
        <section className="master-controller" aria-label="Master Controls">
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
          <span>MellowMist — Original Ambient Studio. </span>
          <button type="button" onClick={() => setShowAttribution(true)}>
            License & Credits
          </button>
        </div>
        <span>Environment: {theme.toUpperCase()}</span>
      </footer>

      {showShare && <ShareDialog onClose={() => setShowShare(false)} />}
    </div>
  );
}
