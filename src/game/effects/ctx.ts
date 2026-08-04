import type { ContentTag } from "@/data/tags";
import type { StatusKey } from "@/game/battle/statuses";
import type {
  Action,
  CounterScope,
  EffectTarget,
  ExceedCapGrant,
  GrantKey,
  HookPayload,
  ScheduleWhen,
} from "@/game/effects/types";
import type { RngStream } from "@/services/rng";
import type {
  EnemyState,
  ResonanceThreshold,
  RolledDie,
  SlotId,
} from "@/types/battle";
import type { School } from "@/types/content";

export interface EffectCtx {
  payload: HookPayload;
  readonly logs: string[];
  log: (message: string) => void;
  currentSlot?: () => SlotId | undefined;
  subject?: () => RolledDie | null;
  findDie?: (uid: string) => RolledDie | undefined;
  turn?: () => number;
  hullPct?: () => number;
  resAtLeast?: (school: School, n: ResonanceThreshold) => boolean;
  hasFlag?: (key: string) => boolean;
  setFlag?: (key: string) => void;
  firstOfTurn?: () => boolean;
  chargeValue?: () => number;
  shieldValue?: () => number;
  tideValue?: () => number;
  counter?: (scope: CounterScope, key: string) => number;
  bumpCounter?: (scope: CounterScope, key: string, delta: number) => void;
  tagCount?: (tag: ContentTag) => number;
  targetEnemy?: () => EnemyState | undefined;
  aliveEnemyCount?: () => number;
  allDice?: () => readonly RolledDie[];
  rng?: () => RngStream;
  rerollDie?: (die: RolledDie) => void;
  setCrit?: () => void;
  grow?: (die: RolledDie, n: number, cap: number) => void;
  grant?: (what: GrantKey, n: number) => void;
  allowExceedCap?: (grant: ExceedCapGrant) => void;
  schedule?: (when: ScheduleWhen, turns: number, actions: readonly Action[]) => void;
  addTempDie?: (defId: string, turns?: number) => void;
  removeTempDice?: () => void;
  dmg?: (n: number, target?: EffectTarget) => void;
  shield?: (n: number) => void;
  heal?: (n: number) => void;
  charge?: (n: number) => void;
  hull?: (n: number) => void;
  scrap?: (n: number) => void;
  modDieValue?: (die: RolledDie, n: number) => void;
  setDieValue?: (die: RolledDie, n: number) => void;
  addStatus?: (s: StatusKey, n: number, target?: EffectTarget) => void;
  primeSchool?: (school: School, n?: number, max?: boolean) => void;
  requestRepeat?: () => void;
}
