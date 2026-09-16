import type {
  BossDef,
  EnemyDef,
  PartDeathEffect,
  PatternStep,
  PhaseScript,
  SubsystemAura,
  SubsystemDef,
} from "@/types/content";

export const PART_HP = 8;

export const partCycle = (signature: PatternStep): PatternStep[] => [
  { t: "idle" },
  signature,
  { t: "idle" },
];

type EnemyInput = Omit<EnemyDef, "name" | "signature">;

export const enemy = (def: EnemyInput): EnemyDef => ({
  ...def,
  name: `content:enemies.${def.id}`,
  signature: `content:signature.${def.id}`,
});

type PhasedInput = Omit<EnemyDef, "name" | "signature" | "pattern"> & {
  phases: [PhaseScript, ...PhaseScript[]];
};

export const phasedEnemy = (def: PhasedInput): EnemyDef =>
  enemy({ ...def, pattern: def.phases[0].pattern });

type BossInput = Omit<BossDef, "name" | "signature" | "boss" | "pattern"> & {
  phases: [PhaseScript, ...PhaseScript[]];
  pattern?: PatternStep[];
};

export const bossDef = (def: BossInput): BossDef => ({
  ...def,
  boss: true,
  pattern: def.pattern ?? def.phases[0].pattern,
  name: `content:enemies.${def.id}`,
  signature: `content:signature.${def.id}`,
});

interface PartBehaviour {
  intents?: PatternStep[];
  onDeath?: PartDeathEffect;
}

export const sub = (
  ownerId: string,
  id: string,
  hp: number,
  aura?: SubsystemAura,
  behaviour: PartBehaviour = {},
): SubsystemDef => ({
  id,
  name: `content:enemies.${ownerId}-${id}`,
  hp,
  ...(aura === undefined ? {} : { aura }),
  ...(behaviour.intents === undefined ? {} : { intents: behaviour.intents }),
  ...(behaviour.onDeath === undefined ? {} : { onDeath: behaviour.onDeath }),
});
