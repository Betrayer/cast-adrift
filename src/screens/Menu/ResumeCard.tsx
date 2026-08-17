import { Button, Group, Modal, Paper, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/app/theme';
import { sectorDef } from '@/data/sectors';
import { SHIP_BY_ID } from '@/data/ships';
import { abandonRun } from '@/game/run/flow';
import { relativeWhen, resumeLocalRun, type LocalResume } from '@/game/run/resume';
import { dropCloudRun } from '@/game/run/cloud';

const SHIP_GLYPH: Record<string, string> = {
  wanderer: 'M2 12 L14 6 L22 12 L14 18 Z',
  ram: 'M2 12 L10 5 L22 12 L10 19 Z',
  ark: 'M3 8 H17 L22 12 L17 16 H3 Z',
  'ram-proto': 'M2 12 L12 6 L22 12 L12 18 Z',
};

export const ResumeCard = ({ resume }: { resume: LocalResume }) => {
  const { t } = useTranslation(['menu', 'run', 'content']);
  const [confirming, setConfirming] = useState(false);
  const def = sectorDef(resume.sector);
  const ship = SHIP_BY_ID.get(resume.shipId);
  const when = relativeWhen(resume.savedAt);
  const whenLabel =
    when.unit === 'now'
      ? t('menu:resumeWhen.now')
      : t(`menu:resumeWhen.${when.unit}`, { n: when.n });

  return (
    <Paper bg={tokens.surface1} p="sm" radius="md" withBorder>
      <Stack gap="xs">
        <Group gap="sm" wrap="nowrap" align="center">
          <svg width={26} height={26} viewBox="0 0 24 24" aria-hidden>
            <path
              d={SHIP_GLYPH[resume.shipId] ?? SHIP_GLYPH.wanderer}
              fill="none"
              stroke={def.accent}
              strokeWidth={1.6}
              strokeLinejoin="round"
            />
          </svg>
          <Stack gap={0} style={{ flex: 1 }}>
            <Text size="sm" c={tokens.text} fw={600}>
              {t('menu:resumeCard', {
                sector: resume.sector,
                depth: resume.depth,
                when: whenLabel,
              })}
            </Text>
            <Text size="xs" c={tokens.faint}>
              {`${t(def.name)}${ship === undefined ? '' : ` · ${t(ship.name)}`}`}
            </Text>
          </Stack>
        </Group>
        <Group gap="xs" grow>
          <Button
            size="sm"
            color="accent"
            data-testid="resume-continue"
            onClick={() => {
              resumeLocalRun();
            }}
          >
            {t('menu:resumeContinue')}
          </Button>
          <Button
            size="sm"
            variant="default"
            data-testid="resume-abandon"
            onClick={() => {
              setConfirming(true);
            }}
          >
            {t('menu:resumeAbandon')}
          </Button>
        </Group>
      </Stack>

      <Modal
        opened={confirming}
        centered
        withCloseButton={false}
        onClose={() => {
          setConfirming(false);
        }}
        title={
          <Text fw={600} c={tokens.text}>
            {t('menu:abandonTitle')}
          </Text>
        }
      >
        <Stack gap="md">
          <Text size="sm" c={tokens.dim}>
            {t('menu:abandonBody')}
          </Text>
          <Group grow>
            <Button
              variant="default"
              data-testid="resume-abandon-cancel"
              onClick={() => {
                setConfirming(false);
              }}
            >
              {t('menu:abandonNo')}
            </Button>
            <Button
              color="red"
              data-testid="resume-abandon-confirm"
              onClick={() => {
                setConfirming(false);
                void dropCloudRun();
                abandonRun();
              }}
            >
              {t('menu:abandonYes')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  );
};
