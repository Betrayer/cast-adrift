import { beforeEach, describe, expect, it } from "vitest";
import {
  abandonClaim,
  claimProfile,
  clearClaim,
  decideClaim,
  hasLinkMarker,
  linkMarkerKey,
  mergePromptFor,
  planProviderAttach,
  readClaim,
  resolveLink,
  shouldHandOver,
  stashClaim,
  switchAbandonsProfile,
  type PendingClaim,
} from "@/services/account-link";
import { ownBoardIds } from "@/services/leaderboards";
import { profileSummary, type MetaDoc, type MetaDocPort } from "@/services/metaDoc";
import { deviceStorage } from "@/services/profile";
import { isTelegramUid, type AccountInfo } from "@/services/uid";

const doc = (updatedAt: number, values: Record<string, unknown> = {}): MetaDoc => ({
  v: 1,
  updatedAt,
  data: JSON.stringify({ level: 4, shards: 120, stats: { runs: 7 }, ...values }),
});

const emptyDoc = (updatedAt: number): MetaDoc => ({
  v: 1,
  updatedAt,
  data: JSON.stringify({ level: 1, shards: 0, stats: { runs: 0 } }),
});

const claimOf = (sourceUid: string, meta: MetaDoc | null): PendingClaim => ({
  sourceUid,
  meta,
  boards: ["drift-alltime"],
});

const account = (
  uid: string,
  providers: AccountInfo["providers"],
  email: string | null = null,
): AccountInfo => ({
  uid,
  isAnonymous: providers.length === 0,
  providers,
  email,
});

interface FakeStore {
  port: MetaDocPort;
  docs: Map<string, MetaDoc>;
  archives: string[];
}

const fakeStore = (seed: Record<string, MetaDoc> = {}): FakeStore => {
  const docs = new Map<string, MetaDoc>(Object.entries(seed));
  const archives: string[] = [];
  return {
    docs,
    archives,
    port: {
      read: (uid) => Promise.resolve(docs.get(uid) ?? null),
      write: (uid, value) => {
        docs.set(uid, value);
        return Promise.resolve();
      },
      archive: (uid, value, at) => {
        archives.push(`${uid}/backup-${String(at)}:${String(value.updatedAt)}`);
        return Promise.resolve();
      },
    },
  };
};

const dropMarkers = (): void => {
  for (const pair of [
    ["guest-1", "google-1"],
    ["guest-2", "google-2"],
    ["guest-3", "tg:900"],
    ["google-5", "tg:500"],
    ["src", "dst"],
  ] as const) {
    deviceStorage.removeItem(linkMarkerKey(pair[0], pair[1]));
  }
  clearClaim();
};

describe("merge policy (DESIGN §4.2)", () => {
  it("copies the source profile into an absent target", () => {
    expect(resolveLink(doc(1000), null)).toBe("copied");
  });

  it("keeps the target when there is nothing to migrate", () => {
    expect(resolveLink(null, doc(1000))).toBe("kept-target");
    expect(resolveLink(null, null)).toBe("kept-target");
  });

  it("lets the newer document win, whole", () => {
    expect(resolveLink(doc(2000), doc(1000))).toBe("replaced-target");
    expect(resolveLink(doc(1000), doc(2000))).toBe("kept-target");
  });

  it("prefers the target on an exact tie", () => {
    expect(resolveLink(doc(1000), doc(1000))).toBe("kept-target");
  });

  it("recognises Telegram uids", () => {
    expect(isTelegramUid("tg:12345")).toBe(true);
    expect(isTelegramUid("aBcD1234")).toBe(false);
    expect(isTelegramUid(null)).toBe(false);
  });

  it("never hands a Telegram profile over to another Telegram sign-in", () => {
    expect(shouldHandOver("tg:12345")).toBe(false);
    expect(shouldHandOver(null)).toBe(false);
    expect(shouldHandOver("anon-uid")).toBe(true);
  });
});

describe("claim decision", () => {
  it("has nothing to claim when the source profile is untouched", () => {
    expect(decideClaim(emptyDoc(9000), doc(1000)).kind).toBe("nothing-to-claim");
    expect(decideClaim(null, doc(1000)).kind).toBe("nothing-to-claim");
  });

  it("counts a board score as progress worth reconciling", () => {
    const onlyBoards: MetaDoc = {
      v: 1,
      updatedAt: 9000,
      data: JSON.stringify({
        level: 1,
        shards: 0,
        stats: { runs: 0 },
        best: { drift: 1500 },
      }),
    };
    expect(decideClaim(onlyBoards, doc(1000)).kind).toBe("prompt");

    const onlyDaily: MetaDoc = {
      v: 1,
      updatedAt: 9000,
      data: JSON.stringify({
        level: 1,
        shards: 0,
        stats: { runs: 0 },
        dailyPlayed: { "2026-08-17": { state: "done", score: 40, rank: null } },
      }),
    };
    expect(decideClaim(onlyDaily, doc(1000)).kind).toBe("prompt");
  });

  it("copies without asking into an absent or untouched target", () => {
    expect(decideClaim(doc(1000), null).kind).toBe("copy");
    expect(decideClaim(doc(1000), emptyDoc(9000)).kind).toBe("copy");
  });

  it("never resolves two real profiles silently", () => {
    expect(decideClaim(doc(2000), doc(1000))).toEqual({
      kind: "prompt",
      recommended: "source",
    });
    expect(decideClaim(doc(1000), doc(2000))).toEqual({
      kind: "prompt",
      recommended: "target",
    });
  });
});

describe("provider attach plan", () => {
  it("signs in when nobody is signed in", () => {
    expect(planProviderAttach(null, "google")).toBe("sign-in");
  });

  it("links onto a guest and onto a Telegram user alike", () => {
    expect(planProviderAttach(account("guest-1", []), "google")).toBe("link");
    expect(planProviderAttach(account("tg:900", ["telegram"]), "google")).toBe(
      "link",
    );
    expect(planProviderAttach(account("tg:900", ["telegram"]), "password")).toBe(
      "link",
    );
  });

  it("does nothing when the provider is already attached", () => {
    expect(
      planProviderAttach(account("u", ["telegram", "google"]), "google"),
    ).toBe("already-linked");
  });
});

describe("claim executor", () => {
  beforeEach(dropMarkers);

  it("copies into an absent target and stamps linkedFrom", async () => {
    const store = fakeStore();
    const claim = claimOf("src", doc(1000));
    stashClaim(claim);

    const result = await claimProfile(claim, "dst", store.port);

    expect(result.outcome).toBe("copied");
    expect(store.docs.get("dst")?.linkedFrom).toBe("src");
    expect(store.docs.get("dst")?.data).toBe(claim.meta?.data);
    expect(store.archives).toHaveLength(0);
    expect(hasLinkMarker("src", "dst")).toBe(true);
    expect(readClaim()).toBeNull();
  });

  it("archives the loser instead of deleting it", async () => {
    const store = fakeStore({ dst: doc(500, { level: 9 }) });
    const claim = claimOf("src", doc(1000));

    const result = await claimProfile(claim, "dst", store.port);

    expect(result.outcome).toBe("replaced-target");
    expect(store.archives).toHaveLength(1);
    expect(store.archives[0]).toContain("dst/backup-");
    expect(store.docs.get("dst")?.data).toBe(claim.meta?.data);
  });

  it("reports failure and keeps the claim when the store rejects the write", async () => {
    const store = fakeStore();
    const broken: MetaDocPort = {
      ...store.port,
      write: () => Promise.reject(new Error("offline")),
    };
    const claim = claimOf("src", doc(1000));
    stashClaim(claim);

    const result = await claimProfile(claim, "dst", broken);

    expect(result.outcome).toBe("failed");
    expect(hasLinkMarker("src", "dst")).toBe(false);
    expect(readClaim()?.sourceUid).toBe("src");
  });

  it("marks the pair done when the player keeps the target", () => {
    const claim = claimOf("src", doc(1000));
    stashClaim(claim);
    abandonClaim(claim, "dst");
    expect(hasLinkMarker("src", "dst")).toBe(true);
    expect(readClaim()).toBeNull();
  });

  it("round-trips a stashed claim through device storage", () => {
    stashClaim({ sourceUid: "src", meta: doc(77), boards: ["daily-2026-08-17"] });
    const restored = readClaim();
    expect(restored?.sourceUid).toBe("src");
    expect(restored?.meta?.updatedAt).toBe(77);
    expect(restored?.boards).toEqual(["daily-2026-08-17"]);
  });
});

describe("identity matrix (DESIGN §4.2)", () => {
  beforeEach(dropMarkers);

  it("row 1 — guest adds a provider: link, uid unchanged", () => {
    const guest = account("guest-1", []);
    expect(planProviderAttach(guest, "google")).toBe("link");
    expect(switchAbandonsProfile(guest.uid, guest.uid)).toBe(false);
  });

  it("row 2 — guest with progress signs into an existing account: merge card", () => {
    const guest = account("guest-2", []);
    expect(switchAbandonsProfile(guest.uid, "google-2")).toBe(true);
    expect(decideClaim(doc(2000), doc(1000))).toEqual({
      kind: "prompt",
      recommended: "source",
    });
  });

  it("row 3 — Telegram user adds a provider: link onto the tg uid", () => {
    const tg = account("tg:900", ["telegram"]);
    expect(planProviderAttach(tg, "password")).toBe("link");
    expect(switchAbandonsProfile(tg.uid, tg.uid)).toBe(false);
  });

  it("row 4 — a provider already linked to a tg user resolves to the tg uid", () => {
    const tg = account("tg:900", ["telegram", "google"]);
    expect(planProviderAttach(tg, "google")).toBe("already-linked");
    expect(switchAbandonsProfile(tg.uid, tg.uid)).toBe(false);
  });

  it("row 5 — Telegram supersedes another account on the device", async () => {
    expect(shouldHandOver("google-5")).toBe(true);
    expect(switchAbandonsProfile("google-5", "tg:500")).toBe(true);

    const store = fakeStore();
    const claim = claimOf("google-5", doc(1000));
    expect(decideClaim(claim.meta, null).kind).toBe("copy");
    const copied = await claimProfile(claim, "tg:500", store.port);
    expect(copied.outcome).toBe("copied");
    expect(store.docs.get("tg:500")?.linkedFrom).toBe("google-5");

    expect(decideClaim(doc(3000), doc(1000)).kind).toBe("prompt");
  });

  it("row 6 — a guest inside Telegram stays a guest", () => {
    expect(shouldHandOver(null)).toBe(false);
    expect(decideClaim(null, null).kind).toBe("nothing-to-claim");
  });
});

describe("merge prompt summaries", () => {
  it("shows level, shards and last-played for both sides", () => {
    const prompt = mergePromptFor(
      "src",
      "dst",
      doc(2000, { level: 12, shards: 340, stats: { runs: 41 } }),
      doc(1000, { level: 3, shards: 10, stats: { runs: 2 } }),
      "source",
    );
    expect(prompt.source).toEqual({
      level: 12,
      shards: 340,
      runs: 41,
      driftBest: 0,
      dailies: 0,
      updatedAt: 2000,
    });
    expect(prompt.target.level).toBe(3);
    expect(prompt.recommended).toBe("source");
  });

  it("summarises a malformed document without throwing", () => {
    expect(profileSummary({ v: 1, updatedAt: 5, data: "not json" })).toEqual({
      level: 1,
      shards: 0,
      runs: 0,
      driftBest: 0,
      dailies: 0,
      updatedAt: 5,
    });
  });
});

describe("own board rows", () => {
  it("lists only the boards this profile actually touched", () => {
    expect(
      ownBoardIds({ driftBest: 0, driftWeek: null, dailyDates: [] }),
    ).toEqual([]);
    expect(
      ownBoardIds({
        driftBest: 4200,
        driftWeek: "2026-W33",
        dailyDates: ["2026-08-16", "2026-08-17"],
      }),
    ).toEqual([
      "drift-alltime",
      "drift-weekly-2026-W33",
      "daily-2026-08-16",
      "daily-2026-08-17",
    ]);
  });
});
