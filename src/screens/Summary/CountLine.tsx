import type { RefObject } from "react";
import { splitAtCountMark, type SummaryCountId } from "./countSequence";

export const CountSlot = ({
  id,
  target,
  slot,
}: {
  id: SummaryCountId;
  target: number;
  slot: RefObject<HTMLSpanElement | null>;
}) => <span ref={slot} data-summary-count={id} data-summary-target={target} />;

export const CountLine = ({
  text,
  id,
  target,
  slot,
}: {
  text: string;
  id: SummaryCountId;
  target: number;
  slot: RefObject<HTMLSpanElement | null>;
}) => {
  const { before, after } = splitAtCountMark(text);
  return (
    <>
      {before}
      <CountSlot id={id} target={target} slot={slot} />
      {after}
    </>
  );
};
