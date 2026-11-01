import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import type { ChartNodeDef } from "@/data/chart";
import { respecCost } from "@/game/chart/engine";
import { chartNodeCost } from "@/game/chart/cost";
import { chartNodeTitle } from "@/game/chart/describe";

export const RefundConfirmModal = ({
  opened,
  target,
  onCancel,
  onConfirm,
}: {
  opened: boolean;
  target: ChartNodeDef | undefined;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  const { t } = useTranslation(["meta", "common", "battle"]);
  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title={t("meta:chart.respecConfirmTitle")}
      centered
      data-respec-confirm
    >
      <Stack gap="sm">
        <Text size="sm" c={tokens.dim}>
          {target === undefined
            ? ""
            : t("meta:chart.respecConfirmBody", {
                name: chartNodeTitle(target, t),
                cost: respecCost(target.id),
                points: chartNodeCost(target.id),
              })}
        </Text>
        <Group grow>
          <Button variant="default" onClick={onCancel}>
            {t("common:cancel")}
          </Button>
          <Button color="danger" data-respec-yes onClick={onConfirm}>
            {t("meta:chart.respecConfirmYes")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export const ResetConfirmModal = ({
  opened,
  count,
  freeRespecs,
  shards,
  price,
  onCancel,
  onConfirm,
}: {
  opened: boolean;
  count: number;
  freeRespecs: number;
  shards: number;
  price: number;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  const { t } = useTranslation(["meta", "common", "battle"]);
  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title={t("meta:chart.resetTitle")}
      centered
      data-full-respec-confirm
    >
      <Stack gap="sm">
        <Text size="sm" c={tokens.dim}>
          {freeRespecs > 0
            ? t("meta:chart.resetBodyFree", { n: count })
            : t("meta:chart.resetBody", {
                n: count,
                price,
              })}
        </Text>
        {freeRespecs > 0 || shards >= price ? null : (
          <Text size="sm" c={tokens.danger} data-chart-reset-blocked>
            {t("meta:chart.needShards", { cost: price - shards })}
          </Text>
        )}
        <Group grow>
          <Button variant="default" onClick={onCancel}>
            {t("common:cancel")}
          </Button>
          <Button
            color="danger"
            data-full-respec-yes
            disabled={count === 0 || (freeRespecs <= 0 && shards < price)}
            onClick={onConfirm}
          >
            {freeRespecs > 0
              ? t("meta:chart.freeRespecYes")
              : t("meta:chart.resetYes", { price })}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
