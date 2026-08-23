// ─────────────────────────────────────────────────────────────────────────────
// store.ts — Zustand store wiring all MellowMist state
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import type { LayerState, MixState, Preset, TimerState } from "./mixSchema";
import { saveMix, loadMix, loadCustomPresets, saveCustomPresets } from "./persistence";
import { decodeMixFromUrl } from "./shareUrl";
import { makeIdleTimer, startTimer, resetTimer } from "@/audio/timer";
import manifestData from "@/assets/manifest.json";
import type { SoundDefinition } from "./mixSchema";

const sounds = manifestData as SoundDefinition[];

// ─── Built-in presets ─────────────────────────────────────────────────────────

function makeLayer(soundId: string, baseVolume: number): LayerState {
  return { soundId, enabled: true, baseVolume, meanderMultiplier: 1 };
}

const BUILT_IN_PRESETS: Preset[] = [
  {
    id: "preset-rainy-focus",
    name: "Rainy Focus",
    description: "Rain and café for deep work.",
    builtIn: true,
    mix: makeMix("Rainy Focus", [
      makeLayer("rain", 0.55),
      makeLayer("coffee", 0.25),
      makeLayer("storm", 0.15),
    ]),
  },
  {
    id: "preset-deep-sleep",
    name: "Deep Sleep",
    description: "Brown noise and ocean waves.",
    builtIn: true,
    mix: makeMix("Deep Sleep", [
      makeLayer("brown-noise", 0.45),
      makeLayer("waves", 0.35),
      makeLayer("rain", 0.20),
    ]),
  },
  {
    id: "preset-forest-walk",
    name: "Forest Walk",
    description: "Birds, wind, and a stream.",
    builtIn: true,
    mix: makeMix("Forest Walk", [
      makeLayer("birds-tree", 0.50),
      makeLayer("wind", 0.30),
      makeLayer("stream-water", 0.40),
    ]),
  },
  {
    id: "preset-fireplace",
    name: "Cozy Fireplace",
    description: "Fire with gentle rain.",
    builtIn: true,
    mix: makeMix("Cozy Fireplace", [
      makeLayer("fire", 0.55),
      makeLayer("rain-on-tent", 0.30),
      makeLayer("wind", 0.15),
    ]),
  },
  {
    id: "preset-zen",
    name: "Zen Garden",
    description: "Singing bowl, leaves, waterfall.",
    builtIn: true,
    mix: makeMix("Zen Garden", [
      makeLayer("singing-bowl", 0.35),
      makeLayer("leaves", 0.30),
      makeLayer("waterfall", 0.40),
    ]),
  },
  {
    id: "preset-night",
    name: "Night Crickets",
    description: "Night sounds and pink noise.",
    builtIn: true,
    mix: makeMix("Night Crickets", [
      makeLayer("night", 0.50),
      makeLayer("pink-noise", 0.20),
    ]),
  },
];

function makeMix(name: string, layers: LayerState[]): MixState {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    name,
    layers,
    masterVolume: 0.8,
    meanderEnabled: true,
    timer: makeIdleTimer(),
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Initial state ────────────────────────────────────────────────────────────

function buildInitialLayers(): LayerState[] {
  return sounds.map((s) => ({
    soundId: s.id,
    enabled: false,
    baseVolume: s.defaultVolume,
    meanderMultiplier: 1,
  }));
}

function buildInitialState(): MixState {
  // Priority: URL → LocalStorage → default
  const fromUrl = decodeMixFromUrl();
  if (fromUrl) {
    const layerMap = new Map(fromUrl.layers.map((l) => [l.soundId, l]));
    return {
      schemaVersion: 1,
      name: "Shared Mix",
      layers: sounds.map((s) => {
        const url = layerMap.get(s.id);
        return url
          ? { ...url }
          : { soundId: s.id, enabled: false, baseVolume: s.defaultVolume, meanderMultiplier: 1 };
      }),
      masterVolume: fromUrl.masterVolume,
      meanderEnabled: fromUrl.meanderEnabled,
      timer: fromUrl.timerEnabled
        ? makeIdleTimer(fromUrl.timerDurationSec)
        : makeIdleTimer(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const saved = loadMix();
  if (saved) return saved;

  return {
    schemaVersion: 1,
    name: "My Mix",
    layers: buildInitialLayers(),
    masterVolume: 0.8,
    meanderEnabled: false,
    timer: makeIdleTimer(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface MixStore {
  mix: MixState;
  customPresets: Preset[];
  isPlaying: boolean;

  // Layer actions
  toggleLayer: (soundId: string) => void;
  setLayerVolume: (soundId: string, volume: number) => void;
  setLayerMeander: (soundId: string, multiplier: number) => void;

  // Master
  setMasterVolume: (volume: number) => void;
  setMeanderEnabled: (enabled: boolean) => void;
  togglePlayPause: () => void;

  // Timer
  setTimer: (patch: Partial<TimerState>) => void;
  startTimerAction: () => void;
  resetTimerAction: () => void;
  setTimerStatus: (status: TimerState["status"]) => void;

  // Presets
  loadPreset: (preset: Preset) => void;
  saveCustomPreset: (name: string, description: string) => void;
  deleteCustomPreset: (id: string) => void;

  // Mix name
  setMixName: (name: string) => void;
}

// ─── Store implementation ─────────────────────────────────────────────────────

export const useMixStore = create<MixStore>((set, get) => {
  const persist = (mix: MixState) => {
    saveMix(mix);
    return mix;
  };

  const updateMix = (updater: (prev: MixState) => Partial<MixState>) => {
    set((state) => {
      const updated: MixState = {
        ...state.mix,
        ...updater(state.mix),
        updatedAt: new Date().toISOString(),
      };
      persist(updated);
      return { mix: updated };
    });
  };

  return {
    mix: buildInitialState(),
    customPresets: loadCustomPresets(),
    isPlaying: false,

    toggleLayer: (soundId) =>
      updateMix((m) => ({
        layers: m.layers.map((l) =>
          l.soundId === soundId ? { ...l, enabled: !l.enabled } : l
        ),
      })),

    setLayerVolume: (soundId, volume) =>
      updateMix((m) => ({
        layers: m.layers.map((l) =>
          l.soundId === soundId ? { ...l, baseVolume: volume } : l
        ),
      })),

    setLayerMeander: (soundId, multiplier) =>
      set((state) => ({
        mix: {
          ...state.mix,
          layers: state.mix.layers.map((l) =>
            l.soundId === soundId ? { ...l, meanderMultiplier: multiplier } : l
          ),
        },
      })),

    setMasterVolume: (volume) => updateMix(() => ({ masterVolume: volume })),

    setMeanderEnabled: (enabled) => updateMix(() => ({ meanderEnabled: enabled })),

    togglePlayPause: () => set((state) => ({ isPlaying: !state.isPlaying })),

    setTimer: (patch) =>
      updateMix((m) => ({ timer: { ...m.timer, ...patch } })),

    startTimerAction: () =>
      updateMix((m) => ({ timer: startTimer(m.timer) })),

    resetTimerAction: () =>
      updateMix((m) => ({ timer: resetTimer(m.timer) })),

    setTimerStatus: (status) =>
      set((state) => ({
        mix: {
          ...state.mix,
          timer: { ...state.mix.timer, status },
        },
      })),

    loadPreset: (preset) =>
      set(() => {
        const loaded = { ...preset.mix, updatedAt: new Date().toISOString() };
        saveMix(loaded);
        return { mix: loaded };
      }),

    saveCustomPreset: (name, description) => {
      const { mix, customPresets } = get();
      const id = `custom-${Date.now()}`;
      const newPreset: Preset = {
        id,
        name,
        description,
        mix: { ...mix, name },
        builtIn: false,
      };
      const updated = [...customPresets, newPreset];
      saveCustomPresets(updated);
      set({ customPresets: updated });
    },

    deleteCustomPreset: (id) => {
      const { customPresets } = get();
      const updated = customPresets.filter((p) => p.id !== id);
      saveCustomPresets(updated);
      set({ customPresets: updated });
    },

    setMixName: (name) => updateMix(() => ({ name })),
  };
});

export { BUILT_IN_PRESETS };
export type { MixStore };
