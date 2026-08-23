import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encodeMix } from "@/state/shareUrl";
import type { LayerState } from "@/state/mixSchema";

const setSearch = (search: string) => {
  Object.defineProperty(window, "location", {
    value: { ...window.location, search, href: `http://localhost/${search}` },
    writable: true,
  });
};

const makeLayers = (overrides: Partial<LayerState>[] = []): LayerState[] =>
  overrides.map((o) => ({
    soundId: "rain",
    enabled: true,
    baseVolume: 0.5,
    meanderMultiplier: 1,
    ...o,
  }));

describe("encodeMix", () => {
  it("produces a non-empty string", () => {
    const layers = makeLayers([{ soundId: "rain", baseVolume: 0.5 }]);
    const encoded = encodeMix(layers, 0.8, false, 1800, false);
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(0);
  });

  it("uses URL-safe characters only (no +, /, =)", () => {
    const layers = makeLayers([{ soundId: "rain", baseVolume: 0.75 }]);
    const encoded = encodeMix(layers, 0.8, true, 3600, true);
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it("only includes enabled layers", () => {
    const layers: LayerState[] = [
      { soundId: "rain", enabled: true, baseVolume: 0.5, meanderMultiplier: 1 },
      { soundId: "waves", enabled: false, baseVolume: 0.4, meanderMultiplier: 1 },
    ];
    const encoded = encodeMix(layers, 0.8, false, 0, false);
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(padded));
    expect(payload.l).toHaveLength(1);
    expect(payload.l[0][0]).toBe("rain");
  });

  it("rounds volume to nearest integer (0-100)", () => {
    const layers = makeLayers([{ soundId: "rain", baseVolume: 0.666 }]);
    const encoded = encodeMix(layers, 0.8, false, 0, false);
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(padded));
    expect(payload.l[0][1]).toBe(67);
  });

  it("encodes schema version as 1", () => {
    const layers = makeLayers();
    const encoded = encodeMix(layers, 0.8, false, 0, false);
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(padded));
    expect(payload.v).toBe(1);
  });

  it("encodes meander as 1 or 0", () => {
    const layers = makeLayers();
    const onEncoded = encodeMix(layers, 0.8, true, 0, false);
    const offEncoded = encodeMix(layers, 0.8, false, 0, false);
    const on = JSON.parse(atob(onEncoded.replace(/-/g, "+").replace(/_/g, "/")));
    const off = JSON.parse(atob(offEncoded.replace(/-/g, "+").replace(/_/g, "/")));
    expect(on.r).toBe(1);
    expect(off.r).toBe(0);
  });
});

describe("decodeMixFromUrl", () => {
  beforeEach(() => { setSearch(""); });
  afterEach(() => { setSearch(""); });

  it("returns null when no mix param is present", async () => {
    setSearch("?foo=bar");
    const { decodeMixFromUrl } = await import("@/state/shareUrl");
    expect(decodeMixFromUrl()).toBeNull();
  });

  it("returns null for completely invalid base64", async () => {
    setSearch("?mix=!!!INVALID!!!");
    const { decodeMixFromUrl } = await import("@/state/shareUrl");
    expect(decodeMixFromUrl()).toBeNull();
  });

  it("rejects unknown sound IDs", async () => {
    const payload = { v: 1, l: [["unknown-sound-999", 50]], m: 80, r: 0, t: 0 };
    const encoded = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    setSearch(`?mix=${encoded}`);
    const { decodeMixFromUrl } = await import("@/state/shareUrl");
    const result = decodeMixFromUrl();
    expect(result?.layers).toHaveLength(0);
  });

  it("clamps volume values to [0, 1]", async () => {
    const payload = { v: 1, l: [["rain", 999]], m: 200, r: 0, t: 0 };
    const encoded = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    setSearch(`?mix=${encoded}`);
    const { decodeMixFromUrl } = await import("@/state/shareUrl");
    const result = decodeMixFromUrl();
    expect(result?.layers[0].baseVolume).toBeLessThanOrEqual(1);
    expect(result?.masterVolume).toBeLessThanOrEqual(1);
  });

  it("returns null for wrong schema version", async () => {
    const payload = { v: 99, l: [], m: 80, r: 0, t: 0 };
    const encoded = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    setSearch(`?mix=${encoded}`);
    const { decodeMixFromUrl } = await import("@/state/shareUrl");
    expect(decodeMixFromUrl()).toBeNull();
  });
});
