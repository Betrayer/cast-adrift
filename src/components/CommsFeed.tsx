import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useAtLeast } from '@/app/breakpoints';
import { cx } from '@/app/cx';
import { feedAnchorFor, isRunScreen } from '@/app/routes';
import { achievementTitleById } from '@/game/meta/achievements';
import { logAuthError } from '@/game/run/journal';
import { playSfx } from '@/services/audio';
import { SUPPORT_EMAIL } from '@/services/support';
import { haptic } from '@/services/tma';
import { useAppStore } from '@/stores/appStore';
import {
  isChatterEntry,
  useNarrativeStore,
  type FeedMessage,
  type FeedSource,
} from '@/stores/narrativeStore';
import { useSettingsStore } from '@/stores/settingsStore';
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

const FeedRow = ({
  message,
  compressed,
}: {
  message: FeedMessage;
  compressed: boolean;
}) => {
  const { t } = useTranslation(['run', 'meta', 'battle', 'settings', 'content']);
  const dismissFeed = useNarrativeStore((s) => s.dismissFeed);
  const go = useAppStore((s) => s.go);

  useEffect(() => {
    const id = window.setTimeout(() => {
      dismissFeed(message.id);
    }, message.ttlMs);
    return () => {
      window.clearTimeout(id);
    };
  }, [message.id, message.ttlMs, dismissFeed]);

  const body =
    message.source === 'achievement'
      ? achievementTitleById(message.key, t)
      : t(message.key, { email: SUPPORT_EMAIL });

  const journalId = message.journalId;
  const linkable = message.interactive && journalId !== null;

  const open = (): void => {
    dismissFeed(message.id);
    if (journalId === null) return;
    go('journal', { entry: String(journalId) });
  };

  const classes = cx(
    styles.row,
    styles[SOURCE_CLASS[message.source]],
    message.tone === 'alert' && styles.alert,
    compressed && styles.compressed,
  );

  return (
    <div
      role="status"
      className={classes}
      data-toast={toastAttr(message)}
      data-feed-source={message.source}
      data-feed-id={message.id}
      data-feed-compressed={compressed ? 'yes' : 'no'}
      data-feed-linked={message.journalId === null ? 'no' : 'yes'}
    >
      {linkable ? (
        <button
          type="button"
          className={cx(styles.tag, styles.tagOpen)}
          data-feed-open
          title={t('run:feed.open')}
          onClick={open}
        >
          {t(TAG_KEY[message.source])}
        </button>
      ) : (
        <span className={styles.tag}>{t(TAG_KEY[message.source])}</span>
      )}
      <span className={styles.body}>{body}</span>
      {message.interactive ? (
        <button
          type="button"
          className={styles.close}
          data-feed-dismiss
          aria-label={t('run:feed.dismiss')}
          onClick={() => {
            dismissFeed(message.id);
          }}
        >
          ✕
        </button>
      ) : null}
    </div>
  );
};

const FeedChime = () => {
  const newest = useNarrativeStore((s) => s.feed[0] ?? null);
  const verbosity = useSettingsStore((s) => s.echoVerbosity);
  const played = useRef(0);

  useEffect(() => {
    if (newest === null || newest.id <= played.current) return;
    played.current = newest.id;
    const stacked = useNarrativeStore.getState().feed.length > 1;
    if (newest.source === 'consequence') playSfx('consequenceChime');
    else if (newest.source === 'achievement') {
      playSfx('achievement');
      haptic('achievement');
    } else if (newest.source === 'bark' && verbosity === 'normal') {
      playSfx('barkChime', { gain: stacked ? 0.45 : 1 });
    }
  }, [newest, verbosity]);

  return null;
};

const NarrativeTick = () => {
  const written = useNarrativeStore(
    (s) => s.journal.filter((entry) => !isChatterEntry(entry)).length,
  );
  const previous = useRef(written);

  useEffect(() => {
    if (written > previous.current) playSfx('journalStamp');
    previous.current = written;
  }, [written]);

  return null;
};

const ScopeWatch = () => {
  useEffect(
    () =>
      useAppStore.subscribe((state, previous) => {
        if (state.screen === previous.screen) return;
        if (isRunScreen(state.screen) || !isRunScreen(previous.screen)) return;
        useNarrativeStore.getState().dropRunFeed();
      }),
    [],
  );

  return null;
};

const AuthWatch = () => {
  const error = useAppStore((s) => s.authError);
  const screen = useAppStore((s) => s.screen);
  const raised = useRef<string | null>(null);

  useEffect(() => {
    if (error === null || screen === 'settings') return;
    if (raised.current === error) return;
    raised.current = error;
    logAuthError(error);
  }, [error, screen]);

  return null;
};

export const CommsFeed = () => {
  const feed = useNarrativeStore((s) => s.feed);
  const screen = useAppStore((s) => s.screen);
  const wideComposition = useAtLeast('lg');
  const routed = feedAnchorFor(screen);
  const anchor = wideComposition && routed === 'bottom' ? 'top' : routed;
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      className={cx(styles.host, anchor === 'bottom' && styles.anchorBottom)}
      data-toast-host
      data-comms-feed
      data-feed-anchor={anchor}
    >
      <NarrativeTick />
      <FeedChime />
      <AuthWatch />
      <ScopeWatch />
      {anchor === 'none' ? null : (
        <div className={styles.lane} data-feed-lane>
          {feed.map((message, index) => (
            <FeedRow
              key={message.id}
              message={message}
              compressed={index > 0}
            />
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
};
