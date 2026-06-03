import path from 'node:path';
import { defineConfig } from 'prisma/config';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

// SQLite via libsql adapter (Prisma 7+).
// To switch to PostgreSQL: remove this file's adapter logic and use the pg adapter,
// or set DATABASE_URL to a postgres:// connection string and update schema.prisma provider.

export default defineConfig({
  earlyAccess: true,
  schema: path.join('prisma', 'schema.prisma'),
  migrate: {
    async adapter() {
      const url = process.env.DATABASE_URL ?? 'file:./dev.db';
      const client = createClient({ url: url.replace(/^file:/, 'file:') });
      return new PrismaLibSQL(client);
    },
  },
});
