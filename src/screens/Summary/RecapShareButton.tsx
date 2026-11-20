import { Button, Stack, Text } from "@mantine/core";
import { useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { DIE_BY_ID } from "@/data/dice";
import { schools } from "@/data/schools";
import { SHIP_BY_ID } from "@/data/ships";
import { SHIP_RANK_MAX, shipRankOf } from "@/data/shipRanks";
import { namesItsSize, recapFileName, topDieOf, type RecapCard } from "@/game/run/recap";
import { shareImage } from "@/services/share";
import { APP_VERSION } from "@/services/version";
import { useRunStore } from "@/stores/runStore";
import { drawRecap, type RecapTexts } from "./recapCanvas";

export const RecapShareButton = ({
  modelRef,
  win,
  sector,
  sectorMax,
}: {
  modelRef: RefObject<HTMLDivElement | null>;
  win: boolean;
  sector: number;
  sectorMax: number;
}) => {
  const { t } = useTranslation(["run", "common", "menu", "content"]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const textsFor = (card: RecapCard): RecapTexts => {
    const ship = SHIP_BY_ID.get(useRunStore.getState().shipId);
    const top = card.topDie === null ? undefined : DIE_BY_ID.get(card.topDie.defId);
    const lines = [
      t("run:summary.nodes", { n: card.nodes }),
      t("run:summary.kills", { n: card.kills }),
      t("run:summary.earned", { n: card.scrap }),
      ...(card.ascension > 0 ? [t("run:recap.ascension", { n: card.ascension })] : []),
      ...(top === undefined || card.topDie === null
        ? []
        : [
            namesItsSize(t(top.name), card.topDie.tier)
              ? t("run:recap.topDieName", { die: t(top.name) })
              : t("run:recap.topDie", { die: t(top.name), tier: card.topDie.tier }),
          ]),
    ];
    return {
      brand: t("common:appName"),
      title: t(win ? "run:summary.victory" : "run:summary.defeat"),
      ship: ship === undefined ? card.shipId : t(ship.name),
      rank: t("run:summary.shipRank", { rank: card.shipRank, max: card.rankMax }),
      route: t("run:summary.route", { n: card.sector, max: card.sectorMax }),
      lines,
      footer: t("menu:version", { version: APP_VERSION }),
    };
  };

  const share = async (): Promise<void> => {
    setBusy(true);
    setFailed(false);
    try {
      const run = useRunStore.getState();
      const card: RecapCard = {
        win,
        shipId: run.shipId,
        shipRank: shipRankOf(run.shipRankXp),
        rankMax: SHIP_RANK_MAX,
        sector,
        sectorMax,
        nodes: run.stats.nodesCleared,
        kills: run.stats.kills,
        scrap: run.stats.scrapEarned,
        ascension: run.ascension,
        topDie: topDieOf(run.deck),
      };
      const ship = SHIP_BY_ID.get(run.shipId);
      const accent = ship === undefined ? tokens.accent : schools[ship.bridgeTheme.tint].stroke;
      const model = modelRef.current?.querySelector("svg") ?? null;
      const blob = await drawRecap(textsFor(card), win, accent, model);
      await shareImage(blob, recapFileName(card), t("run:recap.title"));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack gap={4}>
      <Button
        size="compact-sm"
        variant="default"
        fullWidth
        data-testid="summary-share"
        loading={busy}
        onClick={() => {
          void share();
        }}
      >
        {t("run:recap.share")}
      </Button>
      {failed ? (
        <Text size="xs" c={tokens.danger} ta="center" data-recap-failed>
          {t("run:recap.failed")}
        </Text>
      ) : null}
    </Stack>
  );
};
