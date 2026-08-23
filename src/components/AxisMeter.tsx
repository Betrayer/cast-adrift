import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { TapPopover } from "@/components/TapPopover";
import { schools } from "@/data/schools";
import { AXIS_NOTCHES, axisLabel, axisNotch } from "@/game/run/axis";
import styles from "./AxisMeter.module.css";

export const axisTone = (axis: number): string => {
  const label = axisLabel(axis);
  if (label === "resonance") return schools.black.text;
  if (label === "stability") return schools.blue.text;
  return tokens.dim;
};

interface AxisMeterProps {
  axis: number;
  preview?: number;
  compact?: boolean;
  withLabel?: boolean;
  explain?: boolean;
}

export const AxisMeter = ({
  axis,
  preview,
  compact = false,
  withLabel = true,
  explain = false,
}: AxisMeterProps) => {
  const { t } = useTranslation(["run"]);
  const target = preview ?? axis;
  const from = axisNotch(axis);
  const to = axisNotch(target);
  const lit = { low: Math.min(from, to), high: Math.max(from, to) };
  const tone = axisTone(target);
  const center = Math.floor(AXIS_NOTCHES / 2);

  const meter = (
    <span
      data-axis-meter
      className={`${styles.meter ?? ""} ${compact ? styles.compact ?? "" : ""}`}
      style={
        {
          "--ca-notch-on": tone,
          "--ca-notch-off": tokens.line,
        } as React.CSSProperties
      }
    >
      <span className={styles.notches}>
        {Array.from({ length: AXIS_NOTCHES }, (_, i) => (
          <span
            key={i}
            className={styles.notch}
            data-on={i >= lit.low && i <= lit.high}
            data-center={i === center}
          />
        ))}
      </span>
      {withLabel ? (
        <span className={styles.label} style={{ color: tone }}>
          {preview === undefined
            ? t(`run:axis.${axisLabel(axis)}`, { n: axis })
            : t("run:axis.preview", { from: axis, to: target })}
        </span>
      ) : null}
    </span>
  );

  if (!explain) return meter;
  return (
    <TapPopover
      label={t("run:axis.title", { n: axis })}
      testId="axis-explain"
      align="start"
      content={
        <>
          <b>{t("run:axis.title", { n: axis })}</b>
          <br />
          {t(`run:axis.${axisLabel(target)}`, { n: target })}
        </>
      }
    >
      {meter}
    </TapPopover>
  );
};
