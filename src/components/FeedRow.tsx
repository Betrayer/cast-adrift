import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cx } from '@/app/cx';
import { MOTION_MS, reducedNow, riseStyle } from '@/app/motion';
import { achievementTitleById } from '@/game/meta/achievements';
import { SUPPORT_EMAIL } from '@/services/support';
import { useAppStore } from '@/stores/appStore';
import { useNarrativeStore, type FeedMessage, type FeedSource } from '@/stores/narrativeStore';
import styles from './CommsFeed.module.css';

const TAG_KEY: Record<FeedSource, string> = {
  bark: 'run:feed.source.echo',
  consequence: 'run:feed.source.consequence',
  achievement: 'run:feed.source.achievement',
  system: 'run:feed.source.system',
};

const SOURCE_CLASS: Record<FeedSource, string> = {
  bark: 'bark',
  consequence: 'consequence',
  achievement: 'achievement',
  system: 'system',
};

const toastAttr = (message: FeedMessage): string => {
  if (message.source !== 'system') return message.source;
  return message.tone === 'alert' ? 'auth' : 'hint';
};

type FeedRowProps =
  | { message: FeedMessage; placement: 'lane'; compressed: boolean; riseIndex: number }
  | {
      message: FeedMessage;
      placement: 'band';
      lines: 1 | 2;
      waiting: number;
      riseIndex: number;
    };

const FEED_LEAVE_MS = MOTION_MS.s;

const feedHolds = (id: number): boolean =>
  useNarrativeStore.getState().feed.some((entry) => entry.id === id);

export const FeedRow = (props: FeedRowProps) => {
  const { message } = props;
  const { t } = useTranslation(['run', 'meta', 'battle', 'settings', 'content']);
  const dismissFeed = useNarrativeStore((s) => s.dismissFeed);
  const creditFeed = useNarrativeStore((s) => s.creditFeed);
  const go = useAppStore((s) => s.go);
  const [enterIndex] = useState(props.riseIndex);
  const [leaving, setLeaving] = useState(false);
  const departed = useRef(false);
  const leaveTimer = useRef(0);

  const leave = useCallback((): void => {
    if (departed.current) return;
    departed.current = true;
    if (reducedNow()) {
      dismissFeed(message.id);
      return;
    }
    setLeaving(true);
    leaveTimer.current = window.setTimeout(() => {
      dismissFeed(message.id);
    }, FEED_LEAVE_MS);
  }, [dismissFeed, message.id]);

  useEffect(() => {
    const shownMs =
      useNarrativeStore.getState().feed.find((entry) => entry.id === message.id)?.shownMs ?? 0;
    const started = performance.now();
    const id = window.setTimeout(leave, Math.max(0, message.ttlMs - shownMs));
    return () => {
      window.clearTimeout(id);
      if (!departed.current) {
        creditFeed(message.id, performance.now() - started);
        return;
      }
      window.clearTimeout(leaveTimer.current);
      if (feedHolds(message.id)) dismissFeed(message.id);
    };
  }, [message.id, message.ttlMs, leave, dismissFeed, creditFeed]);

  const body =
    message.source === 'achievement'
      ? achievementTitleById(message.key, t)
      : t(message.key, { email: SUPPORT_EMAIL });

  const journalId = message.journalId;
  const linkable = message.interactive && journalId !== null;
  const band = props.placement === 'band';
  const compressed = band ? props.lines === 1 : props.compressed;

  const open = (): void => {
    dismissFeed(message.id);
    if (journalId === null) return;
    go('journal', { entry: String(journalId) });
  };

  const classes = cx(
    styles.row,
    styles[SOURCE_CLASS[message.source]],
    message.tone === 'alert' && styles.alert,
    band ? styles.inBand : compressed && styles.compressed,
    band && props.lines === 2 && styles.lead2,
    leaving && styles.leaving,
  );

  return (
    <div
      role="status"
      className={classes}
      style={riseStyle(enterIndex)}
      data-feed-leaving={leaving ? '1' : undefined}
      data-toast={toastAttr(message)}
      data-feed-source={message.source}
      data-feed-id={message.id}
      data-feed-compressed={compressed ? 'yes' : 'no'}
      data-feed-linked={message.journalId === null ? 'no' : 'yes'}
      data-feed-placement={props.placement}
      data-feed-lines={band ? props.lines : undefined}
    >
      {linkable ? (
        <button
          type="button"
          className={cx(styles.tag, styles.tagOpen)}
          data-feed-open
          data-testid="comms-open"
          title={t('run:feed.open')}
          onClick={open}
        >
          {t(TAG_KEY[message.source])}
        </button>
      ) : (
        <span className={styles.tag}>{t(TAG_KEY[message.source])}</span>
      )}
      <span className={styles.body}>{body}</span>
      {band && props.waiting > 0 ? (
        <span
          className={styles.waiting}
          data-feed-waiting={props.waiting}
          aria-label={t('run:feed.waiting', { count: props.waiting })}
        >
          {t('run:feed.waitingMark', { count: props.waiting })}
        </span>
      ) : null}
      {message.interactive ? (
        <button
          type="button"
          className={styles.close}
          data-feed-dismiss
          data-testid="comms-dismiss"
          aria-label={t('run:feed.dismiss')}
          onClick={leave}
        >
          ✕
        </button>
      ) : null}
    </div>
  );
};
