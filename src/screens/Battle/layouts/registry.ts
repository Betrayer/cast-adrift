import type { ComponentType } from 'react';
import {
  ConsoleBody,
  ConsoleFooter,
} from '@/screens/Battle/layouts/console/ConsoleLayout';
import {
  OrbitBody,
  OrbitFooter,
} from '@/screens/Battle/layouts/orbit/OrbitLayout';
import {
  TabletBody,
  TabletFooter,
} from '@/screens/Battle/layouts/tablet/TabletLayout';
import type { BattleLayoutId } from '@/types';

export interface BattleLayoutView {
  Body: ComponentType;
  Footer: ComponentType;
}

export const LAYOUT_VIEWS: Record<BattleLayoutId, BattleLayoutView> = {
  console: { Body: ConsoleBody, Footer: ConsoleFooter },
  orbit: { Body: OrbitBody, Footer: OrbitFooter },
  tablet: { Body: TabletBody, Footer: TabletFooter },
};
