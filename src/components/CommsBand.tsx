import { memo, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { commsMetricsOf, fitCommsBand, type CommsFit } from '@/app/commsBand';
import { cx } from '@/app/cx';
import { FeedRow } from '@/components/FeedRow';
import { useNarrativeStore } from '@/stores/narrativeStore';
import styles from './CommsBand.module.css';

export type CommsPlacement = 'board' | 'gutter';

const START_FIT: CommsFit = { rows: 1, lines: 1 };

export const CommsBand = memo(({ placement }: { placement: CommsPlacement }) => {
  const { t } = useTranslation(['run']);
  const root = useRef<HTMLElement | null>(null);
  const feed = useNarrativeStore((s) => s.feed);
  const [fit, setFit] = useState<CommsFit>(START_FIT);

  useLayoutEffect(() => {
    const node = root.current;
    if (node === null) return;
    const measure = (): void => {
      const next = fitCommsBand(node.getBoundingClientRect().height, commsMetricsOf(getComputedStyle(node)));
      setFit((prev) => (prev.rows === next.rows && prev.lines === next.lines ? prev : next));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);

  const shown = feed.slice(0, fit.rows);
  const waiting = feed.length - shown.length;

  return (
    <section
      ref={root}
      className={cx(styles.band, placement === 'gutter' ? styles.gutter : styles.board)}
      data-band="comms"
      data-comms-placement={placement}
      data-comms-rows={fit.rows}
      data-comms-lines={fit.lines}
    >
      <div className={styles.lane} data-feed-lane data-feed-band data-toast-host>
        {shown.length === 0 ? (
          <span className={styles.idle} data-feed-idle>
            {t('run:feed.idle')}
          </span>
        ) : (
          shown.map((message, index) => (
            <FeedRow
              key={message.id}
              riseIndex={index}
              message={message}
              placement="band"
              lines={index === 0 ? fit.lines : 1}
              waiting={index === shown.length - 1 ? waiting : 0}
            />
          ))
        )}
      </div>
    </section>
  );
});
