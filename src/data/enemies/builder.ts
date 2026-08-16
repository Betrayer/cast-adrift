import type {
  BossDef,
  EnemyDef,
  SubsystemAura,
  SubsystemDef,
} from "@/types/content";

type EnemyInput = Omit<EnemyDef, "name" | "signature">;

export const enemy = (def: EnemyInput): EnemyDef => ({
  ...def,
  name: `content:enemies.${def.id}`,
  signature: `content:signature.${def.id}`,
});

type BossInput = Omit<BossDef, "name" | "signature">;

export const bossDef = (def: BossInput): BossDef => ({
  ...def,
  name: `content:enemies.${def.id}`,
  signature: `content:signature.${def.id}`,
});

export const sub = (
  ownerId: string,
  id: string,
  hp: number,
  aura: SubsystemAura,
): SubsystemDef => ({
  id,
  name: `content:enemies.${ownerId}-${id}`,
  hp,
  aura,
});
