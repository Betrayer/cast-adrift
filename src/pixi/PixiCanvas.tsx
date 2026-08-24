import { Application } from 'pixi.js';
import { useEffect, useRef } from 'react';
import { hexToNumber } from '@/app/color';
import { onThemeChange, tokens } from '@/app/theme';
import { registerPerfApp } from '@/pixi/perf';

export type PixiMount = (app: Application) => (() => void) | undefined;

export interface PixiCanvasProps {
  mount: PixiMount;
  transparent?: boolean;
}

export const PixiCanvas = ({ mount, transparent = false }: PixiCanvasProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    const app = new Application();
    let disposed = false;
    let initialized = false;
    let cleanup: (() => void) | undefined;
    let unsubscribeTheme: (() => void) | undefined;
    let unregisterPerf: (() => void) | undefined;

    const onVisibility = () => {
      if (!initialized) return;
      if (document.hidden) {
        app.ticker.stop();
      } else {
        app.ticker.start();
      }
    };

    void app
      .init({
        resizeTo: container,
        background: tokens.bg,
        backgroundAlpha: transparent ? 0 : 1,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio, 2),
        autoDensity: true,
      })
      .then(() => {
        if (disposed) {
          app.destroy({ removeView: true, releaseGlobalResources: false }, { children: true });
          return;
        }
        initialized = true;
        container.appendChild(app.canvas);
        unregisterPerf = registerPerfApp(app);
        unsubscribeTheme = onThemeChange((def) => {
          if (transparent) return;
          app.renderer.background.color = hexToNumber(def.palette.bg);
        });
        cleanup = mount(app);
        document.addEventListener('visibilitychange', onVisibility);
        onVisibility();
      })
      .catch((error: unknown) => {
        console.error('PixiCanvas: init failed', error);
      });

    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      unsubscribeTheme?.();
      unregisterPerf?.();
      if (initialized) {
        cleanup?.();
        app.destroy({ removeView: true, releaseGlobalResources: false }, { children: true });
      }
    };
  }, [mount, transparent]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: transparent ? 'none' : undefined,
      }}
    />
  );
};
