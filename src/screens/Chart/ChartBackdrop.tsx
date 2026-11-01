import { useEffect, useMemo, useRef } from 'react';
import type { BackdropMode } from '@/app/deviceTier';
import type { Box, ChartLayout } from '@/game/chart/layouts';
import type { ChartGlow } from '@/game/chart/layouts/glow';
import {
  buildField,
  fieldSize,
  paintField,
  type BackdropField,
  type BackdropPalette,
} from './backdropPainters';
import { clearBackdrop, countBackdropFrame, noteBackdrop } from './backdropStats';
import { letterbox, type ChartView } from './chartView';
import styles from './ChartScreen.module.css';

interface Props {
  layout: ChartLayout;
  bounds: Box;
  view: ChartView;
  glow: ChartGlow;
  palette: BackdropPalette;
  mode: BackdropMode;
}

interface Scene {
  field: BackdropField;
  bounds: Box;
  view: ChartView;
  glow: ChartGlow;
  palette: BackdropPalette;
}

const MAX_DPR = 2;

const paint = (canvas: HTMLCanvasElement, scene: Scene, frame: number): void => {
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w <= 0 || h <= 0) return;
  const pixelW = Math.max(1, Math.round(w * dpr));
  const pixelH = Math.max(1, Math.round(h * dpr));
  if (canvas.width !== pixelW) canvas.width = pixelW;
  if (canvas.height !== pixelH) canvas.height = pixelH;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, pixelW, pixelH);
  const { bounds, view } = scene;
  if (bounds.w <= 0 || bounds.h <= 0) return;
  const { fit, offsetX, offsetY } = letterbox(bounds, { x: 0, y: 0, w, h });
  const k = fit * view.scale;
  ctx.setTransform(
    dpr * k,
    0,
    0,
    dpr * k,
    dpr * (offsetX + (view.tx - bounds.x) * fit),
    dpr * (offsetY + (view.ty - bounds.y) * fit),
  );
  paintField(ctx, scene.field, scene.glow, scene.palette, frame);
};

export const ChartBackdrop = ({ layout, bounds, view, glow, palette, mode }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const field = useMemo(() => buildField(layout), [layout]);
  const sceneRef = useRef<Scene | null>(null);

  useEffect(() => {
    sceneRef.current = { field, bounds, view, glow, palette };
    const canvas = canvasRef.current;
    if (mode === 'still' && canvas !== null && sceneRef.current !== null) {
      paint(canvas, sceneRef.current, 0);
    }
  }, [field, bounds, view, glow, palette, mode]);

  useEffect(() => {
    noteBackdrop(layout.id, mode, fieldSize(field));
  }, [layout.id, mode, field]);

  useEffect(() => clearBackdrop, []);

  useEffect(() => {
    if (mode !== 'live') return;
    let handle = 0;
    let frame = 0;
    const tick = (): void => {
      frame += 1;
      countBackdropFrame();
      const canvas = canvasRef.current;
      const scene = sceneRef.current;
      if (canvas !== null && scene !== null) paint(canvas, scene, frame);
      handle = window.requestAnimationFrame(tick);
    };
    handle = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(handle);
    };
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || mode !== 'still') return;
    const observer = new ResizeObserver(() => {
      if (sceneRef.current !== null) paint(canvas, sceneRef.current, 0);
    });
    observer.observe(canvas);
    return () => {
      observer.disconnect();
    };
  }, [mode]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.backdrop}
      data-chart-backdrop={layout.id}
      data-chart-backdrop-mode={mode}
      aria-hidden
    />
  );
};
