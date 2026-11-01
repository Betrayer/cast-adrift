import { Button, Paper, SegmentedControl, SimpleGrid, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { trackEvent } from "@/services/analytics";
import { SHIP_COLUMNS } from "@/app/grids";
import { tokens } from "@/app/theme";
import { ShipCard } from "@/components/ShipCard";
import { fireMotionFlag, riseStyle, SWEEP_MS } from "@/app/motion";
import { PLAYABLE_SHIPS } from "@/data/ships";
import { featureRoutes, unlockHintsLine } from "@/game/meta/describeUnlock";
import { hasFeature, type UnlockContext } from "@/data/unlocks";
import { useMetaStore } from "@/stores/metaStore";
import styles from "./HangarScreen.module.css";

interface HangarShipsProps {
  unlockCtx: UnlockContext;
  tab: string;
  onTab: (tab: string) => void;
}

export const HangarShips = ({ unlockCtx, tab, onTab }: HangarShipsProps) => {
  const { t } = useTranslation(["meta", "common", "content", "battle"]);
  const shards = useMetaStore((s) => s.shards);
  const ships = useMetaStore((s) => s.ships);
  const selectedShip = useMetaStore((s) => s.selectedShip);
  const buyShip = useMetaStore((s) => s.buyShip);
  const selectShip = useMetaStore((s) => s.selectShip);

  return (
    <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
      <SimpleGrid
        cols={SHIP_COLUMNS}
        spacing="xs"
        mb="sm"
        data-hangar-ships
      >
        {PLAYABLE_SHIPS.map((ship, index) => {
          const isOwned = ships.includes(ship.id);
          const equipped = selectedShip === ship.id;
          const unlocked =
            ship.unlock === undefined || hasFeature(unlockCtx, ship.unlock);
          return (
            <div
              key={ship.id}
              className={styles.shipCell}
              data-rise
              data-press
              style={riseStyle(index)}
            >
              <ShipCard
                shipId={ship.id}
                showPrice={!isOwned}
                className={equipped ? undefined : styles.shipDim}
                footer={
                  isOwned ? (
                    <Button
                      size="compact-xs"
                      fullWidth
                      variant={equipped ? "filled" : "default"}
                      disabled={equipped}
                      data-testid={`hangar-ship-${ship.id}`}
                      onClick={() => {
                        selectShip(ship.id);
                        fireMotionFlag(
                          document.querySelector(
                            `[data-ship-card="${ship.id}"]`,
                          ),
                          "data-sweep",
                          SWEEP_MS,
                        );
                      }}
                    >
                      {equipped
                        ? t("meta:hangar.shipEquipped")
                        : t("meta:hangar.shipEquip")}
                    </Button>
                  ) : unlocked ? (
                    <Button
                      size="compact-xs"
                      fullWidth
                      disabled={shards < ship.price}
                      data-testid={`hangar-ship-${ship.id}`}
                      onClick={() => {
                        buyShip(ship.id, ship.price);
                        trackEvent({ name: "meta_purchase", params: { kind: "ship" } });
                      }}
                    >
                      {t("meta:hangar.shipBuy", { price: ship.price })}
                    </Button>
                  ) : (
                    <Text
                      size="xs"
                      c={tokens.faint}
                      ta="center"
                      data-ship-locked={ship.id}
                    >
                      {t("meta:hangar.shipLocked", {
                        route:
                          ship.unlock === undefined
                            ? ""
                            : unlockHintsLine(featureRoutes(ship.unlock), t),
                      })}
                    </Text>
                  )
                }
              />
            </div>
          );
        })}
      </SimpleGrid>

      <SegmentedControl
        fullWidth
        size="xs"
        value={tab}
        onChange={onTab}
        data={[
          {
            value: "build",
            label: <span data-hangar-tab="build">{t("meta:hangar.deck")}</span>,
          },
          {
            value: "shop",
            label: <span data-hangar-tab="shop">{t("meta:hangar.shop")}</span>,
          },
        ]}
      />
    </Paper>
  );
};
