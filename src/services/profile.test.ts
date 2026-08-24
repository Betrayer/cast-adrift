import { describe, expect, it } from "vitest";
import {
  ACTIVE_UID_KEY,
  ADOPTED_KEY,
  createMemoryStorage,
  createProfileNamespace,
  SCOPED_SUFFIXES,
} from "@/services/profile";

describe("uid-scoped storage namespace", () => {
  it("falls back to the legacy unscoped keys until a uid is known", () => {
    const ns = createProfileNamespace(createMemoryStorage());
    expect(ns.activeUid()).toBeNull();
    expect(ns.scopedKey("meta")).toBe("ca.meta");
    expect(ns.scopedKey("run.ptr")).toBe("ca.run.ptr");
  });

  it("scopes every key under the active uid", () => {
    const ns = createProfileNamespace(createMemoryStorage());
    ns.setActiveUid("tg:1234");
    expect(ns.scopedKey("meta")).toBe("ca.tg:1234.meta");
    expect(ns.scopedKey("meta.at")).toBe("ca.tg:1234.meta.at");
  });

  it("remembers the active uid across namespace instances", () => {
    const storage = createMemoryStorage();
    createProfileNamespace(storage).setActiveUid("abc");
    expect(storage.getItem(ACTIVE_UID_KEY)).toBe("abc");
    expect(createProfileNamespace(storage).activeUid()).toBe("abc");
  });

  it("adopts the legacy profile into the first authenticated uid", () => {
    const storage = createMemoryStorage();
    storage.setItem("ca.meta", '{"state":{"level":7}}');
    storage.setItem("ca.meta.at", "1000");
    storage.setItem("ca.run.a", "payload");
    storage.setItem("ca.run.ptr", "a");
    storage.setItem("ca.link.at", "999");
    const ns = createProfileNamespace(storage);

    expect(ns.adoptLegacyProfile("uid-a")).toBe(true);

    expect(storage.getItem("ca.uid-a.meta")).toBe('{"state":{"level":7}}');
    expect(storage.getItem("ca.uid-a.meta.at")).toBe("1000");
    expect(storage.getItem("ca.uid-a.run.a")).toBe("payload");
    expect(storage.getItem("ca.uid-a.run.ptr")).toBe("a");
    expect(ns.activeUid()).toBe("uid-a");
    for (const suffix of SCOPED_SUFFIXES) {
      expect(storage.getItem(`ca.${suffix}`)).toBeNull();
    }
    expect(storage.getItem("ca.link.at")).toBeNull();
  });

  it("leaves the device-global settings key alone", () => {
    const storage = createMemoryStorage();
    storage.setItem("ca.settings", '{"state":{"locale":"ru"}}');
    createProfileNamespace(storage).adoptLegacyProfile("uid-a");
    expect(storage.getItem("ca.settings")).toBe('{"state":{"locale":"ru"}}');
  });

  it("lets the scoped copy win when both exist, and still clears the legacy key", () => {
    const storage = createMemoryStorage();
    storage.setItem("ca.meta", "legacy");
    storage.setItem("ca.uid-a.meta", "scoped");
    createProfileNamespace(storage).adoptLegacyProfile("uid-a");
    expect(storage.getItem("ca.uid-a.meta")).toBe("scoped");
    expect(storage.getItem("ca.meta")).toBeNull();
  });

  it("adopts exactly once per device", () => {
    const storage = createMemoryStorage();
    storage.setItem("ca.meta", "first");
    const ns = createProfileNamespace(storage);
    expect(ns.adoptLegacyProfile("uid-a")).toBe(true);
    expect(storage.getItem(ADOPTED_KEY)).toBe("1");

    storage.setItem("ca.meta", "sneaked-back");
    expect(ns.adoptLegacyProfile("uid-b")).toBe(false);
    expect(storage.getItem("ca.uid-b.meta")).toBeNull();
    expect(ns.activeUid()).toBe("uid-b");
  });

  it("keeps the watermark and the payload in the same namespace", () => {
    const storage = createMemoryStorage();
    const ns = createProfileNamespace(storage);
    ns.setActiveUid("uid-a");
    storage.setItem(ns.scopedKey("meta"), "payload-a");
    storage.setItem(ns.scopedKey("meta.at"), "1000");
    ns.setActiveUid("uid-b");
    expect(storage.getItem(ns.scopedKey("meta"))).toBeNull();
    expect(storage.getItem(ns.scopedKey("meta.at"))).toBeNull();
    ns.setActiveUid("uid-a");
    expect(storage.getItem(ns.scopedKey("meta"))).toBe("payload-a");
  });

  it("survives a storage that throws on every access", () => {
    const broken = {
      getItem: (): string | null => {
        throw new Error("blocked");
      },
      setItem: (): void => {
        throw new Error("blocked");
      },
      removeItem: (): void => {
        throw new Error("blocked");
      },
    };
    const ns = createProfileNamespace(broken);
    expect(ns.activeUid()).toBeNull();
    ns.setActiveUid("uid-a");
    expect(ns.activeUid()).toBe("uid-a");
    expect(ns.scopedKey("meta")).toBe("ca.uid-a.meta");
  });
});
