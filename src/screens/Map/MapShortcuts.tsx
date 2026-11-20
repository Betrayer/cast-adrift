import { Button } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/stores/appStore";

export const MapShortcuts = () => {
  const { t } = useTranslation(["run"]);
  return (
    <>
      <Button
        size="compact-xs"
        variant="default"
        data-open-journal
        onClick={() => {
          useAppStore.getState().go("journal");
        }}
      >
        {t("run:journal.open")}
      </Button>
      <Button
        size="compact-xs"
        variant="default"
        data-open-bridge
        data-testid="map-bridge"
        onClick={() => {
          useAppStore.getState().go("bridge");
        }}
      >
        {t("run:bridge.open")}
      </Button>
      <Button
        size="compact-xs"
        variant="default"
        data-testid="map-system-menu"
        onClick={() => {
          useAppStore.getState().setSystemMenu(true);
        }}
      >
        {t("run:system.open")}
      </Button>
    </>
  );
};
