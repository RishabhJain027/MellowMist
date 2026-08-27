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

// ─── Preset layer maker ───────────────────────────────────────────────────────

function makePresetLayers(activeSpecs: { soundId: string; baseVolume: number }[]): LayerState[] {
  const activeMap = new Map(activeSpecs.map((s) => [s.soundId, s.baseVolume]));
  return sounds.map((s) => ({
    soundId: s.id,
    enabled: activeMap.has(s.id),
    baseVolume: activeMap.has(s.id) ? activeMap.get(s.id)! : s.defaultVolume,
    meanderMultiplier: 1,
  }));
}

export const BUILT_IN_PRESETS: Preset[] = [
  {
    id: "preset-rainy-focus",
    name: "Rainy Focus",
    description: "Rain, café chatter, and distant storm.",
    builtIn: true,
    mix: makeMix("Rainy Focus", [
      { soundId: "rain", baseVolume: 0.55 },
      { soundId: "coffee", baseVolume: 0.30 },
      { soundId: "storm", baseVolume: 0.20 },
    ]),
  },
  {
    id: "preset-deep-sleep",
    name: "Deep Sleep",
    description: "Brown noise, ocean waves, and gentle rain.",
    builtIn: true,
    mix: makeMix("Deep Sleep", [
      { soundId: "brown-noise", baseVolume: 0.50 },
      { soundId: "waves", baseVolume: 0.40 },
      { soundId: "rain", baseVolume: 0.25 },
    ]),
  },
  {
    id: "preset-forest-walk",
    name: "Forest Walk",
    description: "Birds, forest wind, and babbling stream.",
    builtIn: true,
    mix: makeMix("Forest Walk", [
      { soundId: "birds-tree", baseVolume: 0.55 },
      { soundId: "wind", baseVolume: 0.35 },
      { soundId: "stream-water", baseVolume: 0.45 },
    ]),
  },
  {
    id: "preset-fireplace",
    name: "Cozy Fireplace",
    description: "Crackling fire and rain on tent.",
    builtIn: true,
    mix: makeMix("Cozy Fireplace", [
      { soundId: "fire", baseVolume: 0.60 },
      { soundId: "rain-on-tent", baseVolume: 0.35 },
      { soundId: "wind", baseVolume: 0.20 },
    ]),
  },
  {
    id: "preset-zen",
    name: "Zen Garden",
    description: "Singing bowl, leaves, and waterfall.",
    builtIn: true,
    mix: makeMix("Zen Garden", [
      { soundId: "singing-bowl", baseVolume: 0.40 },
      { soundId: "leaves", baseVolume: 0.35 },
      { soundId: "waterfall", baseVolume: 0.45 },
    ]),
  },
  {
    id: "preset-night",
    name: "Night Crickets",
    description: "Night crickets and pink noise.",
    builtIn: true,
    mix: makeMix("Night Crickets", [
      { soundId: "night", baseVolume: 0.55 },
      { soundId: "pink-noise", baseVolume: 0.25 },
    ]),
  },
];

function makeMix(name: string, activeSpecs: { soundId: string; baseVolume: number }[]): MixState {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    name,
    layers: makePresetLayers(activeSpecs),
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
  if (saved && Array.isArray(saved.layers)) {
    // Ensure all manifest sounds exist even if old saved mix had fewer
    const savedMap = new Map(saved.layers.map((l) => [l.soundId, l]));
    return {
      ...saved,
      layers: sounds.map((s) => {
        const existing = savedMap.get(s.id);
        return existing
          ? { ...existing }
          : { soundId: s.id, enabled: false, baseVolume: s.defaultVolume, meanderMultiplier: 1 };
      }),
    };
  }

  return {
    schemaVersion: 1,
    name: "My Mix",
    layers: buildInitialLayers(),
    masterVolume: 0.8,
    meanderEnabled: true,
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
  enableLayer: (soundId: string, enabled: boolean) => void;
  setLayerVolume: (soundId: string, volume: number) => void;
  setLayerMeander: (soundId: string, multiplier: number) => void;
  muteAllLayers: () => void;
  randomizeMix: () => void;

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

    enableLayer: (soundId, enabled) =>
      updateMix((m) => ({
        layers: m.layers.map((l) =>
          l.soundId === soundId ? { ...l, enabled } : l
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

    muteAllLayers: () =>
      updateMix((m) => ({
        layers: m.layers.map((l) => ({ ...l, enabled: false })),
      })),

    randomizeMix: () => {
      const chosenCount = 3 + Math.floor(Math.random() * 3); // 3 to 5 sounds
      const shuffled = [...sounds].sort(() => 0.5 - Math.random());
      const selectedIds = new Set(shuffled.slice(0, chosenCount).map((s) => s.id));

      updateMix((m) => ({
        name: "Random Mix",
        layers: m.layers.map((l) => ({
          ...l,
          enabled: selectedIds.has(l.soundId),
          baseVolume: selectedIds.has(l.soundId)
            ? 0.25 + Math.random() * 0.55
            : l.baseVolume,
        })),
      }));
    },

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
        // Ensure all manifest sounds are represented
        const presetMap = new Map(preset.mix.layers.map((l) => [l.soundId, l]));
        const fullLayers = sounds.map((s) => {
          const l = presetMap.get(s.id);
          return l
            ? { ...l }
            : { soundId: s.id, enabled: false, baseVolume: s.defaultVolume, meanderMultiplier: 1 };
        });

        const loaded: MixState = {
          ...preset.mix,
          layers: fullLayers,
          updatedAt: new Date().toISOString(),
        };
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
