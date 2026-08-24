import { beforeEach, describe, expect, it } from "vitest";
import { clearBackGuards, registerBackGuard } from "@/app/backGuard";
import {
  installNavHistory,
  readNavRecord,
  type HistoryLike,
  type NavHost,
} from "@/services/nav-history";
import { ROOT_SCREEN, useAppStore } from "@/stores/appStore";

interface FakeHost extends NavHost {
  entries: unknown[];
  index: number;
  exited: boolean;
  pop: () => void;
  forward: () => void;
}

const createHost = (initial: unknown = null): FakeHost => {
  const listeners = new Set<(event: { state: unknown }) => void>();
  const entries: unknown[] = [initial];
  const host = {
    entries,
    index: 0,
    exited: false,
    history: {
      get state(): unknown {
        return entries[host.index];
      },
      pushState: (data: unknown) => {
        entries.length = host.index + 1;
        entries.push(data);
        host.index += 1;
      },
      replaceState: (data: unknown) => {
        entries[host.index] = data;
      },
      back: () => {
        host.pop();
      },
    } as HistoryLike,
    addEventListener: (
      _type: "popstate",
      handler: (event: { state: unknown }) => void,
    ) => {
      listeners.add(handler);
    },
    removeEventListener: (
      _type: "popstate",
      handler: (event: { state: unknown }) => void,
    ) => {
      listeners.delete(handler);
    },
    pop: () => {
      if (host.index === 0) {
        host.exited = true;
        return;
      }
      host.index -= 1;
      for (const listener of listeners) listener({ state: entries[host.index] });
    },
    forward: () => {
      if (host.index >= entries.length - 1) return;
      host.index += 1;
      for (const listener of listeners) listener({ state: entries[host.index] });
    },
  };
  return host;
};

const reset = (): void => {
  clearBackGuards();
  useAppStore.setState({
    screen: ROOT_SCREEN,
    params: undefined,
    stack: [],
    systemMenu: false,
  });
};

describe("browser history mirror", () => {
  beforeEach(reset);

  it("pushes one entry per forward navigation and pops back in step", () => {
    const host = createHost();
    const uninstall = installNavHistory(host);

    useAppStore.getState().go("modes");
    useAppStore.getState().go("leaderboard", { tab: "daily" });
    expect(host.entries.length).toBe(3);
    expect(host.index).toBe(2);

    host.pop();
    expect(useAppStore.getState().screen).toBe("modes");
    expect(host.index).toBe(1);

    host.pop();
    expect(useAppStore.getState().screen).toBe("menu");
    expect(host.index).toBe(0);

    uninstall();
  });

  it("keeps the browser depth in step when the app goes back itself", () => {
    const host = createHost();
    const uninstall = installNavHistory(host);

    useAppStore.getState().go("modes");
    useAppStore.getState().go("profile");
    expect(host.index).toBe(2);

    useAppStore.getState().back();
    expect(useAppStore.getState().screen).toBe("modes");
    expect(host.index).toBe(1);
    expect(readNavRecord(host.history.state)?.screen).toBe("modes");

    uninstall();
  });

  it("restores params through a browser back", () => {
    const host = createHost();
    const uninstall = installNavHistory(host);

    useAppStore.getState().go("leaderboard", { tab: "daily" });
    useAppStore.getState().go("profile");
    host.pop();

    expect(useAppStore.getState().screen).toBe("leaderboard");
    expect(useAppStore.getState().params).toEqual({ tab: "daily" });

    uninstall();
  });

  it("re-pushes and runs the guard when back is intercepted", () => {
    const host = createHost();
    const uninstall = installNavHistory(host);
    useAppStore.getState().go("map");
    useAppStore.getState().go("shop");
    const depth = host.index;

    let left = 0;
    registerBackGuard("shop", () => {
      left += 1;
    });
    host.pop();

    expect(left).toBe(1);
    expect(useAppStore.getState().screen).toBe("shop");
    expect(host.index).toBe(depth);

    uninstall();
  });

  it("holds a locked screen in place against the browser button", () => {
    const host = createHost();
    const uninstall = installNavHistory(host);
    useAppStore.getState().go("map");
    useAppStore.getState().go("battle");
    const depth = host.index;

    host.pop();
    expect(useAppStore.getState().screen).toBe("battle");
    expect(host.index).toBe(depth);

    uninstall();
  });

  it("replays a forward step instead of treating it as another back", () => {
    const host = createHost();
    const uninstall = installNavHistory(host);

    useAppStore.getState().go("modes");
    useAppStore.getState().go("contracts");
    host.pop();
    expect(useAppStore.getState().screen).toBe("modes");

    host.forward();
    expect(useAppStore.getState().screen).toBe("contracts");
    expect(host.exited).toBe(false);

    uninstall();
  });

  it("never walks off the first entry when a deep link seeds a stack", () => {
    const host = createHost();
    const uninstall = installNavHistory(host);

    useAppStore
      .getState()
      .seed(
        [
          { screen: "menu", params: undefined },
          { screen: "modes", params: undefined },
        ],
        "leaderboard",
        { tab: "drift" },
      );
    useAppStore.getState().back();
    expect(useAppStore.getState().screen).toBe("modes");
    useAppStore.getState().back();
    expect(useAppStore.getState().screen).toBe("menu");
    expect(host.exited).toBe(false);

    uninstall();
  });

  it("rehydrates a meta screen and its stack after a reload", () => {
    const first = createHost();
    const uninstallFirst = installNavHistory(first);
    useAppStore.getState().go("hangar");
    useAppStore.getState().go("collection");
    const saved = first.history.state;
    uninstallFirst();
    reset();

    const second = createHost(saved);
    const uninstallSecond = installNavHistory(second);
    expect(useAppStore.getState().screen).toBe("collection");
    useAppStore.getState().back();
    expect(useAppStore.getState().screen).toBe("hangar");
    useAppStore.getState().back();
    expect(useAppStore.getState().screen).toBe("menu");

    uninstallSecond();
  });

  it("drops a run screen on reload instead of resuming into a dead run", () => {
    const first = createHost();
    const uninstallFirst = installNavHistory(first);
    useAppStore.getState().go("map");
    useAppStore.getState().go("shop");
    const saved = first.history.state;
    uninstallFirst();
    reset();

    const second = createHost(saved);
    const uninstallSecond = installNavHistory(second);
    expect(useAppStore.getState().screen).toBe("menu");
    uninstallSecond();
  });
});
