import { test } from '@playwright/test';

export const mailbox = (name: string): string => {
  const info = test.info();
  const project = info.project.name.toLowerCase();
  const repeat = String(info.repeatEachIndex);
  return `${name}-${project}-${repeat}@cast-adrift.test`;
};
