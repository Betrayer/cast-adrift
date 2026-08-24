import {
  Badge,
  Button,
  Divider,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/app/Screen';
import { riseStyle } from '@/app/motion';
import { AppHeader } from '@/components/AppHeader';
import { tokens } from '@/app/theme';
import { now } from '@/services/clock';
import {
  ASCENSIONS,
  ascensionMods,
  ascensionRewardsUpTo,
  maxSelectableAscension,
} from '@/data/ascension';
import { ShipCard } from '@/components/ShipCard';
import { ascensionShardMult } from '@/game/xp';
import { startRun } from '@/game/run/flow';
import { useAppStore } from '@/stores/appStore';
import { useMetaStore } from '@/stores/metaStore';

export const RunSetupScreen = () => {
  const { t } = useTranslation(['run', 'content', 'menu']);
  const go = useAppStore((s) => s.go);
  const shipId = useMetaStore((s) => s.selectedShip);
  const deck = useMetaStore((s) => s.hangar.deck);
  const cleared = useMetaStore((s) => s.ascension.campaign);
  const vouchers = useMetaStore((s) => s.vouchers.perkDraft);
  const maxAscension = maxSelectableAscension(cleared);
  const [ascension, setAscension] = useState(0);
  const [useVoucher, setUseVoucher] = useState(false);
  const mods = ascensionMods(ascension);
  const spendVoucher = useVoucher && vouchers > 0;

  return (
    <Screen centered header={<AppHeader />}>
      <Paper bg={tokens.surface1} p="xl" radius="md" withBorder w="100%">
        <Stack gap="md">
          <Title order={3} c={tokens.text} data-rise style={riseStyle(0)}>
            {t('run:setup.title')}
          </Title>
          <Text size="sm" c={tokens.dim} data-rise style={riseStyle(0)}>
            {t('run:setup.mode')}
          </Text>
          <Divider color={tokens.line} label={t('run:setup.ship')} />
          <div data-rise data-press style={riseStyle(1)}>
          <ShipCard
            shipId={shipId}
            footer={
              <Group justify="space-between" wrap="nowrap">
                <Text size="sm" c={tokens.faint}>
                  {t('run:setup.deck', { n: deck.length })}
                </Text>
                <Button
                  size="compact-xs"
                  variant="default"
                  data-testid="setup-change-ship"
                  onClick={() => {
                    go('hangar');
                  }}
                >
                  {t('run:setup.changeShip')}
                </Button>
              </Group>
            }
          />
          </div>
          <Divider color={tokens.line} label={t('run:setup.ascension')} />
          {maxAscension === 0 ? (
            <Text size="xs" c={tokens.faint}>
              {t('run:setup.ascensionLocked')}
            </Text>
          ) : (
            <Group gap="xs">
              {Array.from({ length: maxAscension + 1 }, (_, level) => (
                <Button
                  key={level}
                  size="compact-sm"
                  variant={level === ascension ? 'filled' : 'default'}
                  onClick={() => {
                    setAscension(level);
                  }}
                >
                  {t('run:setup.aLevel', { n: level })}
                </Button>
              ))}
            </Group>
          )}
          <SimpleGrid
            cols={{ base: 1, xs: 2 }}
            spacing="xs"
            data-rise
            style={riseStyle(2)}
          >
            <Stack gap={2} data-ascension-penalties>
              <Text size="xs" c={tokens.faint}>
                {t('run:setup.ascensionCost')}
              </Text>
              {ASCENSIONS.filter((a) => a.level <= ascension).map((a) => (
                <Text key={a.level} size="xs" c={tokens.danger}>
                  {`A${String(a.level)} · ${t(a.desc)}`}
                </Text>
              ))}
              {ascension > 0 ? (
                <Text size="xs" c={tokens.faint}>
                  {t('run:setup.tideCap', { n: 3 + mods.tideCapDelta })}
                </Text>
              ) : null}
            </Stack>
            <Stack gap={2} data-ascension-rewards>
              <Text size="xs" c={tokens.faint}>
                {t('run:setup.ascensionGain')}
              </Text>
              <Text size="xs" c={tokens.amber}>
                {t('run:setup.shardMult', {
                  n: Math.round((ascensionShardMult(ascension) - 1) * 100),
                })}
              </Text>
              {ascensionRewardsUpTo(ascension).map((reward, i) => (
                <Text key={`${String(reward.level)}-${String(i)}`} size="xs" c={tokens.amber}>
                  {`A${String(reward.level)} · ${t(reward.label)}`}
                </Text>
              ))}
            </Stack>
          </SimpleGrid>
          {vouchers > 0 ? (
            <Paper
              bg={tokens.surface2}
              p="sm"
              radius="md"
              withBorder
              data-testid="setup-voucher"
              style={{ borderColor: tokens.amber }}
            >
              <Stack gap={4}>
                <Group justify="space-between" wrap="nowrap">
                  <Switch
                    size="sm"
                    color="accent"
                    checked={useVoucher}
                    label={t('run:setup.voucher')}
                    data-testid="setup-voucher-toggle"
                    onChange={(event) => {
                      setUseVoucher(event.currentTarget.checked);
                    }}
                  />
                  <Badge size="sm" variant="light" color="yellow">
                    {t('run:setup.voucherCount', { n: vouchers })}
                  </Badge>
                </Group>
                <Text size="xs" c={tokens.faint}>
                  {t('run:setup.voucherHint')}
                </Text>
              </Stack>
            </Paper>
          ) : null}
          <Button
            size="md"
            fullWidth
            color="accent"
            data-rise
            data-press
            style={riseStyle(3)}
            data-testid="setup-launch"
            onClick={() => {
              startRun(now() >>> 0, ascension, spendVoucher);
            }}
          >
            {t('run:setup.launch')}
          </Button>
        </Stack>
      </Paper>
    </Screen>
  );
};
