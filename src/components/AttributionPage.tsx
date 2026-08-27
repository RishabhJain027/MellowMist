// ─────────────────────────────────────────────────────────────────────────────
// AttributionPage.tsx — Developer Credits & Project Work Summary
// ─────────────────────────────────────────────────────────────────────────────

import manifestData from "@/assets/manifest.json";
import type { SoundDefinition } from "@/state/mixSchema";
import "./AttributionPage.css";

interface AttributionPageProps {
  onBack: () => void;
}

export function AttributionPage({ onBack }: AttributionPageProps) {
  const sounds = manifestData as SoundDefinition[];

  return (
    <main className="attribution-page" aria-label="Credits and Project Info">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
        <button
          type="button"
          className="attribution-page__back-btn"
          onClick={onBack}
          aria-label="Back to mixer"
        >
          ← Back to Mixer
        </button>
      </div>

      {/* Developer Profile Section */}
      <section style={{
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid var(--surface-border)",
        borderRadius: "var(--radius-md)",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{
            width: "3rem",
            height: "3rem",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #5eead4, #3b82f6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.4rem",
            color: "#08090d",
            fontWeight: "800"
          }}>
            RJ
          </div>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--text-main)" }}>
              Rishabh Jain
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Creator &amp; Full-Stack Audio Engineer for MellowMist
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
          <a
            href="https://www.linkedin.com/in/rish-abh27/"
            target="_blank"
            rel="noreferrer noopener"
            className="btn-nav"
            style={{ textDecoration: "none", color: "var(--text-main)" }}
          >
            <span>💼</span> LinkedIn Profile
          </a>

          <a
            href="https://github.com/RishabhJain027"
            target="_blank"
            rel="noreferrer noopener"
            className="btn-nav"
            style={{ textDecoration: "none", color: "var(--text-main)" }}
          >
            <span>🐙</span> GitHub Profile
          </a>

          <a
            href="https://github.com/RishabhJain027/MellowMist"
            target="_blank"
            rel="noreferrer noopener"
            className="btn-nav"
            style={{ textDecoration: "none", color: "var(--text-main)" }}
          >
            <span>⭐</span> MellowMist Repository
          </a>
        </div>
      </section>

      {/* Task & Accomplishments Overview */}
      <section style={{
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid var(--surface-border)",
        borderRadius: "var(--radius-md)",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem"
      }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-main)" }}>
          🚀 Project Accomplishments &amp; Features Built
        </h2>
        <ul style={{
          fontSize: "0.85rem",
          color: "var(--text-muted)",
          lineHeight: "1.8",
          paddingLeft: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem"
        }}>
          <li>
            <strong>Web Audio Engine:</strong> Engineered a low-latency audio pipeline with custom <code>AudioEngine</code>, zero-click gain ramping, and independent gain nodes for 17 looping sound layers.
          </li>
          <li>
            <strong>Meander Low-Frequency Drift:</strong> Created a bounded random-walk modulation algorithm (0.78–1.20) running directly on the Web Audio timeline.
          </li>
          <li>
            <strong>Interactive Video Atmosphere Themes:</strong> Integrated dynamic video themes (Morning, Afternoon, Evening, Night) with ambient radial lighting scrims.
          </li>
          <li>
            <strong>Sleep Timer &amp; Presets:</strong> Implemented an automated sleep countdown with smooth master fade-out, custom LocalStorage preset saving, and URL-safe base64 mix sharing.
          </li>
          <li>
            <strong>Dark Luxury Atmosphere UI:</strong> Built a glassmorphic interface with real-time waveform visualization, live counters, and high-contrast typography.
          </li>
          <li>
            <strong>Deployment &amp; Quality:</strong> Set up automated CI/CD deployment with GitHub Actions on GitHub Pages and 57/57 passing Vitest unit tests.
          </li>
        </ul>
      </section>

      {/* Audio Licenses Table */}
      <section style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-main)" }}>
          Audio Tracks Manifest ({sounds.length} Tracks)
        </h2>
        <table className="attribution-table" aria-label="Bundled audio assets">
          <thead>
            <tr>
              <th scope="col">Sound</th>
              <th scope="col">Category</th>
              <th scope="col">Default Vol</th>
              <th scope="col">Format</th>
            </tr>
          </thead>
          <tbody>
            {sounds.map((s) => (
              <tr key={s.id}>
                <td>{s.icon} {s.title}</td>
                <td style={{ textTransform: "capitalize" }}>{s.category}</td>
                <td>{Math.round(s.defaultVolume * 100)}%</td>
                <td>{s.format.toUpperCase()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div style={{ paddingTop: "0.5rem" }}>
        <button
          type="button"
          className="attribution-page__back-btn"
          onClick={onBack}
          aria-label="Back to mixer"
        >
          ← Back to Mixer
        </button>
      </div>
    </main>
  );
}
