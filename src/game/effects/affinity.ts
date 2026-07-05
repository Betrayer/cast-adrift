import {
  AFFINITY,
  affinitySchoolForSlot,
  slotInAffinity,
} from "@/data/slots";
import type { BattleCtx, ResolveScope } from "@/game/effects/context";
import type { EffectSource } from "@/game/effects/pipeline";
import type { RolledDie } from "@/types/battle";
import type { School } from "@/types/content";

const applyAffinity = (scope: ResolveScope, school: School): void => {
  const effectiveSchool =
    school === "prismatic" ? affinitySchoolForSlot(scope.slotId) : school;
  if (effectiveSchool === undefined) return;
  const aff = AFFINITY[effectiveSchool];
  if (aff === undefined) return;
  if (!slotInAffinity(scope.slotId, aff.slot)) return;
  const mkIndex = scope.slot.mk - 1;
  switch (aff.kind) {
    case "weaponBonus":
    case "shieldBonus":
      scope.value += aff.values[mkIndex] ?? 0;
      return;
    case "thresholdBonus":
      scope.thresholdBonus += aff.values[mkIndex] ?? 0;
      return;
    case "chargeMult":
      scope.chargeMult *= aff.mult;
      return;
  }
};

export const buildAffinitySource = (): EffectSource => ({
  key: "affinity",
  run: (hook, ctx: BattleCtx, subject: RolledDie | null) => {
    if (hook !== "beforeResolveSlot") return;
    if (ctx.scope === null || subject === null) return;
    applyAffinity(ctx.scope, subject.school);
  },
});
