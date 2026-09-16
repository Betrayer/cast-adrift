import {
  ECHO_BRANCHES,
  echoBranchName,
  echoEquipped,
  echoLabelVars,
  echoNodeDef,
  echoNodesOfBranch,
  echoUnlocked,
  type EchoBranch,
  type EchoNodeDef,
} from '@/data/echo';
import { MEMORY_TOTAL } from '@/data/narrative/memories';
import type { LocKey } from '@/types/content';

export interface EchoNodeView {
  def: EchoNodeDef;
  unlocked: boolean;
  equipped: boolean;
  vars: Readonly<Record<string, number>>;
}

export interface EchoBranchView {
  branch: EchoBranch;
  name: LocKey;
  nodes: readonly EchoNodeView[];
}

export interface EchoLine {
  key: LocKey;
  values: Readonly<Record<string, number>>;
}

export const echoBranchViews = (
  fragments: number,
  selected: string | null | undefined,
): readonly EchoBranchView[] => {
  const live = echoEquipped(selected, fragments);
  return ECHO_BRANCHES.map((branch) => ({
    branch,
    name: echoBranchName(branch),
    nodes: echoNodesOfBranch(branch)
      .slice()
      .sort((a, b) => a.threshold - b.threshold)
      .map((def) => ({
        def,
        unlocked: echoUnlocked(def, fragments),
        equipped: live === def.id,
        vars: echoLabelVars(def),
      })),
  }));
};

export const echoLockLine = (def: EchoNodeDef): EchoLine => ({
  key: 'run:echo.locked',
  values: { n: def.threshold },
});

export const echoCountLine = (fragments: number): EchoLine => ({
  key: 'run:echo.count',
  values: { n: fragments, max: MEMORY_TOTAL },
});

export const echoRowDef = (
  selected: string | null | undefined,
  fragments: number,
): EchoNodeDef | null => {
  const id = echoEquipped(selected, fragments);
  return id === null ? null : (echoNodeDef(id) ?? null);
};
