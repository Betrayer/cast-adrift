import type { TFunction } from "i18next";
import { cargoName } from "@/data/cargo";
import { BEACON_FLAGS } from "@/data/events/beacons";
import { achievementTitleById } from "@/game/meta/achievements";
import type { JournalEntry } from "@/game/run/journal";
import { SUPPORT_EMAIL } from "@/services/support";

export const journalEntryText = (
  entry: JournalEntry,
  t: TFunction<["run", "content", "battle", "settings"]>,
): string => {
  switch (entry.k) {
    case "choice":
      return t(entry.text);
    case "consequence":
      return t(entry.origin);
    case "chain":
      return t(entry.label);
    case "beacon":
      return t("run:journal.beacon", { n: entry.resolved, max: BEACON_FLAGS.length });
    case "memory":
      return t("run:journal.memory", { n: entry.order });
    case "achievement":
      return t("run:journal.achievement", {
        name: achievementTitleById(entry.achievement, t),
      });
    case "axis":
      return t(`run:journal.axis.${entry.source}`, {
        from: entry.from,
        to: entry.to,
      });
    case "wormhole":
      return t(`run:journal.wormhole.${entry.branch}`, {
        rows: Math.abs(entry.rows),
        way: t(`run:journal.wormholeWay.${entry.direction}`),
      });
    case "cargo":
      return t(`run:journal.cargo.${entry.step}`, {
        name: t(cargoName(entry.cargo)),
        n: entry.n,
      });
    case "singularity":
      return t("run:journal.singularity");
    case "bark":
      return t(entry.line);
    case "system":
      return t(entry.line, { email: SUPPORT_EMAIL });
  }
};
