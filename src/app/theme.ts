import { createTheme, type MantineColorsTuple } from '@mantine/core';

export const tokens = {
  bg: '#0B0F1A',
  surface1: '#10182A',
  surface2: '#182238',
  line: '#2A3853',
  text: '#E8EDF7',
  dim: '#93A0B8',
  faint: '#5C6A85',
  accent: '#7C5CFF',
  danger: '#E4574E',
  amber: '#E8B23A',
} as const;

const accent: MantineColorsTuple = [
  '#F1EDFF',
  '#DED4FF',
  '#C4B3FF',
  '#A98FFF',
  '#9273FF',
  '#7C5CFF',
  '#6C4CE8',
  '#5A3DC7',
  '#4930A3',
  '#392480',
];

const danger: MantineColorsTuple = [
  '#FCEDEC',
  '#F6D0CD',
  '#EFAFAA',
  '#E98E87',
  '#E67268',
  '#E4574E',
  '#C74A42',
  '#A63D37',
  '#84302B',
  '#632420',
];

const amber: MantineColorsTuple = [
  '#FBF3E0',
  '#F6E3B8',
  '#F0D28D',
  '#ECC463',
  '#EABB49',
  '#E8B23A',
  '#CB9B31',
  '#A98128',
  '#86661F',
  '#644C17',
];

const dark: MantineColorsTuple = [
  '#E8EDF7',
  '#93A0B8',
  '#5C6A85',
  '#3D4C6B',
  '#2A3853',
  '#182238',
  '#10182A',
  '#0B0F1A',
  '#080C14',
  '#05080E',
];

export const theme = createTheme({
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  primaryColor: 'accent',
  primaryShade: 5,
  defaultRadius: 'md',
  colors: { accent, danger, amber, dark },
  other: { tokens },
});
