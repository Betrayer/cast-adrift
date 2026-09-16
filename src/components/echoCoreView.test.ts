import { describe, expect, it } from 'vitest';
import {
  echoBranchViews,
  echoCountLine,
  echoLockLine,
  echoRowDef,
} from '@/components/echoCoreView';
import { ECHO_NODES } from '@/data/echo';

const nodeAt = (branch: string, index: number) => {
  const view = echoBranchViews(0, null).find((b) => b.branch === branch);
  return view?.nodes[index];
};

describe('the Echo core board', () => {
  it('lays out three branches of three, each ladder in threshold order', () => {
    const views = echoBranchViews(16, null);
    expect(views.map((b) => b.branch)).toEqual([
      'tactician',
      'navigator',
      'keeper',
    ]);
    expect(views.flatMap((b) => b.nodes)).toHaveLength(ECHO_NODES.length);
    for (const branch of views) {
      const ladder = branch.nodes.map((n) => n.def.threshold);
      expect(ladder).toEqual([...ladder].sort((a, b) => a - b));
      expect(ladder).toHaveLength(3);
    }
  });

  it('lights a node the moment the live count reaches its threshold', () => {
    const opener = nodeAt('tactician', 0);
    expect(opener?.def.threshold).toBe(2);
    expect(echoBranchViews(1, null)[0]?.nodes[0]?.unlocked).toBe(false);
    expect(echoBranchViews(2, null)[0]?.nodes[0]?.unlocked).toBe(true);
    expect(echoBranchViews(15, null)[2]?.nodes[2]?.unlocked).toBe(false);
    expect(echoBranchViews(16, null)[2]?.nodes[2]?.unlocked).toBe(true);
  });

  it('states a locked node threshold in full rather than hinting at it', () => {
    const capstone = echoBranchViews(2, null)[2]?.nodes[2];
    expect(capstone?.unlocked).toBe(false);
    if (capstone === undefined) return;
    const line = echoLockLine(capstone.def);
    expect(line.key).toBe('run:echo.locked');
    expect(line.values).toEqual({ n: capstone.def.threshold });
  });

  it('marks only the equipped node, and only while the count still holds it', () => {
    const lit = echoBranchViews(16, 'veto');
    expect(lit.flatMap((b) => b.nodes).filter((n) => n.equipped)).toHaveLength(1);
    expect(lit[2]?.nodes[2]?.equipped).toBe(true);

    const dropped = echoBranchViews(4, 'veto');
    expect(dropped.flatMap((b) => b.nodes).some((n) => n.equipped)).toBe(false);
    expect(echoRowDef('veto', 4)).toBeNull();
    expect(echoRowDef('veto', 16)?.id).toBe('veto');
    expect(echoRowDef(null, 16)).toBeNull();
  });

  it('carries each node label variable so the arithmetic can interpolate', () => {
    const secondLook = echoBranchViews(16, null)[0]?.nodes[0];
    expect(secondLook?.vars).toEqual({ n: 2 });
    expect(nodeAt('tactician', 1)?.vars).toEqual({});
  });

  it('counts against the sixteen-fragment ceiling', () => {
    expect(echoCountLine(9)).toEqual({
      key: 'run:echo.count',
      values: { n: 9, max: 16 },
    });
  });
});
