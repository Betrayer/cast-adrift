import type { Intent } from '@/types/content';

export const oldIntentSummary = (intent: Intent): string => {
  switch (intent.t) {
    case 'idle':
      return 'idle';
    case 'attack':
      return `attack ${String(intent.n)}`;
    case 'shield':
      return `shield ${String(intent.n)}`;
    case 'shieldAll':
      return `shieldAll ${String(intent.n)}`;
    case 'multi':
      return `multi ${String(intent.n)}x${String(intent.k)}`;
    case 'charge':
      return 'charge';
    case 'jamSlot':
      return 'jamSlot';
    case 'lockDie':
      return 'lockDie';
    case 'summon':
      return `summon ${intent.id}`;
    case 'healAllies':
      return `heal ${String(intent.n)}`;
    case 'mirrorHalf':
      return 'mirror';
    case 'stealScrap':
      return `steal ${String(intent.n)}`;
    case 'capShrink':
      return 'capShrink';
    case 'twistDie':
      return 'twist';
    case 'swapValues':
      return 'swap';
    case 'storm':
      return 'storm';
    case 'curseDie':
      return `curse ${String(intent.n)}`;
    case 'shieldGate':
      return `gate ${String(intent.n)}`;
    case 'mirrorSchool':
      return 'mirrorSchool';
    case 'drainCharge':
      return `drain ${String(intent.n)}`;
    case 'siphonShield':
      return `siphon ${String(intent.n)}`;
    case 'bargain':
      return `bargain ${String(intent.n)}/${String(intent.heal)}`;
    case 'enrage':
      return `enrage ${String(intent.n)}`;
    case 'hijack':
      return 'hijack';
    case 'echoTotal':
      return `echoTotal ${String(intent.cap)}`;
    case 'foldOrder':
      return 'foldOrder';
    case 'devourDie':
      return 'devourDie';
  }
};

