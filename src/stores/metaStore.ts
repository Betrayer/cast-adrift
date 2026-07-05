import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MetaState = Record<string, never>;

export const META_VERSION = 1;

export const migrateMeta = (persisted: unknown, fromVersion: number): MetaState => {
  if (import.meta.env.DEV) {
    console.info(
      `metaStore: migrating v${String(fromVersion)} -> v${String(META_VERSION)}`,
    );
  }
  return persisted as MetaState;
};

export const useMetaStore = create<MetaState>()(
  persist(() => ({}), {
    name: 'ca.meta',
    version: META_VERSION,
    migrate: migrateMeta,
    partialize: (s) => s,
  }),
);
