import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { feedAnchorFor, isRunScreen } from '@/app/routes';
import { FeedRow } from '@/components/FeedRow';
import { logAuthError } from '@/game/run/journal';
import { playSfx } from '@/services/audio';
import { haptic } from '@/services/tma';
import { useAppStore } from '@/stores/appStore';
import { isChatterEntry, useNarrativeStore } from '@/stores/narrativeStore';
import { useSettingsStore } from '@/stores/settingsStore';
import styles from './CommsFeed.module.css';

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

const Lane = () => {
  const feed = useNarrativeStore((s) => s.feed);
  return (
    <div className={styles.lane} data-feed-lane>
      {feed.map((message, index) => (
        <FeedRow
          key={message.id}
          riseIndex={index}
          message={message}
          placement="lane"
          compressed={index > 0}
        />
      ))}
    </div>
  );
};

export const CommsFeed = () => {
  const screen = useAppStore((s) => s.screen);
  const anchor = feedAnchorFor(screen);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className={styles.host} data-toast-host data-comms-feed data-feed-anchor={anchor}>
      <NarrativeTick />
      <FeedChime />
      <AuthWatch />
      <ScopeWatch />
      {anchor === 'top' ? <Lane /> : null}
    </div>,
    document.body,
  );
};
