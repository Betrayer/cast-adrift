import type { ReactNode } from 'react';
import { CommsBand } from '@/components/CommsBand';
import boardStyles from '@/screens/Battle/board/Board.module.css';
import type { BattleLayoutId } from '@/types';

export type BoardComposition = 'phone' | 'wide';

export const BoardColumn = ({
  layout,
  composition,
  children,
}: {
  layout: BattleLayoutId;
  composition: BoardComposition;
  children: ReactNode;
}) => (
  <div className={boardStyles.column} data-layout={layout} data-composition={composition}>
    {children}
    {composition === 'phone' ? <CommsBand placement="board" /> : null}
  </div>
);
