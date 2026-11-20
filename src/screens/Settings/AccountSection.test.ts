import { describe, expect, it } from "vitest";
import type { AccountInfo } from "@/services/uid";
import { telegramLineFor } from "./AccountSection";

const guestAccount: AccountInfo = {
  uid: "anon123",
  isAnonymous: true,
  providers: [],
  email: null,
};

const telegramAccount: AccountInfo = {
  uid: "tg:42",
  isAnonymous: false,
  providers: ["telegram"],
  email: null,
};

const emailAccount: AccountInfo = {
  uid: "mail77",
  isAnonymous: false,
  providers: ["password"],
  email: "a@b.c",
};

describe("the Telegram identity line", () => {
  it("stays off outside Telegram", () => {
    expect(telegramLineFor(false, telegramAccount, null)).toBeNull();
    expect(telegramLineFor(false, guestAccount, "network")).toBeNull();
  });

  it("says signed in only for an account that carries the Telegram provider", () => {
    expect(telegramLineFor(true, telegramAccount, null)).toEqual({
      kind: "signedIn",
    });
    expect(telegramLineFor(true, telegramAccount, "network")).toEqual({
      kind: "signedIn",
    });
  });

  it("shows nothing for a guest when no exchange failed", () => {
    expect(telegramLineFor(true, guestAccount, null)).toBeNull();
    expect(telegramLineFor(true, null, null)).toBeNull();
  });

  it("names the failure only to a real guest", () => {
    expect(telegramLineFor(true, guestAccount, "badSignature")).toEqual({
      kind: "guest",
      reason: "badSignature",
    });
    expect(telegramLineFor(true, emailAccount, "network")).toBeNull();
  });
});
