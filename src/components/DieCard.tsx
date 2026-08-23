import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { TagChips } from "@/components/TagChips";
import { schools } from "@/data/schools";
import type { ContentTag } from "@/data/tags";
import type { EngravingMap } from "@/data/engravings";
import {
  DIE_BADGE_GLYPH,
  dieCardModel,
  evLabel,
  type DieBadgeKind,
  type DieCardModel,
  type DieFeature,
} from "@/game/dice/card";
import styles from "./DieCard.module.css";

export type DieCardSize = "full" | "compact" | "mini";

interface DieCardProps {
  defId: string;
  size?: DieCardSize;
  dense?: boolean;
  plain?: boolean;
  growthBonus?: number;
  engravings?: EngravingMap;
  engravingIds?: readonly string[];
  tagCounts?: Partial<Record<ContentTag, number>>;
  footer?: ReactNode;
  className?: string;
}

const classes = (...names: (string | undefined | false)[]): string =>
  names.filter((name): name is string => typeof name === "string" && name !== "").join(" ");

export const DieCard = ({
  defId,
  size = "compact",
  dense = false,
  plain = false,
  growthBonus,
  engravings,
  engravingIds,
  tagCounts,
  footer,
  className,
}: DieCardProps) => {
  const { t } = useTranslation(["battle", "run", "content"]);
  const model = dieCardModel({ defId, engravings, engravingIds, growthBonus });
  if (model === null) return null;

  const { def, faces } = model;
  const colors = schools[def.school];
  const facesText = faces.custom
    ? faces.faces.join("·")
    : t("battle:dieFaces", { min: faces.min, max: faces.max });
  const ev = evLabel(faces.ev);
  const full = size === "full";

  const badgeLabel = (badge: DieBadgeKind): string =>
    badge === "growth"
      ? `${DIE_BADGE_GLYPH.growth}${String(model.growthBonus)}`
      : DIE_BADGE_GLYPH[badge];

  const featureLine = (feature: DieFeature): string => {
    if (feature === "active") {
      return t("battle:die.feature.active", {
        what: t(`battle:die.active.${def.active ?? "flip"}`),
      });
    }
    if (feature === "engraved") {
      return t("battle:die.feature.engraved", {
        names: model.engravings.map((eng) => t(eng.name)).join(" · "),
      });
    }
    if (feature === "faces") {
      return t("battle:die.feature.faces", { list: facesText });
    }
    if (feature === "growth") {
      return model.growth === undefined
        ? t("battle:die.feature.growthField", { n: model.growthBonus })
        : t("battle:die.feature.growth", {
            per: model.growth.perMax,
            cap: model.growth.cap,
          });
    }
    if (feature === "fate") return t("battle:die.feature.fate");
    return t("battle:die.feature.prismatic");
  };

  const featureGlyph = (feature: DieFeature): string =>
    feature === "prismatic"
      ? t("battle:school.prismatic")
      : DIE_BADGE_GLYPH[feature];

  return (
    <div
      className={classes(
        styles.card,
        plain && styles.plain,
        dense && styles.dense,
        className,
      )}
      data-die-card={def.id}
      data-die-card-size={size}
      data-die-tier={def.tier}
      data-die-faces={facesText}
      data-die-ev={ev}
    >
      <div className={styles.head}>
        <span className={styles.name} style={{ color: colors.text }}>
          {t(def.name)}
        </span>
        {size === "mini" ? null : (
          <span
            className={styles.chip}
            data-prismatic={def.school === "prismatic" ? "1" : undefined}
            style={{ borderColor: colors.stroke, color: colors.text }}
          >
            {t(`battle:school.${def.school}`)}
          </span>
        )}
      </div>

      {size === "mini" ? (
        <span className={styles.meta} data-die-meta>
          {t("battle:dieMeta", {
            tier: def.tier,
            school: t(`battle:school.${def.school}`),
            faces: facesText,
            ev,
          })}
        </span>
      ) : (
        <>
          <span className={styles.meta} data-die-meta>
            {t("battle:die.stats", {
              tier: def.tier,
              rarity: t(`battle:die.rarity.${def.rarity}`),
              pts: def.pts,
            })}
          </span>
          <div className={styles.faces}>
            {faces.custom ? (
              faces.faces.map((face, index) => (
                <span
                  key={`${String(index)}-${String(face)}`}
                  className={styles.face}
                  data-die-face={face}
                  data-face-peak={face === faces.max ? "1" : undefined}
                  style={{ color: face === faces.max ? colors.text : undefined }}
                >
                  {face}
                </span>
              ))
            ) : (
              <span className={styles.range}>{facesText}</span>
            )}
            <span className={styles.ev}>{t("battle:die.avg", { n: ev })}</span>
          </div>
        </>
      )}

      {def.desc === undefined ? null : (
        <p className={styles.desc} data-die-desc>
          {t(def.desc)}
        </p>
      )}

      {model.badges.length === 0 || full ? null : (
        <span className={styles.badges} data-die-badges>
          {model.badges.map((badge) => (
            <span
              key={badge}
              className={styles.badge}
              data-badge={badge}
              title={t(`battle:badge.${badge}`)}
            >
              {badgeLabel(badge)}
            </span>
          ))}
        </span>
      )}

      {full && (def.tags ?? []).length > 0 ? (
        <TagChips tags={def.tags ?? []} counts={tagCounts} />
      ) : null}

      {full && model.engravings.length > 0 ? (
        <div className={styles.section} data-die-engravings>
          <span className={styles.sectionTitle}>
            {t("battle:die.engravings")}
          </span>
          {model.engravings.map((eng) => (
            <span key={eng.id} className={styles.line}>
              {t("battle:die.engravingLine", {
                name: t(eng.name),
                desc: t(eng.desc),
              })}
            </span>
          ))}
        </div>
      ) : null}

      {full && model.features.length > 0 ? (
        <div className={styles.section} data-die-features>
          <span className={styles.sectionTitle}>
            {t("battle:die.features")}
          </span>
          {model.features.map((feature) => (
            <span
              key={feature}
              className={styles.line}
              data-die-feature={feature}
            >
              <span className={styles.lineGlyph}>{featureGlyph(feature)}</span>
              {featureLine(feature)}
            </span>
          ))}
        </div>
      ) : null}

      {footer === undefined ? null : (
        <div className={styles.footer}>{footer}</div>
      )}
    </div>
  );
};

export type { DieCardModel };
