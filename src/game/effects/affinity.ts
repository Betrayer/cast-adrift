import { AFFINITY, affinitySchoolForSlot, slotInAffinity } from "@/data/slots";
import { BattleCtx, type ResolveScope } from "@/game/effects/context";
import type { EffectCtx } from "@/game/effects/ctx";
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
    case "valueBonus":
      scope.value += aff.values[mkIndex] ?? 0;
      return;
    case "chargeMult":
      scope.chargeMult *= aff.mult;
      return;
  }
};

export const buildAffinitySource = (): EffectSource => ({
  key: "affinity",
  run: (hook, ctx: EffectCtx, subject: RolledDie | null) => {
    if (hook !== "beforeResolveSlot") return;
    if (!(ctx instanceof BattleCtx) || ctx.scope === null || subject === null)
      return;
    applyAffinity(ctx.scope, subject.school);
  },
});
