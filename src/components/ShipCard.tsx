import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { schools } from "@/data/schools";
import { SHIP_BY_ID, type ShipId } from "@/data/ships";
import { slotCapForMk, type MkLevel } from "@/data/slots";
import { slotAffinity } from "@/game/battle/view";
import { featureRoutes, unlockHintsLine } from "@/game/meta/describeUnlock";
import type { SlotId } from "@/types/battle";
import styles from "./ShipCard.module.css";

export type ShipCardSize = "full" | "compact";

interface ShipCardProps {
  shipId: ShipId;
  size?: ShipCardSize;
  plain?: boolean;
  mkLevels?: Partial<Record<SlotId, MkLevel>>;
  showPrice?: boolean;
  footer?: ReactNode;
  className?: string;
}

const classes = (...names: (string | undefined | false)[]): string =>
  names
    .filter((name): name is string => typeof name === "string" && name !== "")
    .join(" ");

export const ShipCard = ({
  shipId,
  size = "full",
  plain = false,
  mkLevels,
  showPrice = false,
  footer,
  className,
}: ShipCardProps) => {
  const { t } = useTranslation(["battle", "content", "meta"]);
  const def = SHIP_BY_ID.get(shipId);
  if (def === undefined) return null;

  const slotIds = Object.keys(def.slots) as SlotId[];
  const route =
    def.unlock === undefined
      ? null
      : unlockHintsLine(featureRoutes(def.unlock), t);

  return (
    <div
      className={classes(styles.card, plain && styles.plain, className)}
      data-ship-card={def.id}
      data-sweep-host
      data-ship-card-size={size}
      data-ship-hull={def.hullMax}
      data-ship-slots={slotIds.join(",")}
    >
      <div className={styles.head}>
        <span className={styles.name}>{t(def.name)}</span>
        <span className={styles.hull} data-ship-hull-label>
          ♥ {t("battle:ship.hull", { n: def.hullMax })}
        </span>
      </div>

      <div className={styles.passive} data-ship-passive={def.passive?.kind}>
        {def.passiveName === undefined || def.passiveDesc === undefined ? (
          <span className={styles.passiveDesc}>
            {t("battle:ship.passiveNone")}
          </span>
        ) : (
          <>
            <span className={styles.passiveName}>{t(def.passiveName)}</span>
            <span className={styles.passiveDesc}>{t(def.passiveDesc)}</span>
          </>
        )}
      </div>

      <div className={styles.section} data-ship-board>
        <span className={styles.sectionTitle}>{t("battle:ship.slots")}</span>
        {size === "compact" ? (
          <div className={styles.chips}>
            {slotIds.map((slotId) => {
              const base = def.slots[slotId];
              const mk = mkLevels?.[slotId] ?? base?.mk ?? 1;
              return (
                <span key={slotId} className={styles.chip} data-ship-slot={slotId}>
                  {t("battle:ship.slot", {
                    name: t(`battle:slot.${slotId}`),
                    cap: slotCapForMk(slotId, mk),
                    mk,
                  })}
                </span>
              );
            })}
          </div>
        ) : (
          slotIds.map((slotId) => {
            const base = def.slots[slotId];
            const mk = mkLevels?.[slotId] ?? base?.mk ?? 1;
            const affinity = slotAffinity(slotId, { mk });
            const jamOn = base?.jamOn;
            return (
              <span key={slotId} className={styles.slotRow} data-ship-slot={slotId}>
                <span>
                  {t("battle:ship.slot", {
                    name: t(`battle:slot.${slotId}`),
                    cap: slotCapForMk(slotId, mk),
                    mk,
                  })}
                </span>
                {affinity === null ? null : (
                  <span style={{ color: schools[affinity.school].text }}>
                    {t(
                      affinity.kind === "chargeMult"
                        ? "battle:slot.affinityMult"
                        : "battle:slot.affinity",
                      {
                        school: t(`battle:school.${affinity.school}`),
                        n: affinity.amount,
                      },
                    )}
                  </span>
                )}
                {jamOn === undefined ? null : (
                  <span className={styles.slotNote}>
                    {t("battle:ship.jamAt", { n: jamOn })}
                  </span>
                )}
              </span>
            );
          })
        )}
      </div>

      {showPrice ? (
        <span className={styles.price} data-ship-price>
          {def.price === 0
            ? t("battle:ship.free")
            : route === null
              ? t("battle:ship.price", { n: def.price })
              : `${t("battle:ship.price", { n: def.price })} · ${t("battle:ship.locked", { route })}`}
        </span>
      ) : null}

      {footer === undefined ? null : (
        <div className={styles.footer}>{footer}</div>
      )}
    </div>
  );
};
