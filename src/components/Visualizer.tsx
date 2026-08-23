// ─────────────────────────────────────────────────────────────────────────────
// Visualizer.tsx — AnalyserNode canvas waveform (blueprint §5.7)
// Decorative only — does not imply wellness/medical outcomes
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import type { AudioEngine } from "@/audio/AudioEngine";
import "./Visualizer.css";

interface VisualizerProps {
  engine: AudioEngine | null;
  isPlaying: boolean;
  width?: number;
  height?: number;
}

export function Visualizer({
  engine,
  isPlaying,
  width = 300,
  height = 40,
}: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !engine || !isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const data = engine.getTimeDomainData();
      const W = canvas.width;
      const H = canvas.height;

      ctx.clearRect(0, 0, W, H);
      ctx.beginPath();
      ctx.strokeStyle = "rgba(110, 231, 247, 0.55)";
      ctx.lineWidth = 1.5;

      const sliceWidth = W / data.length;
      let x = 0;
      for (let i = 0; i < data.length; i++) {
        const v = data[i] / 128.0;
        const y = (v * H) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(W, H / 2);
      ctx.stroke();

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [engine, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      className="visualizer"
      width={width}
      height={height}
      aria-hidden="true"
      aria-label="Audio waveform visualizer (decorative)"
      role="img"
    />
  );
}
