// ─────────────────────────────────────────────────────────────────────────────
// AttributionPage.tsx — CC-BY asset attribution (blueprint §2, §6)
// ─────────────────────────────────────────────────────────────────────────────

import manifestData from "@/assets/manifest.json";
import type { SoundDefinition } from "@/state/mixSchema";
import "./AttributionPage.css";

interface AttributionPageProps {
  onBack: () => void;
}

export function AttributionPage({ onBack }: AttributionPageProps) {
  const sounds = manifestData as SoundDefinition[];
  const attributed = sounds.filter(
    (s) =>
      s.license === "CC-BY" ||
      s.license === "CC-BY-SA" ||
      s.redistribution === "allowed-with-attribution"
  );
  const all = sounds;

  return (
    <main className="attribution-page" aria-label="Audio asset attribution">
      <button
        type="button"
        className="attribution-page__back-btn"
        onClick={onBack}
        aria-label="Back to mixer"
      >
        ← Back to Mixer
      </button>

      <h1 className="attribution-page__title">Audio Asset Attribution</h1>

      <p className="attribution-page__intro">
        MellowMist is an original implementation inspired by the ambient-mixer category.
        It is <strong>not</strong> an official product of A Soft Murmur or any other
        ambient-mixer service. The following table lists every bundled audio asset with
        its creator, source, and license. Assets marked CC-BY require attribution below.
      </p>

      <table className="attribution-table" aria-label="All bundled audio assets">
        <thead>
          <tr>
            <th scope="col">Sound</th>
            <th scope="col">Creator</th>
            <th scope="col">License</th>
            <th scope="col">Source</th>
          </tr>
        </thead>
        <tbody>
          {all.map((s) => (
            <tr key={s.id}>
              <td>{s.title}</td>
              <td>{s.creator}</td>
              <td>
                <a href={s.licenseUrl} target="_blank" rel="noreferrer noopener">
                  {s.license}
                </a>
              </td>
              <td>
                <a href={s.sourceUrl} target="_blank" rel="noreferrer noopener">
                  Source
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {attributed.length > 0 && (
        <>
          <h2 style={{ fontSize: "1rem", color: "var(--text-primary)", marginTop: "0.5rem" }}>
            CC-BY Attribution
          </h2>
          <ul style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.7 }}>
            {attributed.map((s) => (
              <li key={s.id}>
                {s.attribution ?? `"${s.title}" by ${s.creator}`} —{" "}
                <a href={s.licenseUrl} target="_blank" rel="noreferrer noopener">
                  {s.license}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="attribution-page__disclaimer">
        <strong>Note:</strong> Stub placeholder audio files are included for development only.
        All stub files must be replaced with individually license-verified assets before
        production deployment. See <code>src/assets/manifest.json</code> and the README for
        the full asset production workflow.
      </p>
    </main>
  );
}
