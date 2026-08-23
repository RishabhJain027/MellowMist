// ─────────────────────────────────────────────────────────────────────────────
// ShareDialog.tsx — Copy-link share dialog (blueprint §5.6)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef } from "react";
import { useMixStore } from "@/state/store";
import { buildShareUrl } from "@/state/shareUrl";
import "./ShareDialog.css";

interface ShareDialogProps {
  onClose: () => void;
}

export function ShareDialog({ onClose }: ShareDialogProps) {
  const mix = useMixStore((s) => s.mix);
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const shareUrl = buildShareUrl(
    mix.layers,
    mix.masterVolume,
    mix.meanderEnabled,
    mix.timer.durationSec,
    mix.timer.enabled
  );

  // Focus close button on open
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard API fallback
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [shareUrl]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return (
    <div
      className="share-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Share this mix"
      onClick={handleOverlayClick}
    >
      <div className="share-dialog">
        <div className="share-dialog__header">
          <h2 className="share-dialog__title">
            <span aria-hidden="true">🔗</span> Share this mix
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="share-dialog__close"
            onClick={onClose}
            aria-label="Close share dialog"
          >
            ✕
          </button>
        </div>

        <p className="share-dialog__description">
          Copy this link to share your current mix. The URL encodes your active
          sounds and volumes — no audio files are stored in the link.
        </p>

        <div className="share-dialog__url-row">
          <input
            type="text"
            className="share-dialog__url-input"
            value={shareUrl}
            readOnly
            aria-label="Shareable URL"
            onFocus={(e) => e.target.select()}
          />
          <button
            type="button"
            className="share-dialog__copy-btn"
            onClick={handleCopy}
            aria-label="Copy link to clipboard"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <p className="share-dialog__copied" aria-live="polite" aria-atomic="true">
          {copied ? "✓ Link copied to clipboard" : ""}
        </p>
      </div>
    </div>
  );
}
