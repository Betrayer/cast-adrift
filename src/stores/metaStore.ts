import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MetaValues {
  codex: string[];
  codexRead: string[];
}

export interface MetaState extends MetaValues {
  unlockCodex: (id: string) => boolean;
  markCodexRead: (id: string) => void;
  markAllCodexRead: () => void;
}

export const META_VERSION = 2;

const createInitialMetaValues = (): MetaValues => ({
  codex: [],
  codexRead: [],
});

export const migrateMeta = (
  persisted: unknown,
  fromVersion: number,
): MetaValues => {
  if (import.meta.env.DEV) {
    console.info(
      `metaStore: migrating v${String(fromVersion)} -> v${String(META_VERSION)}`,
    );
  }
  const prev = (persisted ?? {}) as Partial<MetaValues>;
  return {
    ...createInitialMetaValues(),
    codex: Array.isArray(prev.codex) ? prev.codex : [],
    codexRead: Array.isArray(prev.codexRead) ? prev.codexRead : [],
  };
};

export const useMetaStore = create<MetaState>()(
  persist(
    (set, get) => ({
      ...createInitialMetaValues(),

      unlockCodex: (id) => {
        if (get().codex.includes(id)) return false;
        set((s) => ({ codex: [...s.codex, id] }));
        return true;
      },

      markCodexRead: (id) => {
        set((s) =>
          s.codexRead.includes(id) ? s : { codexRead: [...s.codexRead, id] },
        );
      },

      markAllCodexRead: () => {
        set((s) => ({ codexRead: [...new Set([...s.codexRead, ...s.codex])] }));
      },
    }),
    {
      name: 'ca.meta',
      version: META_VERSION,
      migrate: migrateMeta,
      partialize: (s): MetaValues => ({
        codex: s.codex,
        codexRead: s.codexRead,
      }),
    },
  ),
);
