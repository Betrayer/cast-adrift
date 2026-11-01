import { Button, Divider, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Screen } from "@/app/Screen";
import { AppHeader } from "@/components/AppHeader";
import { tokens } from "@/app/theme";
import { keeperLinesFor } from "@/data/narrative/keeperLines";
import { useBackGuard } from "@/app/backGuard";
import { completeNode } from "@/game/run/flow";
import { createStream, deriveSeed } from "@/services/rng";
import { useRunStore } from "@/stores/runStore";
import { BaysSection } from "./BaysSection";
import { ForgeSheet } from "./ForgeSheet";
import { RepairSection } from "./RepairSection";
import { SystemsSection } from "./SystemsSection";

export const ShipyardScreen = () => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const scrap = useRunStore((s) => s.scrap);
  const hull = useRunStore((s) => s.hull);
  const hullMax = useRunStore((s) => s.hullMax);
  const vouchers = useRunStore((s) => s.vouchers);
  const seed = useRunStore((s) => s.seed);
  const position = useRunStore((s) => s.position);
  const flags = useRunStore((s) => s.flags);
  const [forgeOpen, setForgeOpen] = useState(false);

  const greeting = createStream(
    deriveSeed(seed, `keeper:${position ?? "yard"}`),
  ).pick(keeperLinesFor("shipyard", flags));

  const leave = (): void => {
    completeNode({ outcome: "cleared" });
  };

  const closeForge = (): void => {
    setForgeOpen(false);
  };

  useBackGuard("shipyard", forgeOpen ? closeForge : leave);

  const header = (
    <AppHeader
      actions={
        <>
          <Text size="sm" c={tokens.amber}>
            {t("run:shipyard.scrap", { n: scrap })}
          </Text>
          <Text size="sm" c={tokens.dim}>
            {t("run:shipyard.hull", { cur: hull, max: hullMax })}
          </Text>
        </>
      }
    />
  );

  const footer = (
    <Button
      size="md"
      fullWidth
      data-testid="shipyard-leave"
      onClick={leave}
    >
      {t("run:shipyard.leave")}
    </Button>
  );

  return (
    <Screen width="wide" header={header} footer={footer}>
      <Stack gap="sm">
        <Text size="xs" c={tokens.dim} fs="italic">
          {t(greeting.text)}
        </Text>

        {vouchers > 0 ? (
          <Text size="xs" c={tokens.accent}>
            {t("run:shipyard.voucher", { n: vouchers })}
          </Text>
        ) : null}

        <SystemsSection />

        <BaysSection />

        <Divider color={tokens.line} label={t("run:shipyard.forgeTitle")} />
        <ForgeSheet open={forgeOpen} onOpenChange={setForgeOpen} />

        <RepairSection />
      </Stack>
    </Screen>
  );
};
