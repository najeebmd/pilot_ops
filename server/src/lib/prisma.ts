import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const url = process.env.DATABASE_URL ?? 'file:./dev.db';
const adapter = new PrismaLibSql({ url });

const prisma = new PrismaClient({ adapter });

export default prisma;
