import type { ActiveActionId, ConsoleShape } from '@/game/battle/view';

export const ACTIVE_ORDER: readonly ActiveActionId[] = [
  'flip',
  'copy',
  'swap',
  'bank',
  'split',
];

const NO_CREW = '|';

const cabinKey = (shape: ConsoleShape): string =>
  shape.cabins.map((def) => def?.id ?? '').join(NO_CREW);

export const growShape = (
  prev: ConsoleShape,
  next: ConsoleShape,
): ConsoleShape => {
  const actives = ACTIVE_ORDER.filter(
    (id) => prev.actives.includes(id) || next.actives.includes(id),
  );
  const fate = prev.fate || next.fate;
  const bloodReactor = prev.bloodReactor || next.bloodReactor;
  const sacrifice = prev.sacrifice || next.sacrifice;
  const passive = prev.passive ?? next.passive;
  const crewArrived =
    cabinKey(prev) === NO_CREW && cabinKey(next) !== NO_CREW;
  const cabins = crewArrived ? next.cabins : prev.cabins;
  const echo = prev.echo ?? next.echo;
  if (
    fate === prev.fate &&
    bloodReactor === prev.bloodReactor &&
    sacrifice === prev.sacrifice &&
    passive === prev.passive &&
    actives.length === prev.actives.length &&
    cabins === prev.cabins &&
    echo === prev.echo
  ) {
    return prev;
  }
  return { fate, bloodReactor, sacrifice, passive, actives, cabins, echo };
};
