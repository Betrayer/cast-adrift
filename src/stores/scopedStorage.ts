import { createJSONStorage } from 'zustand/middleware';
import type { PersistStorage } from 'zustand/middleware';
import { deviceStorage, scopedKey } from '@/services/profile';

export const scopedPersistStorage = <S,>():
  | PersistStorage<S, unknown>
  | undefined =>
  createJSONStorage<S>(() => ({
    getItem: (name) => deviceStorage.getItem(scopedKey(name)),
    setItem: (name, value) => {
      deviceStorage.setItem(scopedKey(name), value);
    },
    removeItem: (name) => {
      deviceStorage.removeItem(scopedKey(name));
    },
  }));
