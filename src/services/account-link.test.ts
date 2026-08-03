import { describe, expect, it } from "vitest";
import { resolveLink, shouldAttemptLink, type MetaDoc } from "@/services/account-link";
import { isTelegramUid } from "@/services/uid";

const doc = (updatedAt: number): MetaDoc => ({
  v: 1,
  updatedAt,
  data: JSON.stringify({ level: 1 }),
});

describe("account link policy (DESIGN §4)", () => {
  it("copies the anonymous profile into an empty Telegram one", () => {
    expect(resolveLink(doc(1000), null)).toBe("copied");
  });

  it("keeps the Telegram profile when there is nothing to migrate", () => {
    expect(resolveLink(null, doc(1000))).toBe("kept-telegram");
    expect(resolveLink(null, null)).toBe("kept-telegram");
  });

  it("lets the newer document win, whole", () => {
    expect(resolveLink(doc(2000), doc(1000))).toBe("replaced-telegram");
    expect(resolveLink(doc(1000), doc(2000))).toBe("kept-telegram");
  });

  it("prefers the Telegram side on an exact tie", () => {
    expect(resolveLink(doc(1000), doc(1000))).toBe("kept-telegram");
  });

  it("recognises Telegram uids", () => {
    expect(isTelegramUid("tg:12345")).toBe(true);
    expect(isTelegramUid("aBcD1234")).toBe(false);
    expect(isTelegramUid(null)).toBe(false);
  });

  it("never attempts a link from a uid that is already a Telegram one", () => {
    expect(shouldAttemptLink("tg:12345")).toBe(false);
    expect(shouldAttemptLink(null)).toBe(false);
    expect(shouldAttemptLink("anon-uid")).toBe(true);
  });
});
