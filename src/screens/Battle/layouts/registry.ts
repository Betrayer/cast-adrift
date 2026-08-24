import type { ComponentType } from 'react';
import {
  ConsoleBody,
  ConsoleFooter,
  ConsoleWide,
} from '@/screens/Battle/layouts/console/ConsoleLayout';
import {
  OrbitBody,
  OrbitFooter,
  OrbitWide,
} from '@/screens/Battle/layouts/orbit/OrbitLayout';
import {
  TabletBody,
  TabletFooter,
  TabletWide,
} from '@/screens/Battle/layouts/tablet/TabletLayout';
import type { BattleLayoutId } from '@/types';

export interface BattleLayoutView {
  Body: ComponentType;
  Footer: ComponentType;
  Wide: ComponentType;
}

export const LAYOUT_VIEWS: Record<BattleLayoutId, BattleLayoutView> = {
  console: { Body: ConsoleBody, Footer: ConsoleFooter, Wide: ConsoleWide },
  orbit: { Body: OrbitBody, Footer: OrbitFooter, Wide: OrbitWide },
  tablet: { Body: TabletBody, Footer: TabletFooter, Wide: TabletWide },
};
