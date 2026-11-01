import { Button, Paper, Stack, Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import { capturedTarget, draggedDie, subscribeDrag } from '@/pixi/battle/dragState';

const RING = 12;

const POINTER_EVENTS = [
  'pointerdown',
  'pointermove',
  'pointerup',
  'pointercancel',
] as const;

interface PointerRow {
  type: string;
  pointerType: string;
  pointerId: number;
  buttons: number;
  x: number;
  y: number;
  prevented: boolean;
  cancelable: boolean;
}

const round = (value: number): number => Math.round(value * 10) / 10;

const slotRects = (): string[] => {
  const rows: string[] = [];
  for (const el of document.querySelectorAll<HTMLElement>('[data-slot]')) {
    const rect = el.getBoundingClientRect();
    rows.push(
      `${el.dataset.slot ?? '?'} ${String(round(rect.x))},${String(round(rect.y))} ${String(round(rect.width))}x${String(round(rect.height))}`,
    );
  }
  return rows;
};

const canvasRect = (): string => {
  const canvas = document.querySelector('canvas');
  if (canvas === null) return 'canvas absent';
  const rect = canvas.getBoundingClientRect();
  return `${String(round(rect.left))},${String(round(rect.top))} ${String(round(rect.width))}x${String(round(rect.height))}`;
};

const viewportLine = (): string => {
  const viewport = window.visualViewport;
  if (viewport === null) return 'visualViewport absent';
  return `scale ${String(round(viewport.scale))} offset ${String(round(viewport.offsetLeft))},${String(round(viewport.offsetTop))} size ${String(round(viewport.width))}x${String(round(viewport.height))}`;
};

const chainUnder = (x: number, y: number): string[] =>
  document
    .elementsFromPoint(x, y)
    .slice(0, 4)
    .map((el) => {
      const style = window.getComputedStyle(el);
      const name = `${el.tagName}.${el.className.toString().split(' ')[0] ?? ''}`;
      return `${name} touch-action=${style.touchAction} pointer-events=${style.pointerEvents}`;
    });

const rowLine = (row: PointerRow): string =>
  `${row.type} ${row.pointerType} id=${String(row.pointerId)} buttons=${String(row.buttons)} at ${String(row.x)},${String(row.y)} cancelable=${String(row.cancelable)} prevented=${String(row.prevented)}`;

export const DragDiagnostics = () => {
  const [rows, setRows] = useState<PointerRow[]>([]);
  const [cancelSeen, setCancelSeen] = useState(false);
  const [drag, setDrag] = useState({ uid: draggedDie(), captured: capturedTarget() });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const record = (event: Event): void => {
      if (!(event instanceof PointerEvent)) return;
      if (event.type === 'pointercancel') setCancelSeen(true);
      setRows((current) => [
        ...current.slice(-(RING - 1)),
        {
          type: event.type,
          pointerType: event.pointerType,
          pointerId: event.pointerId,
          buttons: event.buttons,
          x: round(event.clientX),
          y: round(event.clientY),
          prevented: event.defaultPrevented,
          cancelable: event.cancelable,
        },
      ]);
    };
    for (const type of POINTER_EVENTS) {
      document.addEventListener(type, record, true);
    }
    const stop = subscribeDrag(() => {
      setDrag({ uid: draggedDie(), captured: capturedTarget() });
    });
    return () => {
      for (const type of POINTER_EVENTS) {
        document.removeEventListener(type, record, true);
      }
      stop();
    };
  }, []);

  const last = rows[rows.length - 1];

  const log = (): string =>
    [
      `ua ${navigator.userAgent}`,
      `dpr ${String(window.devicePixelRatio)} · maxTouchPoints ${String(navigator.maxTouchPoints)}`,
      `window ${String(window.innerWidth)}x${String(window.innerHeight)}`,
      viewportLine(),
      `canvas ${canvasRect()}`,
      `dragged ${drag.uid ?? 'null'} · captured ${drag.captured ?? 'null'}`,
      `pointercancel seen: ${cancelSeen ? 'yes' : 'no'}`,
      ...(last === undefined
        ? []
        : ['chain under last point:', ...chainUnder(last.x, last.y)]),
      'slots:',
      ...slotRects(),
      'events:',
      ...rows.map(rowLine),
    ].join('\n');

  const copy = (): void => {
    void navigator.clipboard.writeText(log()).then(
      () => {
        setCopied(true);
      },
      () => {
        setCopied(false);
      },
    );
  };

  const clear = (): void => {
    setRows([]);
    setCancelSeen(false);
    setCopied(false);
  };

  return (
    <Paper
      p="xs"
      radius="sm"
      withBorder
      data-testid="drag-diagnostics"
      style={{
        position: 'absolute',
        right: 8,
        bottom: 8,
        width: 320,
        maxHeight: '60vh',
        overflowY: 'auto',
        pointerEvents: 'auto',
        zIndex: 'var(--z-modal)',
        opacity: 0.94,
      }}
    >
      <Stack gap={4}>
        <Text size="xs" fw={700}>
          drag
        </Text>
        <Text size="xs" ff="monospace" data-testid="drag-diagnostics-state">
          {`dragged ${drag.uid ?? 'null'} · captured ${drag.captured ?? 'null'}`}
        </Text>
        <Text size="xs" ff="monospace">
          {`cancel ${cancelSeen ? 'yes' : 'no'} · dpr ${String(window.devicePixelRatio)} · touch ${String(navigator.maxTouchPoints)}`}
        </Text>
        <Text size="xs" ff="monospace">
          {viewportLine()}
        </Text>
        <Text size="xs" ff="monospace">
          {`canvas ${canvasRect()}`}
        </Text>
        {rows.map((row, index) => (
          <Text key={`${row.type}-${String(index)}`} size="xs" ff="monospace">
            {`${row.type} ${row.pointerType} id=${String(row.pointerId)} b=${String(row.buttons)} ${String(row.x)},${String(row.y)} p=${row.prevented ? '1' : '0'}`}
          </Text>
        ))}
        <Button size="compact-xs" variant="default" onClick={copy}>
          {copied ? 'copied' : 'Copy log'}
        </Button>
        <Button size="compact-xs" variant="default" onClick={clear}>
          clear
        </Button>
      </Stack>
    </Paper>
  );
};
