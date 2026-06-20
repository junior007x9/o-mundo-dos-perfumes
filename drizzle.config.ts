import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'turso', // <--- Mude aqui para 'turso'
  // Apague a linha do "driver"
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});