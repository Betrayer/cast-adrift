import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { dropCloudRun } from "@/game/run/cloud";
import { discardActiveRun } from "@/game/run/flow";

interface ActiveRunGuardProps {
  opened: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ActiveRunGuard = ({
  opened,
  onCancel,
  onConfirm,
}: ActiveRunGuardProps) => {
  const { t } = useTranslation(["meta", "menu"]);

  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      centered
      withCloseButton={false}
      title={t("meta:modes.guardTitle")}
    >
      <Stack gap="sm">
        <Text size="sm" c={tokens.dim}>
          {t("meta:modes.guardBody")}
        </Text>
        <Group grow>
          <Button variant="default" onClick={onCancel}>
            {t("menu:abandonNo")}
          </Button>
          <Button
            color="danger"
            onClick={() => {
              void dropCloudRun();
              discardActiveRun();
              onConfirm();
            }}
          >
            {t("meta:modes.guardYes")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
