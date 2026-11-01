import { Button, Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { riseStyle } from "@/app/motion";
import { tokens } from "@/app/theme";
import { cargoDef, cargoDescVars, cargoPayout } from "@/data/cargo";
import { sectorDef } from "@/data/sectors";
import { optionAxisRange, optionRequirements } from "@/game/events/engine";
import { clampAxis } from "@/game/run/axis";
import { AxisMeter } from "@/components/AxisMeter";
import type { EventOption, OptionRequirement } from "@/types/events";

const requirementLabel = (
  req: OptionRequirement,
  t: TFunction<["run", "battle"]>,
): string => {
  switch (req.req) {
    case "scrap":
      return t("run:event.reqScrap", { n: req.n });
    case "hull":
      return t("run:event.reqHull", { n: req.n });
    case "school":
      return t("run:event.reqSchool", {
        n: req.n,
        school: t(`battle:school.${req.school}`),
      });
    case "dieTier":
      return t("run:event.reqDieTier", { tier: req.tier });
    case "dieSchool":
      return t("run:event.reqDieSchool", {
        school: t(`battle:school.${req.school}`),
      });
    case "mk":
      return t("run:event.reqMk", {
        slot: t(`battle:slot.${req.slot}`),
        mk: req.mk,
      });
    case "flag":
      return t("run:event.reqFlag");
    case "axis":
      return req.min !== undefined
        ? t("run:event.reqAxisMin", { n: req.min })
        : t("run:event.reqAxisMax", { n: req.max ?? 0 });
    case "cargo":
      return t("run:event.reqCargo");
  }
};

const cargoTerms = (
  option: EventOption,
  sector: number,
  t: TFunction<["run", "battle", "content"]>,
): string | null => {
  const cargo = optionRequirements(option.requires).find(
    (req) => req.req === "cargo",
  );
  if (cargo?.req !== "cargo") return null;
  const def = cargoDef(cargo.id);
  if (def === undefined) return null;
  return t("run:event.cargoTerms", {
    drawback: t(def.desc, cargoDescVars(def)),
    n: cargoPayout(def, sectorDef(sector).scrapMult),
  });
};

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

const outcomeRatio = (option: EventOption): string | null => {
  const outcomes = option.outcomes ?? [];
  if (outcomes.length < 2) return null;
  const weights = outcomes.map((o) => Math.max(1, o.weight ?? 1));
  const divisor = weights.reduce((a, b) => gcd(a, b));
  return weights.map((w) => String(Math.round(w / divisor))).join(":");
};

const axisPreview = (axis: number, option: EventOption): number | null => {
  const range = optionAxisRange(option);
  if (range === null) return null;
  return clampAxis(axis + (Math.abs(range.min) >= Math.abs(range.max) ? range.min : range.max));
};

export const EventOptionCard = ({
  option,
  riseIndex,
  unmet,
  axis,
  sector,
  checkOddsPercent,
  onPick,
}: {
  option: EventOption;
  riseIndex: number;
  unmet: OptionRequirement | null;
  axis: number;
  sector: number;
  checkOddsPercent: number | null;
  onPick: (option: EventOption) => void;
}) => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const terms = cargoTerms(option, sector, t);
  const ratio = outcomeRatio(option);
  const preview = axisPreview(axis, option);
  return (
    <Stack
      gap={2}
      data-event-card={option.id}
      data-rise
      style={riseStyle(riseIndex)}
    >
      <Button
        fullWidth
        variant="default"
        h="auto"
        py={8}
        data-event-option={option.id}
        disabled={unmet !== null}
        styles={{ label: { whiteSpace: "normal", lineHeight: 1.3 } }}
        onClick={() => {
          onPick(option);
        }}
      >
        {t(option.label)}
      </Button>
      {unmet !== null ? (
        <Text size="xs" c={tokens.faint} ta="center">
          {requirementLabel(unmet, t)}
        </Text>
      ) : null}
      {terms === null ? null : (
        <Text
          size="xs"
          c={tokens.faint}
          ta="center"
          data-event-cargo={option.id}
        >
          {terms}
        </Text>
      )}
      {ratio === null ? null : (
        <Text size="xs" c={tokens.faint} ta="center">
          {t("run:event.outcomeOdds", {
            odds: ratio,
          })}
        </Text>
      )}
      {preview === null ? null : (
        <Group gap={6} justify="center">
          <AxisMeter axis={axis} preview={preview} compact />
        </Group>
      )}
      {checkOddsPercent === null ? null : (
        <Text size="xs" c={tokens.faint} ta="center">
          {t("run:event.checkHint", { n: checkOddsPercent })}
        </Text>
      )}
    </Stack>
  );
};
