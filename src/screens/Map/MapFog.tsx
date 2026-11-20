import { useTranslation } from "react-i18next";
import { mixHex } from "@/app/color";
import { tokens } from "@/app/theme";
import type { MapGeometry } from "./mapGeometry";
import styles from "./MapScreen.module.css";

interface MapFogProps {
  geo: MapGeometry;
  fogBottom: number;
}

export const MapFog = ({ geo, fogBottom }: MapFogProps) => {
  const { t } = useTranslation(["run"]);
  return fogBottom > 0 ? (
    <g className={styles.fog}>
      <rect
        x={8}
        y={0}
        width={geo.viewW - 16}
        height={fogBottom}
        rx={8}
        fill={tokens.bg}
        opacity={0.72}
      />
      <rect
        x={8}
        y={0}
        width={geo.viewW - 16}
        height={fogBottom}
        rx={8}
        fill="none"
        stroke={mixHex(tokens.line, tokens.faint, 0.35)}
        strokeDasharray="6 5"
      />
      <text
        x={geo.viewW / 2}
        y={Math.min(fogBottom - 26, 54)}
        textAnchor="middle"
        fontSize={13}
        fill={tokens.dim}
      >
        {t("run:map.fog")}
      </text>
      <text
        x={geo.viewW / 2}
        y={Math.min(fogBottom - 10, 72)}
        textAnchor="middle"
        fontSize={11}
        fill={tokens.faint}
      >
        {t("run:map.fogSub")}
      </text>
    </g>
  ) : null;
};
