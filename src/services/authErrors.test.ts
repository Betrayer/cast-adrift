import { describe, expect, it } from "vitest";
import {
  authErrorCode,
  firebaseErrorCode,
  isSilentAuthError,
  takesOverIdentity,
} from "@/services/authErrors";

describe("auth error mapping", () => {
  it("reads the firebase error code off an error object", () => {
    expect(firebaseErrorCode({ code: "auth/popup-blocked" })).toBe(
      "auth/popup-blocked",
    );
    expect(firebaseErrorCode(new Error("plain"))).toBeNull();
    expect(firebaseErrorCode(null)).toBeNull();
    expect(firebaseErrorCode("auth/popup-blocked")).toBeNull();
  });

  it("maps the codes the account surface has to explain", () => {
    expect(authErrorCode({ code: "auth/wrong-password" })).toBe("wrongPassword");
    expect(authErrorCode({ code: "auth/invalid-credential" })).toBe(
      "wrongPassword",
    );
    expect(authErrorCode({ code: "auth/email-already-in-use" })).toBe(
      "emailInUse",
    );
    expect(authErrorCode({ code: "auth/network-request-failed" })).toBe(
      "network",
    );
    expect(authErrorCode({ code: "auth/operation-not-allowed" })).toBe(
      "providerDisabled",
    );
  });

  it("falls back to unknown rather than leaking a raw code", () => {
    expect(authErrorCode({ code: "auth/some-future-thing" })).toBe("unknown");
    expect(authErrorCode(new Error("offline"))).toBe("unknown");
  });

  it("knows which failures mean another user already owns the credential", () => {
    expect(takesOverIdentity(authErrorCode({ code: "auth/credential-already-in-use" }))).toBe(true);
    expect(takesOverIdentity(authErrorCode({ code: "auth/email-already-in-use" }))).toBe(true);
    expect(takesOverIdentity(authErrorCode({ code: "auth/wrong-password" }))).toBe(false);
  });

  it("keeps a cancelled popup silent", () => {
    expect(isSilentAuthError(authErrorCode({ code: "auth/popup-closed-by-user" }))).toBe(true);
    expect(isSilentAuthError(authErrorCode({ code: "auth/popup-blocked" }))).toBe(false);
  });
});
