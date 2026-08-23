import { describe, it, expect, beforeEach } from "vitest";
import { encodeMix } from "@/state/shareUrl";
import type { LayerState } from "@/state/mixSchema";

const setSearch = (search: string) => {
  Object.defineProperty(window, "location", {
    value: { ...window.location, search, href: `http://localhost/${search}` },
    writable: true,
    configurable: true,
  });
};

const makeLayer = (soundId: string, baseVolume = 0.5): LayerState => ({
  soundId, enabled: true, baseVolume, meanderMultiplier: 1,
});

describe("URL parameter handling", () => {
  beforeEach(() => setSearch(""));

  it("returns null when no ?mix param", async () => {
    setSearch("?foo=123&bar=abc");
    const { decodeMixFromUrl } = await import("@/state/shareUrl");
    expect(decodeMixFromUrl()).toBeNull();
  });

  it("returns null for empty ?mix= value", async () => {
    setSearch("?mix=");
    const { decodeMixFromUrl } = await import("@/state/shareUrl");
    expect(decodeMixFromUrl()).toBeNull();
  });

  it("returns null for arbitrary garbage string", async () => {
    setSearch("?mix=zzzzzzzzzzz");
    const { decodeMixFromUrl } = await import("@/state/shareUrl");
    expect(decodeMixFromUrl()).toBeNull();
  });

  it("returns null for valid base64 but invalid JSON", async () => {
    const notJson = btoa("NOT_JSON").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    setSearch(`?mix=${notJson}`);
    const { decodeMixFromUrl } = await import("@/state/shareUrl");
    expect(decodeMixFromUrl()).toBeNull();
  });

  it("returns null when l is missing from payload", async () => {
    const payload = { v: 1, m: 80, r: 0, t: 0 };
    const encoded = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    setSearch(`?mix=${encoded}`);
    const { decodeMixFromUrl } = await import("@/state/shareUrl");
    expect(decodeMixFromUrl()).toBeNull();
  });

  it("filters out all unknown sound IDs", async () => {
    const payload = { v: 1, l: [["unknown-id-1", 50], ["unknown-id-2", 70]], m: 80, r: 0, t: 0 };
    const encoded = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    setSearch(`?mix=${encoded}`);
    const { decodeMixFromUrl } = await import("@/state/shareUrl");
    const result = decodeMixFromUrl();
    expect(result?.layers).toHaveLength(0);
  });

  it("preserves known IDs while dropping unknown ones", async () => {
    const payload = { v: 1, l: [["rain", 55], ["unknown-xyz", 70], ["waves", 40]], m: 80, r: 0, t: 0 };
    const encoded = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    setSearch(`?mix=${encoded}`);
    const { decodeMixFromUrl } = await import("@/state/shareUrl");
    const result = decodeMixFromUrl();
    expect(result?.layers).toHaveLength(2);
    expect(result?.layers.map((l) => l.soundId)).toContain("rain");
    expect(result?.layers.map((l) => l.soundId)).toContain("waves");
  });

  it("caps layers at MAX_LAYERS (20)", async () => {
    const l = Array.from({ length: 30 }, () => ["rain", 50]);
    const payload = { v: 1, l, m: 80, r: 0, t: 0 };
    const encoded = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    setSearch(`?mix=${encoded}`);
    const { decodeMixFromUrl } = await import("@/state/shareUrl");
    const result = decodeMixFromUrl();
    expect(result?.layers.length).toBeLessThanOrEqual(20);
  });

  it("encodeMix + decodeMixFromUrl is a round-trip for known IDs", async () => {
    const layers: LayerState[] = [makeLayer("rain", 0.6), makeLayer("waves", 0.4)];
    const encoded = encodeMix(layers, 0.75, true, 1800, true);
    setSearch(`?mix=${encoded}`);
    const { decodeMixFromUrl } = await import("@/state/shareUrl");
    const result = decodeMixFromUrl();
    expect(result).not.toBeNull();
    expect(result?.layers).toHaveLength(2);
    expect(result?.masterVolume).toBeCloseTo(0.75, 1);
    expect(result?.meanderEnabled).toBe(true);
    expect(result?.timerDurationSec).toBe(1800);
  });
});
