// ─────────────────────────────────────────────────────────────────────────────
// persistence.ts — LocalStorage save/load (blueprint §5.6, §2)
// ─────────────────────────────────────────────────────────────────────────────

import type { MixState, Preset } from "@/state/mixSchema";

const STORAGE_KEY_MIX = "mellowmist_mix_v1";
const STORAGE_KEY_PRESETS = "mellowmist_presets_v1";

// ── Mix state ─────────────────────────────────────────────────────────────────

export function saveMix(mix: MixState): void {
  try {
    localStorage.setItem(STORAGE_KEY_MIX, JSON.stringify(mix));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function loadMix(): MixState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MIX);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MixState;
    if (parsed.schemaVersion !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearMix(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_MIX);
  } catch {
    // ignore
  }
}

// ── Custom presets ────────────────────────────────────────────────────────────

export function saveCustomPresets(presets: Preset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(presets));
  } catch {
    // ignore
  }
}

export function loadCustomPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRESETS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Preset[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function deleteCustomPreset(id: string, presets: Preset[]): Preset[] {
  const updated = presets.filter((p) => p.id !== id);
  saveCustomPresets(updated);
  return updated;
}
