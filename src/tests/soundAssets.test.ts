import { describe, it, expect } from "vitest";
import manifestData from "@/assets/manifest.json";
import fs from "fs";
import path from "path";

describe("Sound Assets Verification", () => {
  it("should have all 17 sound definitions in manifest.json", () => {
    expect(manifestData.length).toBe(17);
  });

  manifestData.forEach((sound) => {
    it(`should verify sound file exists on disk: ${sound.id} (${sound.file})`, () => {
      const filePath = path.resolve(process.cwd(), "public", sound.file.replace(/^\//, ""));
      const exists = fs.existsSync(filePath);
      expect(exists).toBe(true);

      const stats = fs.statSync(filePath);
      expect(stats.size).toBeGreaterThan(10000); // Verify it's a real audio file, not empty
    });
  });
});
