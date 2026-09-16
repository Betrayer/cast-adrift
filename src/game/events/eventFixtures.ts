import { EVENT_BY_ID } from "@/data/events";
import type { EventOption } from "@/types/events";

export const must = <T>(value: T | undefined | null, msg: string): T => {
  if (value === undefined || value === null) throw new Error(msg);
  return value;
};

export const optionById = (eventId: string, optionId: string): EventOption => {
  const event = must(EVENT_BY_ID.get(eventId), `event ${eventId}`);
  return must(
    event.options.find((o) => o.id === optionId),
    `${eventId}.${optionId}`,
  );
};
