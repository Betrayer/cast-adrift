import { SegmentedControl, Stack, Text, type SegmentedControlItem } from '@mantine/core';
import type { ReactNode } from 'react';
import { riseStyle } from '@/app/motion';
import { tokens } from '@/app/theme';

export const SegmentSetting = <T extends string>({
  section,
  label,
  value,
  data,
  onChange,
  testId,
  children,
}: {
  section: string;
  label: string;
  value: T;
  data: SegmentedControlItem<T>[];
  onChange: (value: T) => void;
  testId?: string;
  children?: ReactNode;
}) => (
  <Stack
    gap="xs"
    data-rise
    data-settings-section={section}
    style={riseStyle(3)}
  >
    <Text size="sm" c={tokens.dim}>
      {label}
    </Text>
    <SegmentedControl
      fullWidth
      data-testid={testId}
      value={value}
      onChange={onChange}
      data={data}
    />
    {children}
  </Stack>
);
