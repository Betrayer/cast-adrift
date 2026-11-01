import type { TFunction } from "i18next";
import { MODULE_BY_ID } from "@/data/modules";
import type { RelevanceReason, SlotSource } from "@/game/battle/slotRelevance";
import type { SlotAffinity } from "@/game/battle/view/affinity";
import { projectionText } from "@/screens/Battle/board/slotText";
import type { SlotId } from "@/types/battle";
import type {
  FitRoute,
  SlotFitGrant,
  SlotSheetCell,
  SlotSheetColumn,
  SlotSheetFact,
  SlotSheetMode,
} from "./slotSheet";

export type SheetT = TFunction<["run", "battle", "content"]>;

const schoolName = (t: SheetT, school: string): string => t(`run:tag.${school}`);

export const affinityText = (t: SheetT, affinity: SlotAffinity | null): string => {
  if (affinity === null) return t("run:bridge.sheet.affinityNone");
  const vars = { school: schoolName(t, affinity.school), n: affinity.amount };
  return affinity.kind === "chargeMult"
    ? t("run:bridge.sheet.affinityMult", vars)
    : t("run:bridge.sheet.affinity", vars);
};

const reasonText = (t: SheetT, reason: RelevanceReason): string =>
  reason.kind === "slotMk"
    ? t("run:bridge.sheet.reason.slotMk", { n: reason.n })
    : t(`run:bridge.sheet.reason.${reason.kind}`);

export const reasonsLine = (t: SheetT, reasons: readonly RelevanceReason[]): string =>
  [...new Set(reasons.map((reason) => reasonText(t, reason)))].join(" · ");

export const sourceName = (t: SheetT, source: Pick<SlotSource, "name" | "id">): string =>
  source.name === null ? source.id : t(source.name);

export const fitRouteText = (
  t: SheetT,
  route: FitRoute,
  overCapHull: number,
): string => {
  switch (route) {
    case "cap":
      return t("run:bridge.sheet.fitCap");
    case "overCap":
      return t("run:bridge.sheet.fitOverCap", { n: overCapHull });
    case "grant":
      return t("run:bridge.sheet.fitGrant");
    default:
      return t("run:bridge.sheet.fitNone");
  }
};

export const columnText = (
  t: SheetT,
  column: SlotSheetColumn,
  columnCount: number,
): string => {
  if (column.kind === "plain") {
    return columnCount > 1
      ? t("run:bridge.sheet.colPlain")
      : t("run:bridge.sheet.colValue");
  }
  const named =
    column.kind === "affinity"
      ? column.schools.filter((school) => school !== "prismatic")
      : column.schools;
  return t("run:bridge.sheet.colSchool", {
    school: named.map((school) => schoolName(t, school)).join(" / "),
  });
};

export const cellText = (t: SheetT, slotId: SlotId, cell: SlotSheetCell): string => {
  const text = projectionText(t, slotId, cell);
  return cell.evasion?.intercept === true
    ? `${text} · ${t("run:bridge.sheet.intercept")}`
    : text;
};

export const factText = (t: SheetT, fact: SlotSheetFact): string => t(fact.key, fact.vars);

export const modeSourceText = (t: SheetT, mode: SlotSheetMode): string => {
  if (mode.source === "base") return t("run:bridge.sheet.modeBase");
  if (mode.source === "mk") return t("run:bridge.sheet.modeMk", { mk: mode.mk ?? 1 });
  const name =
    mode.moduleId === null ? undefined : MODULE_BY_ID.get(mode.moduleId)?.name;
  const label = t("run:bridge.sheet.modeModule");
  return name === undefined ? label : `${label} · ${t(name)}`;
};

export const grantText = (
  t: SheetT,
  grant: SlotFitGrant,
  sources: readonly SlotSource[],
): string => {
  const source = sources.find(
    (entry) => entry.kind === grant.sourceKind && entry.id === grant.sourceId,
  );
  const parts = [
    t(`run:bridge.sheet.kind.${grant.sourceKind}`),
    source === undefined ? grant.sourceId : sourceName(t, source),
    ...(grant.school === undefined ? [] : [schoolName(t, grant.school)]),
    t("run:bridge.sheet.fitOverCap", { n: grant.hullCost }),
    ...(grant.conditional ? [t("run:bridge.sheet.grantConditional")] : []),
  ];
  return parts.join(" · ");
};
