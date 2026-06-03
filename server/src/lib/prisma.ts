import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const url = process.env.DATABASE_URL ?? 'file:./dev.db';
const client = createClient({ url });
const adapter = new PrismaLibSQL(client);

const prisma = new PrismaClient({ adapter });

export default prisma;
