// ─────────────────────────────────────────────────────────────────────────────
// AudioEngine.ts — Core audio engine (blueprint §5.1)
// Single AudioContext · master GainNode · AnalyserNode · per-layer routing
// ─────────────────────────────────────────────────────────────────────────────

import type { SoundDefinition } from "@/state/mixSchema";

interface LayerNodes {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

export class AudioEngine {
  context: AudioContext;
  master: GainNode;
  analyser: AnalyserNode;
  private layers = new Map<string, LayerNodes>();
  private bufferCache = new Map<string, AudioBuffer>();

  constructor() {
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 256;

    // Audio graph: master → analyser → destination
    this.master.gain.value = 0.8;
    this.master.connect(this.analyser);
    this.analyser.connect(this.context.destination);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /** Resume AudioContext after a user gesture. */
  async ensureRunning(): Promise<void> {
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  async suspend(): Promise<void> {
    await this.context.suspend();
  }

  // ── Layer management ───────────────────────────────────────────────────────

  /** Load and start a looping layer. No-op if already loaded. */
  async addLayer(sound: SoundDefinition, volume: number): Promise<void> {
    if (this.layers.has(sound.id)) return;

    const audioBuffer = await this.loadBuffer(sound.file);
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();

    source.buffer = audioBuffer;
    source.loop = true;

    // Start silent, then ramp up to avoid click
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(this.master);
    source.start();

    this.layers.set(sound.id, { source, gain });
    this.setLayerVolume(sound.id, volume, 0.25);
  }

  /** Remove a layer, fading it out first, then stopping. */
  removeLayer(id: string): void {
    const node = this.layers.get(id);
    if (!node) return;

    const now = this.context.currentTime;
    node.gain.gain.cancelScheduledValues(now);
    node.gain.gain.setTargetAtTime(0, now, 0.06);

    setTimeout(() => {
      try {
        node.source.stop(this.context.currentTime + 0.05);
        node.source.disconnect();
        node.gain.disconnect();
      } catch {
        // Already stopped
      }
      this.layers.delete(id);
    }, 300);
  }

  hasLayer(id: string): boolean {
    return this.layers.has(id);
  }

  // ── Volume control (blueprint §5.1, §5.2) ─────────────────────────────────

  /**
   * Set a layer's gain with a smooth ramp — no clicks.
   * rampSec: time constant for setTargetAtTime (τ = rampSec/3).
   */
  setLayerVolume(id: string, volume: number, rampSec = 0.12): void {
    const node = this.layers.get(id);
    if (!node) return;
    const safe = clamp01(volume);
    const now = this.context.currentTime;
    node.gain.gain.cancelScheduledValues(now);
    node.gain.gain.setTargetAtTime(safe, now, rampSec / 3);
  }

  /** Set master volume with a short ramp. */
  setMasterVolume(volume: number, rampSec = 0.12): void {
    const safe = clamp01(volume);
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(safe, now, rampSec / 3);
  }

  // ── Timer fade (blueprint §5.5) ────────────────────────────────────────────

  /** Schedule master gain to ramp linearly to zero over fadeSec seconds. */
  scheduleMasterFade(fadeSec: number): void {
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0, now + fadeSec);
  }

  /** Restore master gain without a jump. */
  restoreMasterVolume(volume: number, rampSec = 0.5): void {
    const safe = clamp01(volume);
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(safe, now, rampSec / 3);
  }

  // ── Analyser (blueprint §5.7) ──────────────────────────────────────────────

  getTimeDomainData(): Uint8Array {
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    return data;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async loadBuffer(url: string): Promise<AudioBuffer> {
    if (this.bufferCache.has(url)) return this.bufferCache.get(url)!;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch audio: ${url} (${response.status})`);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
    this.bufferCache.set(url, audioBuffer);
    return audioBuffer;
  }

  dispose(): void {
    this.layers.forEach((_, id) => this.removeLayer(id));
    setTimeout(() => this.context.close(), 500);
  }
}

// ─── Pure helpers (also exported for tests) ───────────────────────────────────

/** Clamp a number to [0, 1]. Returns 0 for non-finite inputs. */
export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

/**
 * Map a linear UI slider [0,1] to perceptual gain [0,1].
 * Power curve gives finer control at quiet levels (blueprint §5.2).
 */
export function sliderToGain(slider: number): number {
  return Math.pow(clamp01(slider), 2.0);
}

/**
 * Compute the effective output gain for a layer (blueprint §5.2).
 * outputGain = masterVolume × baseVolume × meanderMultiplier × enabledFlag
 */
export function computeLayerGain(
  masterVolume: number,
  baseVolume: number,
  meanderMultiplier: number,
  enabled: boolean
): number {
  return clamp01(masterVolume) * clamp01(baseVolume) * clamp01(meanderMultiplier) * (enabled ? 1 : 0);
}
