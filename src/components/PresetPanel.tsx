import { useState, useCallback } from "react";
import { useMixStore, BUILT_IN_PRESETS } from "@/state/store";
import type { Preset } from "@/state/mixSchema";

export function PresetPanel() {
  const customPresets = useMixStore((s) => s.customPresets);
  const loadPreset = useMixStore((s) => s.loadPreset);
  const saveCustomPreset = useMixStore((s) => s.saveCustomPreset);
  const deleteCustomPreset = useMixStore((s) => s.deleteCustomPreset);

  const [presetName, setPresetName] = useState("");

  const handleLoad = useCallback(
    (preset: Preset) => {
      loadPreset(preset);
    },
    [loadPreset]
  );

  const handleSave = useCallback(() => {
    const name = presetName.trim();
    if (!name) return;
    saveCustomPreset(name, "Custom mix preset");
    setPresetName("");
  }, [saveCustomPreset, presetName]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleSave();
    },
    [handleSave]
  );

  return (
    <div className="panel-widget" aria-label="Preset configurations">
      <div className="panel-widget__title">
        <span aria-hidden="true">🎛️</span> Presets
      </div>

      <div className="preset-list-stack">
        {BUILT_IN_PRESETS.map((preset) => (
          <div key={preset.id} className="preset-list-row">
            <button
              type="button"
              className="preset-select-btn"
              onClick={() => handleLoad(preset)}
            >
              <span>{preset.name}</span>
              <span>{preset.description}</span>
            </button>
          </div>
        ))}

        {customPresets.map((preset) => (
          <div key={preset.id} className="preset-list-row">
            <button
              type="button"
              className="preset-select-btn"
              onClick={() => handleLoad(preset)}
            >
              <span>{preset.name}</span>
              <span>{preset.description}</span>
            </button>
            <button
              type="button"
              className="preset-delete-icon-btn"
              onClick={() => deleteCustomPreset(preset.id)}
              aria-label={`Delete ${preset.name}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="preset-creator-row">
        <input
          type="text"
          className="preset-creator-input"
          placeholder="New preset name…"
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={30}
        />
        <button
          type="button"
          className="preset-creator-save-btn"
          onClick={handleSave}
          disabled={!presetName.trim()}
        >
          Save
        </button>
      </div>
    </div>
  );
}
