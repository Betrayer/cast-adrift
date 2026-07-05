import { Application } from 'pixi.js';
import { useEffect, useRef } from 'react';
import { tokens } from '@/app/theme';

export type PixiMount = (app: Application) => (() => void) | undefined;

export const PixiCanvas = ({ mount }: { mount: PixiMount }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    const app = new Application();
    let disposed = false;
    let initialized = false;
    let cleanup: (() => void) | undefined;

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
      if (initialized) {
        cleanup?.();
        app.destroy({ removeView: true, releaseGlobalResources: false }, { children: true });
      }
    };
  }, [mount]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
    />
  );
};
