import type { Intent } from '@/types/content';

const INTENT_SHORT: Partial<Record<Intent['t'], string>> = {
  healAllies: 'heal',
  mirrorHalf: 'mirror',
  stealScrap: 'steal',
  twistDie: 'twist',
  swapValues: 'swap',
  curseDie: 'curse',
  shieldGate: 'gate',
  drainCharge: 'drain',
  siphonShield: 'siphon',
};

export const newIntentSummary = (intent: Intent): string => {
  if (intent.t === 'multi')
    return `multi ${String(intent.n)}x${String(intent.k)}`;
  if (intent.t === 'summon') return `summon ${intent.id}`;
  if (intent.t === 'bargain')
    return `bargain ${String(intent.n)}/${String(intent.heal)}`;
  if (intent.t === 'echoTotal') return `echoTotal ${String(intent.cap)}`;
  const name = INTENT_SHORT[intent.t] ?? intent.t;
  return 'n' in intent ? `${name} ${String(intent.n)}` : name;
};

