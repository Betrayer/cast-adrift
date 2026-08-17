import { defineConfig } from '@playwright/test';
import { createConfig } from './e2e/config';

export default defineConfig(createConfig('e2e-emu'));
