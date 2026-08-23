// ─────────────────────────────────────────────────────────────────────────────
// mixSchema.ts — All TypeScript types for MellowMist (from blueprint §4)
// ─────────────────────────────────────────────────────────────────────────────

export type LicenseKind =
  | "CC0"
  | "CC-BY"
  | "CC-BY-SA"
  | "Pixabay"
  | "public-domain"
  | "self-recorded"
  | "research-only"
  | "unknown";

export type Redistribution =
  | "allowed"
  | "allowed-with-attribution"
  | "not-confirmed"
  | "not-allowed";

export interface SoundDefinition {
  id: string;               // stable ID, e.g. "rain-soft-01"
  title: string;
  category: "nature" | "indoor" | "city" | "noise" | "music";
  file: string;             // local or CDN URL
  format: "ogg" | "mp3" | "wav" | "flac";
  durationSec: number;
  loopable: boolean;
  defaultVolume: number;    // 0.0–1.0
  tags: string[];
  icon: string;             // emoji icon for UI
  creator: string;
  sourceUrl: string;
  license: LicenseKind;
  licenseUrl: string;
  attribution?: string;
  downloadedAt: string;     // ISO date
  sha256: string;
  redistribution: Redistribution;
  loudnessLufs?: number;
  notes?: string;
}

// ─── Runtime Layer State ─────────────────────────────────────────────────────

export interface LayerState {
  soundId: string;
  enabled: boolean;
  baseVolume: number;         // user-selected value, 0.0–1.0
  meanderMultiplier: number;  // runtime value, normally 0.75–1.15
  pan?: number;               // -1.0 left to +1.0 right
  filterHz?: number;
}

// ─── Timer ───────────────────────────────────────────────────────────────────

export interface TimerState {
  enabled: boolean;
  durationSec: number;
  startedAt?: number;        // performance.now() timestamp
  fadeSec: number;
  status: "idle" | "running" | "fading" | "finished";
}

// ─── Mix / Preset ────────────────────────────────────────────────────────────

export interface MixState {
  schemaVersion: 1;
  name: string;
  layers: LayerState[];
  masterVolume: number;
  meanderEnabled: boolean;
  timer: TimerState;
  createdAt: string;
  updatedAt: string;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  mix: MixState;
  builtIn: boolean;
}

// ─── URL Payload (compact serialized form) ────────────────────────────────────

export interface UrlPayload {
  v: 1;
  l: [string, number][];  // [soundId, volume 0-100][]
  m: number;              // masterVolume 0-100
  r: 0 | 1;              // meanderEnabled
  t: number;             // timer durationSec (0 = disabled)
}
