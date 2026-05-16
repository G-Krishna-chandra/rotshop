import type { Config } from 'drizzle-kit';
import { config as appConfig } from './src/config.js';

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: appConfig.databaseUrl,
  },
} satisfies Config;
