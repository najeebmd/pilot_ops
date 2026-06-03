import path from 'node:path';
import { defineConfig } from 'prisma/config';
import { PrismaLibSql } from '@prisma/adapter-libsql';

// SQLite via libsql adapter (Prisma 7+).
// To switch to PostgreSQL: swap provider in schema.prisma, replace adapter with @prisma/adapter-pg,
// and update DATABASE_URL to a postgres:// connection string.

const DB_URL = process.env.DATABASE_URL ?? 'file:./dev.db';

export default defineConfig({
  earlyAccess: true,
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: DB_URL,
  },
  migrate: {
    async adapter() {
      return new PrismaLibSql({ url: DB_URL });
    },
  },
});
