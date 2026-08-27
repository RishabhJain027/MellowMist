import { useState, useCallback } from "react";
import { useMixStore, BUILT_IN_PRESETS } from "@/state/store";
import type { Preset } from "@/state/mixSchema";
import manifestData from "@/assets/manifest.json";

export function PresetPanel() {
  const customPresets = useMixStore((s) => s.customPresets);
  const currentLayers = useMixStore((s) => s.mix.layers);
  const loadPreset = useMixStore((s) => s.loadPreset);
  const saveCustomPreset = useMixStore((s) => s.saveCustomPreset);
  const deleteCustomPreset = useMixStore((s) => s.deleteCustomPreset);
  const togglePlayPause = useMixStore((s) => s.togglePlayPause);
  const isPlaying = useMixStore((s) => s.isPlaying);

  const [presetName, setPresetName] = useState("");
  const [comboDescription, setComboDescription] = useState("");
  const [activeTab, setActiveTab] = useState<"library" | "create">("library");

  const activeLayers = currentLayers.filter((l) => l.enabled);

  const handleLoad = useCallback(
    (preset: Preset) => {
      loadPreset(preset);
      if (!isPlaying) {
        togglePlayPause();
      }
    },
    [loadPreset, isPlaying, togglePlayPause]
  );

  const handleSaveCurrentCombo = useCallback(() => {
    const name = presetName.trim();
    if (!name) return;
    
    // Auto-generate description if empty
    const desc = comboDescription.trim() || 
      (activeLayers.length > 0 
        ? `Custom combo of ${activeLayers.length} sounds (${activeLayers.map(l => manifestData.find(m => m.id === l.soundId)?.title || l.soundId).slice(0, 3).join(", ")})` 
        : "Custom sound mix");

    saveCustomPreset(name, desc);
    setPresetName("");
    setComboDescription("");
    setActiveTab("library");
  }, [saveCustomPreset, presetName, comboDescription, activeLayers]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleSaveCurrentCombo();
    },
    [handleSaveCurrentCombo]
  );

  return (
    <div className="panel-widget" aria-label="Preset configurations">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="panel-widget__title">
          <span aria-hidden="true">🎛️</span> Sound Combos
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", background: "rgba(255, 255, 255, 0.05)", borderRadius: "var(--radius-sm)", padding: "2px" }}>
          <button
            type="button"
            onClick={() => setActiveTab("library")}
            style={{
              padding: "0.25rem 0.6rem",
              fontSize: "0.72rem",
              fontWeight: 600,
              border: "none",
              borderRadius: "var(--radius-xs)",
              background: activeTab === "library" ? "rgba(255, 255, 255, 0.15)" : "transparent",
              color: activeTab === "library" ? "#ffffff" : "var(--text-muted)",
              cursor: "pointer"
            }}
          >
            Presets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("create")}
            style={{
              padding: "0.25rem 0.6rem",
              fontSize: "0.72rem",
              fontWeight: 600,
              border: "none",
              borderRadius: "var(--radius-xs)",
              background: activeTab === "create" ? "rgba(255, 255, 255, 0.15)" : "transparent",
              color: activeTab === "create" ? "#ffffff" : "var(--text-muted)",
              cursor: "pointer"
            }}
          >
            + Save Mix
          </button>
        </div>
      </div>

      {activeTab === "library" ? (
        <div className="preset-list-stack">
          <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", marginTop: "0.2rem" }}>
            Curated Combos
          </div>
          {BUILT_IN_PRESETS.map((preset) => (
            <div key={preset.id} className="preset-list-row">
              <button
                type="button"
                className="preset-select-btn"
                onClick={() => handleLoad(preset)}
                title={`Load "${preset.name}"`}
              >
                <span>{preset.name}</span>
                <span>{preset.description}</span>
              </button>
            </div>
          ))}

          {customPresets.length > 0 && (
            <>
              <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", marginTop: "0.5rem" }}>
                My Custom Combos ({customPresets.length})
              </div>
              {customPresets.map((preset) => (
                <div key={preset.id} className="preset-list-row">
                  <button
                    type="button"
                    className="preset-select-btn"
                    onClick={() => handleLoad(preset)}
                    title={`Load "${preset.name}"`}
                  >
                    <span>{preset.name}</span>
                    <span>{preset.description}</span>
                  </button>
                  <button
                    type="button"
                    className="preset-delete-icon-btn"
                    onClick={() => deleteCustomPreset(preset.id)}
                    aria-label={`Delete ${preset.name}`}
                    title="Delete combo"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      ) : (
        /* Create & Save Custom Combo Section */
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--surface-border)",
            borderRadius: "var(--radius-sm)",
            padding: "0.75rem",
            fontSize: "0.78rem"
          }}>
            <div style={{ fontWeight: 700, color: "var(--text-main)", marginBottom: "0.25rem" }}>
              Active Layers in Combo:
            </div>
            {activeLayers.length === 0 ? (
              <p style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>
                No active layers. Enable some sound cards below to build your combo!
              </p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.4rem" }}>
                {activeLayers.map((l) => {
                  const s = manifestData.find((m) => m.id === l.soundId);
                  return (
                    <span
                      key={l.soundId}
                      style={{
                        background: "rgba(94, 234, 212, 0.12)",
                        border: "1px solid rgba(94, 234, 212, 0.3)",
                        color: "var(--accent-cyan)",
                        borderRadius: "var(--radius-full)",
                        padding: "0.15rem 0.5rem",
                        fontSize: "0.7rem",
                        fontWeight: 600
                      }}
                    >
                      {s?.icon} {s?.title || l.soundId} ({Math.round(l.baseVolume * 100)}%)
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label htmlFor="custom-combo-name" style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>
              Combo Name
            </label>
            <input
              id="custom-combo-name"
              type="text"
              className="preset-creator-input"
              placeholder="e.g., Midnight Thunder Study"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={35}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label htmlFor="custom-combo-desc" style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>
              Description (Optional)
            </label>
            <input
              id="custom-combo-desc"
              type="text"
              className="preset-creator-input"
              placeholder="e.g., Rain + Cafe + Singing bowl for deep focus"
              value={comboDescription}
              onChange={(e) => setComboDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={60}
            />
          </div>

          <button
            type="button"
            className="btn-primary-action"
            onClick={handleSaveCurrentCombo}
            disabled={!presetName.trim() || activeLayers.length === 0}
            style={{
              width: "100%",
              justifyContent: "center",
              opacity: (!presetName.trim() || activeLayers.length === 0) ? 0.4 : 1,
              cursor: (!presetName.trim() || activeLayers.length === 0) ? "not-allowed" : "pointer",
              padding: "0.6rem"
            }}
          >
            💾 Save &amp; Store My Combo
          </button>
        </div>
      )}
    </div>
  );
}
