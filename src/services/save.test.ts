import { describe, expect, it, vi } from 'vitest';
import { fnv1a } from '@/services/rng';
import {
  createMemoryStorage,
  createSaveService,
  RUN_SAVE_V,
} from '@/services/save';

describe('save service', () => {
  it('round-trips a snapshot', () => {
    const save = createSaveService(createMemoryStorage());
    save.saveRunSnapshot({ sector: 2, hull: 17 });
    expect(save.loadRunSnapshot()).toEqual({ sector: 2, hull: 17 });
  });

  it('returns null when nothing was saved', () => {
    const save = createSaveService(createMemoryStorage());
    expect(save.loadRunSnapshot()).toBeNull();
    expect(save.hasRun()).toBe(false);
  });

  it('survives corruption of the active slot by falling back to the previous snapshot', () => {
    const storage = createMemoryStorage();
    const save = createSaveService(storage);
    save.saveRunSnapshot({ turn: 1 });
    save.saveRunSnapshot({ turn: 2 });
    const activeSlot = storage.getItem('ca.run.ptr') === 'b' ? 'ca.run.b' : 'ca.run.a';
    const raw = storage.getItem(activeSlot);
    if (raw === null) throw new Error('active slot missing');
    const payload = JSON.parse(raw) as { data: string };
    payload.data = payload.data.replace('2', '9');
    storage.setItem(activeSlot, JSON.stringify(payload));
    expect(save.loadRunSnapshot()).toEqual({ turn: 1 });
  });

  it('returns null when both slots are corrupt', () => {
    const storage = createMemoryStorage();
    const save = createSaveService(storage);
    save.saveRunSnapshot({ turn: 1 });
    save.saveRunSnapshot({ turn: 2 });
    storage.setItem('ca.run.a', 'garbage');
    storage.setItem('ca.run.b', 'garbage');
    expect(save.loadRunSnapshot()).toBeNull();
  });

  it('never touches the previous slot on save', () => {
    const storage = createMemoryStorage();
    const save = createSaveService(storage);
    save.saveRunSnapshot({ turn: 1 });
    const firstSlot = storage.getItem('ca.run.ptr') === 'b' ? 'ca.run.b' : 'ca.run.a';
    const firstRaw = storage.getItem(firstSlot);
    save.saveRunSnapshot({ turn: 2 });
    expect(storage.getItem(firstSlot)).toBe(firstRaw);
  });

  it('throws and keeps the pointer when write verification fails', () => {
    const storage = createMemoryStorage();
    const broken = {
      getItem: (key: string) => storage.getItem(key),
      setItem: (key: string, value: string) => {
        if (key === 'ca.run.ptr') storage.setItem(key, value);
      },
      removeItem: (key: string) => {
        storage.removeItem(key);
      },
    };
    const save = createSaveService(broken);
    expect(() => {
      save.saveRunSnapshot({ turn: 1 });
    }).toThrow();
    expect(storage.getItem('ca.run.ptr')).toBeNull();
  });

  it('runs the migration path 0 -> current on load', () => {
    const storage = createMemoryStorage();
    const migration = vi.fn((data: unknown) => ({
      ...(data as Record<string, unknown>),
      migrated: true,
    }));
    const data = JSON.stringify({ legacy: true });
    storage.setItem(
      'ca.run.a',
      JSON.stringify({ v: 0, savedAt: 1, checksum: fnv1a(data), data }),
    );
    const save = createSaveService(storage, { 0: migration });
    expect(save.loadRunSnapshot()).toEqual({ legacy: true, migrated: true });
    expect(migration).toHaveBeenCalledTimes(1);
  });

  it('rejects payloads written by a newer save version', () => {
    const storage = createMemoryStorage();
    const data = JSON.stringify({ future: true });
    storage.setItem(
      'ca.run.a',
      JSON.stringify({ v: RUN_SAVE_V + 1, savedAt: 1, checksum: fnv1a(data), data }),
    );
    const save = createSaveService(storage);
    expect(save.loadRunSnapshot()).toBeNull();
  });

  it('falls back to the other slot when a migration step throws', () => {
    const storage = createMemoryStorage();
    const save = createSaveService(storage);
    save.saveRunSnapshot({ turn: 1 });
    const data = JSON.stringify({ legacy: true });
    const inactiveSlot =
      storage.getItem('ca.run.ptr') === 'b' ? 'ca.run.a' : 'ca.run.b';
    storage.setItem(
      inactiveSlot,
      JSON.stringify({ v: 0, savedAt: 1, checksum: fnv1a(data), data }),
    );
    storage.setItem('ca.run.ptr', inactiveSlot === 'ca.run.a' ? 'a' : 'b');
    const throwingStep = vi.fn(() => {
      throw new Error('broken migration');
    });
    const migratingSave = createSaveService(storage, { 0: throwingStep });
    expect(migratingSave.loadRunSnapshot()).toEqual({ turn: 1 });
    expect(throwingStep).toHaveBeenCalledTimes(1);
  });

  it('returns null when a migration step is missing', () => {
    const storage = createMemoryStorage();
    const data = JSON.stringify({ legacy: true });
    storage.setItem(
      'ca.run.a',
      JSON.stringify({ v: -1, savedAt: 1, checksum: fnv1a(data), data }),
    );
    const save = createSaveService(storage, {});
    expect(save.loadRunSnapshot()).toBeNull();
  });

  it('clearRun removes everything', () => {
    const save = createSaveService(createMemoryStorage());
    save.saveRunSnapshot({ turn: 1 });
    expect(save.hasRun()).toBe(true);
    save.clearRun();
    expect(save.hasRun()).toBe(false);
  });

  it('writes payloads at the current save version', () => {
    const storage = createMemoryStorage();
    const save = createSaveService(storage);
    save.saveRunSnapshot({ turn: 1 });
    const activeSlot = storage.getItem('ca.run.ptr') === 'b' ? 'ca.run.b' : 'ca.run.a';
    const raw = storage.getItem(activeSlot);
    if (raw === null) throw new Error('active slot missing');
    const payload = JSON.parse(raw) as { v: number };
    expect(payload.v).toBe(RUN_SAVE_V);
  });
});
