// ─────────────────────────────────────────────────────────────────────────────
// shareUrl.ts — URL-safe base64 mix serialization (blueprint §5.6)
// ─────────────────────────────────────────────────────────────────────────────

import type { LayerState, UrlPayload } from "@/state/mixSchema";
import { clamp01 } from "@/audio/AudioEngine";
import manifestData from "@/assets/manifest.json";

const KNOWN_IDS = new Set((manifestData as { id: string }[]).map((s) => s.id));
const MAX_LAYERS = 20;
const PARAM_KEY = "mix";

// ── Encode ────────────────────────────────────────────────────────────────────

export function encodeMix(
  layers: LayerState[],
  masterVolume: number,
  meanderEnabled: boolean,
  timerDurationSec: number,
  timerEnabled: boolean
): string {
  const payload: UrlPayload = {
    v: 1,
    l: layers
      .filter((x) => x.enabled)
      .map((x) => [x.soundId, Math.round(clamp01(x.baseVolume) * 100)]),
    m: Math.round(clamp01(masterVolume) * 100),
    r: meanderEnabled ? 1 : 0,
    t: timerEnabled ? timerDurationSec : 0,
  };

  const json = JSON.stringify(payload);
  const b64 = btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return b64;
}

/** Return the full shareable URL. */
export function buildShareUrl(
  layers: LayerState[],
  masterVolume: number,
  meanderEnabled: boolean,
  timerDurationSec: number,
  timerEnabled: boolean
): string {
  const encoded = encodeMix(layers, masterVolume, meanderEnabled, timerDurationSec, timerEnabled);
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set(PARAM_KEY, encoded);
  return url.toString();
}

// ── Decode ────────────────────────────────────────────────────────────────────

export interface DecodedMix {
  layers: Pick<LayerState, "soundId" | "enabled" | "baseVolume" | "meanderMultiplier">[];
  masterVolume: number;
  meanderEnabled: boolean;
  timerDurationSec: number;
  timerEnabled: boolean;
}

/**
 * Try to decode a mix from the current URL's ?mix= parameter.
 * Returns null on any parsing/validation failure (never throws).
 */
export function decodeMixFromUrl(): DecodedMix | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get(PARAM_KEY);
    if (!raw) return null;

    // Re-pad and restore standard base64 chars
    const padded = raw.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded);
    const payload = JSON.parse(json) as UrlPayload;

    if (payload.v !== 1) return null;
    if (!Array.isArray(payload.l)) return null;

    const layers = payload.l
      .slice(0, MAX_LAYERS)
      .filter(([id]) => KNOWN_IDS.has(id))
      .map(([soundId, vol]) => ({
        soundId,
        enabled: true,
        baseVolume: clamp01(Number(vol) / 100),
        meanderMultiplier: 1,
      }));

    const masterVolume = clamp01(Number(payload.m) / 100);
    const meanderEnabled = payload.r === 1;
    const timerDurationSec = Math.max(0, Number(payload.t) || 0);
    const timerEnabled = timerDurationSec > 0;

    return { layers, masterVolume, meanderEnabled, timerDurationSec, timerEnabled };
  } catch {
    return null;
  }
}
