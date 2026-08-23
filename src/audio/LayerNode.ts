// ─────────────────────────────────────────────────────────────────────────────
// LayerNode.ts — Individual sound layer lifecycle helpers (blueprint §3)
// One looping source per sound layer: AudioBufferSourceNode → GainNode → master
// ─────────────────────────────────────────────────────────────────────────────

import { clamp01 } from "./AudioEngine";

export interface LayerNodeConfig {
  context: AudioContext;
  buffer: AudioBuffer;
  masterGain: GainNode;
  initialVolume: number;
}

export interface LayerNodeRef {
  source: AudioBufferSourceNode;
  gain: GainNode;
  isRunning: () => boolean;
  setVolume: (volume: number, rampSec?: number) => void;
  fadeTo: (target: number, context: AudioContext, seconds?: number) => void;
  stop: () => void;
}

/**
 * Create and start a looping layer node.
 * The source starts at volume 0 and ramps to initialVolume to avoid click.
 *
 * Graph: AudioBufferSourceNode (looping) → GainNode → masterGain
 */
export function createLayerNode(config: LayerNodeConfig): LayerNodeRef {
  const { context, buffer, masterGain, initialVolume } = config;
  let alive = true;

  const source = context.createBufferSource();
  const gain = context.createGain();

  source.buffer = buffer;
  source.loop = true;
  gain.gain.value = 0; // start silent

  source.connect(gain);
  gain.connect(masterGain);
  source.start();

  // Ramp up to initial volume
  const safe = clamp01(initialVolume);
  const now = context.currentTime;
  gain.gain.setTargetAtTime(safe, now, 0.08); // ~250 ms ramp

  source.onended = () => { alive = false; };

  return {
    source,
    gain,

    isRunning: () => alive,

    /** Set gain with a smooth ramp — no audible click (blueprint §5.3). */
    setVolume(volume: number, rampSec = 0.12) {
      if (!alive) return;
      const v = clamp01(volume);
      const t = context.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setTargetAtTime(v, t, rampSec / 3);
    },

    /**
     * Smooth fade to a target gain (blueprint §5.3).
     * Never changes gain abruptly.
     */
    fadeTo(target: number, ctx: AudioContext, seconds = 0.18) {
      if (!alive) return;
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setTargetAtTime(clamp01(target), t, seconds / 3);
    },

    /** Gracefully stop the source node. */
    stop() {
      if (!alive) return;
      alive = false;
      const t = context.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setTargetAtTime(0, t, 0.06);
      setTimeout(() => {
        try {
          source.stop(context.currentTime + 0.05);
          source.disconnect();
          gain.disconnect();
        } catch {
          // Already stopped
        }
      }, 250);
    },
  };
}
