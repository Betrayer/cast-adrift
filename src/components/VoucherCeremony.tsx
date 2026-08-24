import { Badge, Button, Group, Stack, Text, Title } from "@mantine/core";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AppModal } from "@/components/AppModal";
import { tokens } from "@/app/theme";
import { ACHIEVEMENT_BY_ID } from "@/data/achievements";
import {
  achievementTitle,
  pendingVoucherOffer,
  takeVoucherOffer,
} from "@/game/meta/achievements";
import { duckMusic, playSfx } from "@/services/audio";
import { haptic } from "@/services/tma";
import { useAppStore } from "@/stores/appStore";
import { useMetaStore, VOUCHER_CAP } from "@/stores/metaStore";

export const VoucherCeremony = () => {
  const { t } = useTranslation(["meta"]);
  const offers = useMetaStore((s) => s.voucherOffers);
  const banked = useMetaStore((s) => s.vouchers.perkDraft);
  const screen = useAppStore((s) => s.screen);
  const offer = offers.length === 0 ? null : pendingVoucherOffer();
  const pending = screen === "battle" ? null : offer;

  useEffect(() => {
    if (pending === null) return;
    playSfx("unlockCard");
    duckMusic(2000);
    haptic("achievement");
  }, [pending]);

  if (pending === null) return null;
  const def = ACHIEVEMENT_BY_ID.get(pending.achievement);
  if (def === undefined) return null;
  const full = banked >= VOUCHER_CAP;

  const choose = (choice: "voucher" | "shards"): void => {
    playSfx(choice === "voucher" ? "unlockCard" : "buy");
    takeVoucherOffer(pending.achievement, choice);
  };

  return (
    <AppModal
      label={t("meta:voucher.title")}
      testId="voucher-ceremony"
      ceremony
      dismiss="none"
      onClose={() => {
        choose("shards");
      }}
    >
      <Stack gap="sm" data-voucher-offer={pending.achievement}>
        <Text size="xs" c={tokens.amber}>
          {t("meta:voucher.kicker")}
        </Text>
        <Title order={4} c={tokens.text}>
          {achievementTitle(def, t)}
        </Title>
        <Text size="sm" c={tokens.dim}>
          {t("meta:voucher.body")}
        </Text>
        <Group gap="xs">
          <Badge size="sm" variant="light" color="yellow">
            {t("meta:voucher.bank", { n: banked, max: VOUCHER_CAP })}
          </Badge>
        </Group>
        <Button
          fullWidth
          color="accent"
          disabled={full}
          data-testid="voucher-take"
          onClick={() => {
            choose("voucher");
          }}
        >
          {t("meta:voucher.take")}
        </Button>
        <Button
          fullWidth
          variant="default"
          data-testid="voucher-shards"
          onClick={() => {
            choose("shards");
          }}
        >
          {t("meta:voucher.shards", { n: pending.altShards })}
        </Button>
        {full ? (
          <Text size="xs" c={tokens.faint} ta="center">
            {t("meta:voucher.full", { max: VOUCHER_CAP })}
          </Text>
        ) : null}
      </Stack>
    </AppModal>
  );
};
