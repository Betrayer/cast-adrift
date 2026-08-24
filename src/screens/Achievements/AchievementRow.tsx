import { Badge, Group, Progress, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { Sparkle, type SparkleBurst } from "@/components/Sparkle";
import { now } from "@/services/clock";
import { playSfx } from "@/services/audio";
import {
  tierNumeral,
  type AchievementDef,
  type AchievementRow as RowModel,
} from "@/data/achievements";
import { UNLOCK_BY_ID } from "@/data/unlocks";
import {
  achievementProgress,
  type AchievementCtx,
} from "@/game/meta/achievements";
import styles from "./AchievementRow.module.css";

const RewardChips = ({ def }: { def: AchievementDef }) => {
  const { t } = useTranslation(["meta"]);
  const reward = def.reward;
  if (reward === undefined) return null;
  const unlock =
    reward.unlockId === undefined ? undefined : UNLOCK_BY_ID.get(reward.unlockId);
  return (
    <div className={styles.chips}>
      {reward.shards === undefined ? null : (
        <Badge size="xs" variant="light" color="yellow">
          {t("meta:ach.shards", { n: reward.shards })}
        </Badge>
      )}
      {unlock === undefined ? null : (
        <Badge size="xs" variant="light" color="accent">
          {t(unlock.label)}
        </Badge>
      )}
      {reward.badge === undefined ? null : (
        <Badge size="xs" variant="light" color="gray">
          {t("meta:ach.badgeChip")}
        </Badge>
      )}
      {reward.voucher === undefined ? null : (
        <Badge size="xs" variant="filled" color="yellow">
          {t("meta:ach.voucherChip")}
        </Badge>
      )}
    </div>
  );
};

const Pips = ({
  tiers,
  earned,
}: {
  tiers: readonly AchievementDef[];
  earned: ReadonlySet<string>;
}) => (
  <div className={styles.pips} data-achievement-pips>
    {tiers.map((tier) => (
      <span
        key={tier.id}
        data-pip={tier.id}
        data-pip-state={earned.has(tier.id) ? "done" : "open"}
        className={[
          styles.pip,
          earned.has(tier.id) ? styles.pipDone : "",
          tier.legendary === true ? styles.pipLegendary : "",
        ]
          .filter((name) => name !== "")
          .join(" ")}
      />
    ))}
  </div>
);

const FamilyRow = ({
  tiers,
  ctx,
  earned,
}: {
  tiers: readonly AchievementDef[];
  ctx: AchievementCtx;
  earned: ReadonlySet<string>;
}) => {
  const { t } = useTranslation(["meta"]);
  const [burst, setBurst] = useState<SparkleBurst | null>(null);
  const head = tiers[0];
  if (head === undefined) return null;
  const next = tiers.find((tier) => !earned.has(tier.id));
  const target = next ?? tiers[tiers.length - 1];
  if (target === undefined) return null;
  const progress = achievementProgress(target, ctx);
  const complete = next === undefined;
  const done = tiers.filter((tier) => earned.has(tier.id)).length;
  const legendary = complete && tiers.some((tier) => tier.legendary === true);

  return (
    <div
      data-achievement={head.family ?? head.id}
      data-achievement-state={complete ? "unlocked" : "locked"}
      data-press={legendary ? "" : undefined}
      className={[
        styles.row,
        complete ? styles.rowEarned : "",
        legendary ? styles.rowLegendary : "",
      ]
        .filter((name) => name !== "")
        .join(" ")}
      onClick={(event) => {
        if (!legendary) return;
        const rect = event.currentTarget.getBoundingClientRect();
        playSfx("achievement", { gain: 0.5 });
        setBurst({
          key: now(),
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          color: tokens.amber,
        });
      }}
    >
      <Sparkle burst={burst} />
      <div className={styles.head}>
        <div className={styles.title}>
          <Text size="sm" fw={600} c={complete ? tokens.amber : tokens.text}>
            {t(head.name)}
          </Text>
          {done === 0 ? null : (
            <Text size="xs" c={tokens.faint} data-achievement-rank>
              {tierNumeral(done)}
            </Text>
          )}
        </div>
        <Pips tiers={tiers} earned={earned} />
      </div>
      <Text size="xs" c={tokens.faint}>
        {t(target.desc, { n: target.need ?? 0 })}
      </Text>
      {complete ? (
        <Text size="xs" c={tokens.amber} data-achievement-complete>
          {t("meta:ach.maxed")}
        </Text>
      ) : (
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Progress
            value={progress.need === 0 ? 0 : (progress.have / progress.need) * 100}
            color="accent"
            size="xs"
            style={{ flex: 1 }}
            aria-label={t(head.name)}
          />
          <Text size="xs" c={tokens.faint}>
            {t("meta:profile.achProgress", {
              have: progress.have,
              need: progress.need,
            })}
          </Text>
        </Group>
      )}
      <RewardChips def={target} />
    </div>
  );
};

const SingleRow = ({
  def,
  ctx,
  earned,
}: {
  def: AchievementDef;
  ctx: AchievementCtx;
  earned: ReadonlySet<string>;
}) => {
  const { t } = useTranslation(["meta"]);
  const unlocked = earned.has(def.id);
  const progress = achievementProgress(def, ctx);
  return (
    <div
      data-achievement={def.id}
      data-achievement-state={unlocked ? "unlocked" : "locked"}
      className={[styles.row, unlocked ? styles.rowEarned : ""]
        .filter((name) => name !== "")
        .join(" ")}
    >
      <div className={styles.head}>
        <Text size="sm" fw={600} c={unlocked ? tokens.amber : tokens.text}>
          {t(def.name)}
        </Text>
        {unlocked ? (
          <span className={styles.mark}>✦</span>
        ) : (
          <Text size="xs" c={tokens.faint}>
            {t("meta:profile.achProgress", {
              have: progress.have,
              need: progress.need,
            })}
          </Text>
        )}
      </div>
      <Text size="xs" c={tokens.faint}>
        {t(def.desc, { n: def.need ?? 0 })}
      </Text>
      {unlocked || progress.need <= 1 ? null : (
        <Progress
          value={(progress.have / progress.need) * 100}
          color="accent"
          size="xs"
          aria-label={t(def.name)}
        />
      )}
      <RewardChips def={def} />
    </div>
  );
};

export const AchievementRow = ({
  row,
  ctx,
  earned,
}: {
  row: RowModel;
  ctx: AchievementCtx;
  earned: ReadonlySet<string>;
}) => (
  <Stack gap={0}>
    {row.kind === "family" ? (
      <FamilyRow tiers={row.tiers} ctx={ctx} earned={earned} />
    ) : (
      <SingleRow def={row.def} ctx={ctx} earned={earned} />
    )}
  </Stack>
);
