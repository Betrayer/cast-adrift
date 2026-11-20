export interface LayoutVerdict {
  line: string;
  exitCode: 0 | 1;
}

export const layoutVerdict = (
  shots: readonly { error: string | null }[],
  sidecarCount: number,
  out: string,
): LayoutVerdict => {
  const errors = shots.filter((shot) => shot.error !== null).length;
  return {
    line: `layoutSheet: ${String(shots.length)} shots taken, ${String(errors)} errors, ${String(sidecarCount)} in the sidecar → ${out}`,
    exitCode: errors > 0 ? 1 : 0,
  };
};
