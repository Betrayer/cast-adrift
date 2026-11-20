import { describe, expect, it } from "vitest";
import { missingEnvNames } from "../../api/telegram-auth";

const FULL = {
  CA_TG_BOT_TOKEN: "123:abc",
  FIREBASE_PROJECT_ID: "cast-adrift",
  FIREBASE_CLIENT_EMAIL: "bot@cast-adrift.iam.gserviceaccount.com",
  FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----",
};

describe("the telegram-auth probe names what is missing and nothing else", () => {
  it("reports an empty list when all four names carry a value", () => {
    expect(missingEnvNames(FULL)).toEqual([]);
  });

  it("names every unset variable in the order the endpoint reads them", () => {
    expect(missingEnvNames({})).toEqual([
      "CA_TG_BOT_TOKEN",
      "FIREBASE_PROJECT_ID",
      "FIREBASE_CLIENT_EMAIL",
      "FIREBASE_PRIVATE_KEY",
    ]);
  });

  it("counts a blank or whitespace value as missing", () => {
    expect(missingEnvNames({ ...FULL, CA_TG_BOT_TOKEN: "   " })).toEqual([
      "CA_TG_BOT_TOKEN",
    ]);
    expect(missingEnvNames({ ...FULL, FIREBASE_PRIVATE_KEY: "" })).toEqual([
      "FIREBASE_PRIVATE_KEY",
    ]);
  });

  it("never returns a value, only a name", () => {
    const missing = missingEnvNames({ ...FULL, FIREBASE_CLIENT_EMAIL: "" });
    for (const name of missing) {
      expect(Object.values(FULL)).not.toContain(name);
    }
  });
});
