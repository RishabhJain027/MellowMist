# Ambient Sound Mixer: Build-Ready Technical Blueprint

## 1. Important boundary

You can recreate the **behavior and architecture** of an A Soft Murmur-style product, but you should not copy its name, logo, artwork, proprietary audio, app-store assets, or private source code. The public site exposes its feature behavior—layered sounds, per-sound controls, timers, meander, mixes, sharing, login, and mobile links—but not its internal implementation. Use the references below as learning material and verify every audio file before production use.

## 2. Master build prompt

Copy this prompt into your coding agent:

> Build an original, responsive ambient sound mixer called **[YOUR BRAND NAME]**. Do not copy A Soft Murmur’s branding, visual identity, artwork, audio files, text, or source code. Recreate only the general product category: a calm browser-based tool for layering ambient sounds.
>
> Use React + TypeScript + Vite for the frontend. Use the Web Audio API directly for playback. The first release must work without a backend, account, or paid API. Use a dark, accessible interface with a sound-layer grid, master volume, play/pause, mute, per-layer play toggles, per-layer volume sliders, timer controls, gradual fade-out, meander modulation, preset mixes, URL sharing, LocalStorage persistence, keyboard access, reduced-motion support, and responsive mobile layout.
>
> Create one `AudioContext`, one looping audio source and one `GainNode` per sound layer, one optional analyser node for visualization, and one master `GainNode` routed to `AudioContext.destination`. Decode audio files with `fetch()` and `audioContext.decodeAudioData()`. Start the audio context only after a user gesture. Use scheduled `AudioParam` automation for fades and volume changes so there are no clicks.
>
> Implement meander as a bounded, low-frequency random walk. Every 50–150 ms, generate a target value for each active layer, clamp it to safe minimum and maximum multipliers, and move the layer gain toward the target with `setTargetAtTime()` or a short linear ramp. Never change volume abruptly. Preserve the user’s base slider volume separately from the current meander multiplier.
>
> Implement a timer with selectable durations and an optional fade window. When the timer expires, schedule the master gain to ramp to zero over 1.5–5 seconds, stop or suspend sources after the fade, and reset the timer state. If the user presses play again, restore the previous base volumes without forcing them to full volume.
>
> Implement mixes as JSON objects containing sound IDs, base volumes, mute states, meander state, timer settings, and metadata. Save the last state and custom presets to LocalStorage. Encode a compact, versioned mix object in the URL using URL-safe base64 or a compressed query string. Validate all decoded values and ignore unknown sound IDs. Add a copy-link button with the Clipboard API and a fallback prompt.
>
> Add an asset manifest for every audio file. Each record must include the creator, source URL, download date, exact license, attribution text, file hash, duration, sample rate, channels, loudness measurement, and whether redistribution in a bundled web app is permitted. Include an attribution page for CC-BY assets. Do not bundle an asset until its license has been individually checked.
>
> Add unit tests for volume clamping, mix serialization/deserialization, timer transitions, meander bounds, and unknown URL parameters. Add a README explaining the asset licensing policy and how to replace demo files with verified audio. Keep the implementation modular: `audio/AudioEngine`, `audio/LayerNode`, `audio/meander`, `audio/timer`, `state/mixSchema`, `state/persistence`, `components/SoundCard`, `components/MixerControls`, `components/PresetPanel`, and `components/ShareDialog`.
>
> The final UI must clearly state that the project is an original implementation inspired by the ambient-mixer category, not an official A Soft Murmur product.

## 3. Recommended architecture

| Layer | Responsibility | Suggested implementation |
|---|---|---|
| UI | Sound cards, sliders, transport, timer, presets, share dialog | React components with keyboard and screen-reader labels |
| State | Base volume, mute, playing, meander, timer, current preset | React context or Zustand; LocalStorage adapter |
| Audio engine | Context lifecycle and master routing | `AudioContext` + master `GainNode` + optional `AnalyserNode` |
| Layer node | One sound’s source, gain, loading, fade, teardown | `AudioBufferSourceNode` → `GainNode` → master |
| Asset manifest | Rights and technical metadata | Versioned JSON checked into source control |
| Sharing | Portable mix state | Validated URL query payload; no audio binaries in URL |
| Offline | Cache app shell and verified audio | Service worker / Workbox or Vite PWA plugin |
| Optional backend | Accounts, cloud presets, sync, analytics | Add only after the local-first version works |

The browser audio graph should be:

```text
AudioBufferSourceNode (looping)
        ↓
optional BiquadFilterNode / StereoPannerNode
        ↓
GainNode (base volume × meander multiplier)
        ↓
master GainNode (master volume × timer fade)
        ↓
AnalyserNode (optional visualization)
        ↓
AudioContext.destination
```

## 4. Desired data models

### 4.1 Sound manifest

```ts
export type LicenseKind =
  | "CC0"
  | "CC-BY"
  | "CC-BY-SA"
  | "Pixabay"
  | "public-domain"
  | "self-recorded"
  | "research-only"
  | "unknown";

export interface SoundDefinition {
  id: string;                 // stable ID, e.g. "rain-soft-01"
  title: string;
  category: "nature" | "indoor" | "city" | "noise" | "music";
  file: string;               // local or CDN URL
  format: "ogg" | "mp3" | "wav" | "flac";
  durationSec: number;
  loopable: boolean;
  defaultVolume: number;      // 0.0–1.0
  tags: string[];
  creator: string;
  sourceUrl: string;
  license: LicenseKind;
  licenseUrl: string;
  attribution?: string;
  downloadedAt: string;       // ISO date
  sha256: string;
  redistribution: "allowed" | "allowed-with-attribution" | "not-confirmed" | "not-allowed";
  loudnessLufs?: number;
  notes?: string;
}
```

### 4.2 Runtime layer state

```ts
export interface LayerState {
  soundId: string;
  enabled: boolean;
  baseVolume: number;         // user-selected value, 0.0–1.0
  meanderMultiplier: number;  // runtime value, normally 0.75–1.15
  pan?: number;               // -1.0 left to +1.0 right
  filterHz?: number;
}
```

### 4.3 Mix, preset, and timer

```ts
export interface TimerState {
  enabled: boolean;
  durationSec: number;
  startedAt?: number;
  fadeSec: number;
  status: "idle" | "running" | "fading" | "finished";
}

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
```

### 4.4 Example asset manifest record

```json
{
  "id": "rain-soft-01",
  "title": "Rain — soft window texture",
  "category": "nature",
  "file": "/audio/rain-soft-01.ogg",
  "format": "ogg",
  "durationSec": 92.4,
  "loopable": true,
  "defaultVolume": 0.42,
  "tags": ["rain", "masking", "sleep"],
  "creator": "Your Name",
  "sourceUrl": "https://example.org/source",
  "license": "CC0",
  "licenseUrl": "https://creativecommons.org/public-domain/cc0/",
  "downloadedAt": "2026-08-23",
  "sha256": "REPLACE_WITH_REAL_HASH",
  "redistribution": "allowed",
  "loudnessLufs": -20.4
}
```

## 5. Core algorithms

### 5.1 Audio context and layer creation

```ts
class AudioEngine {
  context = new AudioContext();
  master = this.context.createGain();
  analyser = this.context.createAnalyser();
  layers = new Map<string, { source: AudioBufferSourceNode; gain: GainNode }>();

  constructor() {
    this.master.gain.value = 0.8;
    this.master.connect(this.analyser);
    this.analyser.connect(this.context.destination);
  }

  async ensureRunning() {
    if (this.context.state === "suspended") await this.context.resume();
  }

  async addLayer(sound: SoundDefinition, volume: number) {
    const response = await fetch(sound.file);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = audioBuffer;
    source.loop = true;
    gain.gain.value = 0;
    source.connect(gain).connect(this.master);
    source.start();
    this.layers.set(sound.id, { source, gain });
    this.setLayerVolume(sound.id, volume, 0.25);
  }

  setLayerVolume(id: string, volume: number, rampSec = 0.12) {
    const node = this.layers.get(id);
    if (!node) return;
    const safe = Math.min(1, Math.max(0, volume));
    const now = this.context.currentTime;
    node.gain.gain.cancelScheduledValues(now);
    node.gain.gain.setTargetAtTime(safe, now, rampSec / 3);
  }
}
```

### 5.2 Volume model

Keep the user’s slider volume separate from all automatic modulation:

```ts
outputGain = masterVolume * baseVolume * meanderMultiplier * enabledFlag;
```

Clamp every input:

```ts
function clamp01(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}
```

For a more natural perception curve, map the UI slider to gain using a simple power curve:

```ts
function sliderToGain(slider: number) {
  return Math.pow(clamp01(slider), 2.0);
}
```

The power curve gives the user finer control at quiet levels. Do not allow the master and layer gains to exceed safe limits; reserve headroom for multiple simultaneous layers.

### 5.3 Smooth play/pause

Never stop and restart a loop merely to mute it. Ramp its gain to zero and keep the source alive. This avoids a click and preserves phase continuity:

```ts
function fadeLayer(gain: GainNode, target: number, context: AudioContext, seconds = 0.18) {
  const now = context.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setTargetAtTime(target, now, seconds / 3);
}
```

Stop and dispose the source only when removing a layer or suspending the whole engine:

```ts
source.stop(context.currentTime + 0.05);
source.disconnect();
gain.disconnect();
```

### 5.4 Meander modulation

The goal is not random flickering. Use a slow bounded random walk with a new target every few seconds and a smoothed transition:

```ts
function startMeander(layerId: string, getBaseVolume: () => number, setOutput: (v: number) => void) {
  let multiplier = 1;
  let target = 1;
  let timer: number;

  const tick = () => {
    target = 0.78 + Math.random() * 0.42; // 0.78–1.20
    const start = multiplier;
    const startTime = performance.now();
    const duration = 1800 + Math.random() * 2600;

    const frame = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = t * t * (3 - 2 * t);
      multiplier = start + (target - start) * eased;
      setOutput(clamp01(getBaseVolume() * multiplier));
      if (t < 1) requestAnimationFrame(frame);
      else timer = window.setTimeout(tick, 350 + Math.random() * 900);
    };
    requestAnimationFrame(frame);
  };

  tick();
  return () => window.clearTimeout(timer);
}
```

For production, prefer scheduling gain automation on the audio clock rather than relying entirely on `requestAnimationFrame`; UI frame rates can pause in background tabs. A hybrid approach is acceptable: use the audio clock for gain ramps and React only for display state.

### 5.5 Timer and fade-out

```ts
function scheduleMasterFade(master: GainNode, context: AudioContext, fadeSec: number) {
  const now = context.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(0, now + fadeSec);
}
```

Timer flow:

```text
idle → running → fading → finished
```

When `durationSec - fadeSec` is reached, begin the fade. At `durationSec`, mark the timer finished and either keep sources muted for fast restart or stop and dispose them to save memory. For a small number of short loops, keeping sources alive is simpler; for many long files, dispose them after the fade.

### 5.6 Shareable mixes

Share settings, not audio files:

```ts
const payload = {
  v: 1,
  l: layers.filter(x => x.enabled).map(x => [x.soundId, Math.round(x.baseVolume * 100)]),
  m: Math.round(masterVolume * 100),
  r: meanderEnabled ? 1 : 0,
  t: timer.enabled ? timer.durationSec : 0
};
```

Serialize with a URL-safe encoder. On load, validate the schema version, clamp all numeric values, reject unknown sound IDs, cap the number of layers, and fall back to the default mix when parsing fails. Do not place user data, secrets, or large audio content in the URL.

### 5.7 Audio visualization

Use `AnalyserNode` for a lightweight visual response:

```ts
const data = new Uint8Array(analyser.frequencyBinCount);
function draw() {
  analyser.getByteTimeDomainData(data);
  // Draw a small waveform on Canvas or SVG.
  requestAnimationFrame(draw);
}
```

The visualization should be decorative and optional. It must not imply that it is measuring wellness, concentration, or medical outcomes.

## 6. Asset production workflow

The most legally reliable path is to record your own loops or commission recordings under a written license. The next safest path is CC0/public-domain material with a saved license page and file hash. CC-BY material can work if you provide durable attribution. Pixabay content can be free and adaptable under its license summary, but its terms prohibit standalone redistribution and warn that additional rights can apply. Freesound licenses vary per file. Kaggle datasets are valuable for research and classification, but a dataset’s presence on Kaggle does not automatically authorize bundling its clips into a public consumer product.

For every candidate file, use this workflow:

```text
search → open the item page → read the exact license → download → hash the file
→ inspect duration/format → normalize/trim → record attribution → approve or reject
```

Technical preprocessing can include trimming leading silence, removing clicks, creating a short crossfade at the loop boundary, converting to OGG/MP3, and measuring integrated loudness. Keep the original file separate from the processed derivative and preserve the original license metadata.

## 7. Current technical and asset links

| Resource | Link | Use it for | Rights / caution |
|---|---|---|---|
| Web Audio API | [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) | Audio graph, sources, gain, analysers, routing | Browser platform documentation |
| Web Audio best practices | [MDN best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) | Loading, scheduling, performance, lifecycle | Primary browser guidance |
| Looping source reference | [MDN AudioBufferSourceNode.loop](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/loop) | Seamless repeated buffer playback | Primary browser documentation |
| Open-source mixer reference | [bradtraversy/ambient-sound-mixer](https://github.com/bradtraversy/ambient-sound-mixer) | Vanilla JS structure, presets, timers, LocalStorage | MIT repository; bundled audio still needs separate review |
| Ambient system reference | [synssins/sonorium](https://github.com/synssins/sonorium) | Multi-zone mixing, themes, crossfade looping, speaker routing | Read repository LICENSE; it is a Home Assistant-oriented project |
| Ambient mixer reference | [zirbmaj/ambient-mixer](https://github.com/zirbmaj/ambient-mixer) | Web Audio layers and synthesized/recorded sound ideas | Inspect current repository license and assets |
| Focus mixer reference | [OndrejVatka/Hush](https://github.com/OndrejVatka/Hush) | Small browser ambient mixer UX | Inspect current repository license and audio sources |
| Web Audio package index | [awesome-webaudio](https://github.com/notthetup/awesome-webaudio) | Discover libraries for synthesis, analysis, DSP, and visualization | Individual packages have individual licenses |
| Audio helper | [howler.js](https://github.com/goldfire/howler.js) | Easier playback with Web Audio and HTML5 fallback | MIT; use direct Web Audio if you need graph-level modulation |
| Interactive waveform UI | [wavesurfer.js](https://github.com/katspaugh/wavesurfer.js) | Waveform display and audio controls | Check version-specific architecture and license |
| Interactive synthesis | [Tone.js](https://tonejs.github.io/) | Scheduling, synthesis, musical timing | Use only if you need its higher-level abstractions |
| Free sound repository | [Freesound](https://freesound.org/) | Candidate field recordings and effects | Every file has its own license; filter for CC0 or track attribution |
| CC0 sound packs | [OpenGameArt CC0 Sound Effects](https://opengameart.org/content/cc0-sound-effects) | Public-domain-style candidate effects | Confirm pack page and included files |
| Pixabay audio | [Pixabay license summary](https://pixabay.com/service/license-summary/) | Royalty-free candidate audio | Free/adaptable under terms; no standalone redistribution; check additional rights |
| BBC collection | [BBC Sound Effects](https://sound-effects.bbcrewind.co.uk/) | Research and personal/educational exploration | Not universally free for commercial redistribution; licensing may be required |
| Mixkit rain sounds | [Mixkit rain library](https://mixkit.co/free-sound-effects/rain/) | Candidate rain effects | Read current library terms before bundling |
| Kaggle ambient noise | [Kaggle Ambient Noise](https://www.kaggle.com/datasets/solorzano/ambient-noise) | Exploration and prototyping | Dataset-specific rights; do not assume production redistribution |
| Kaggle background noise | [Kaggle Background Noise](https://www.kaggle.com/datasets/moazabdeljalil/back-ground-noise) | Noise research and classification | Dataset-specific rights |
| ESC-50 | [ESC-50 dataset](https://github.com/karolpiczak/ESC-50) | Environmental sound classification experiments | Dataset license and intended use must be checked |
| FSDKaggle2018 | [Freesound Audio Tagging Challenge](https://www.kaggle.com/competitions/freesound-audio-tagging/data) | Audio tagging experiments | Research dataset; do not bundle blindly |

## 8. Suggested implementation phases

| Phase | Output | Completion test |
|---|---|---|
| 1. Shell | Responsive UI with fake sound cards | Keyboard navigation and mobile layout work |
| 2. Audio engine | One loop with gain control | Start only after gesture; no click on fade |
| 3. Multi-layer mix | 8–16 independent layers | Each layer can mute, fade, and retain its volume |
| 4. Meander | Bounded smooth modulation | No audible flicker; modulation survives UI rerenders |
| 5. Timer | Stop and fade modes | Master gain reaches zero at the expected time |
| 6. Presets | Built-in and custom presets | Save, load, delete, and restore work after refresh |
| 7. Sharing | Encoded URL state | Invalid or unknown payloads fail safely |
| 8. Offline | Service worker and cached approved audio | App launches without network after first visit |
| 9. Rights | Manifest and attribution page | Every bundled asset has a license record and hash |
| 10. QA | Browser/device/accessibility testing | No console errors; reduced motion; audio resumes after tab visibility changes |

## 9. What not to claim

Do not claim that the mixer treats ADHD, insomnia, tinnitus, anxiety, or any other medical condition. You may describe it as a relaxation, focus, or background-noise tool, but avoid medical promises. Do not publish files copied from another ambient website merely because they are playable in the browser. “Free to download” and “free to redistribute in a web app” are different rights.

## References

[1]: https://asoftmurmur.com/ "A Soft Murmur"
[2]: https://github.com/bradtraversy/ambient-sound-mixer "Brad Traversy ambient-sound-mixer"
[3]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API "MDN Web Audio API"
[4]: https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/loop "MDN AudioBufferSourceNode loop"
[5]: https://pixabay.com/service/license-summary/ "Pixabay Content License Summary"
[6]: https://opengameart.org/content/cc0-sound-effects "OpenGameArt CC0 Sound Effects"
[7]: https://github.com/synssins/sonorium "Sonorium"
[8]: https://github.com/zirbmaj/ambient-mixer "ambient-mixer"
[9]: https://github.com/OndrejVatka/Hush "Hush"
[10]: https://github.com/goldfire/howler.js "howler.js"
[11]: https://github.com/katspaugh/wavesurfer.js "wavesurfer.js"
[12]: https://tonejs.github.io/ "Tone.js"
[13]: https://freesound.org/ "Freesound"
[14]: https://sound-effects.bbcrewind.co.uk/ "BBC Sound Effects"
[15]: https://www.kaggle.com/datasets/solorzano/ambient-noise "Kaggle Ambient Noise"
[16]: https://www.kaggle.com/competitions/freesound-audio-tagging/data "FSDKaggle2018"
