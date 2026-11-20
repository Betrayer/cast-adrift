import { ActionIcon, Popover } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ChartLayoutId } from "@/types";
import { ChartLayoutPicker } from "@/screens/Settings/ChartLayoutPicker";
import { stopStagePointer } from "./chartPresentation";
import styles from "./ChartScreen.module.css";

const LayoutGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
    <circle cx="8" cy="8" r="1.8" fill="currentColor" />
    <path
      d="M8 8 C 8 4, 12 3, 13.5 5.5 M8 8 C 8 12, 4 13, 2.5 10.5 M8 8 C 12 8, 13 12, 10.5 13.5 M8 8 C 4 8, 3 4, 5.5 2.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);

export const ChartViewControls = ({
  layoutId,
  onZoom,
  onReset,
}: {
  layoutId: ChartLayoutId;
  onZoom: (factor: number) => void;
  onReset: () => void;
}) => {
  const { t } = useTranslation(["meta", "common", "battle"]);
  const [layoutOpen, setLayoutOpen] = useState(false);
  return (
    <div
      className={styles.zoomControls}
      onPointerDown={stopStagePointer}
      onPointerUp={stopStagePointer}
      onPointerMove={stopStagePointer}
    >
      <Popover
        opened={layoutOpen}
        onChange={setLayoutOpen}
        position="right-end"
        shadow="md"
        withinPortal
      >
        <Popover.Target>
          <ActionIcon
            variant={layoutOpen ? "filled" : "default"}
            aria-label={t("meta:chart.layout")}
            data-chart-layout-toggle={layoutId}
            onClick={() => {
              setLayoutOpen((open) => !open);
            }}
          >
            <LayoutGlyph />
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown data-chart-layout-popover>
          <ChartLayoutPicker
            compact
            onPick={() => {
              setLayoutOpen(false);
            }}
          />
        </Popover.Dropdown>
      </Popover>
      <ActionIcon
        variant="default"
        onClick={() => {
          onZoom(1.35);
        }}
        aria-label="zoom in"
      >
        +
      </ActionIcon>
      <ActionIcon
        variant="default"
        onClick={() => {
          onZoom(1 / 1.35);
        }}
        aria-label="zoom out"
      >
        −
      </ActionIcon>
      <ActionIcon variant="default" onClick={onReset} aria-label="reset">
        ⟲
      </ActionIcon>
    </div>
  );
};
