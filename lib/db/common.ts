import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "@/lib/generated/prisma/client";
import { getDatabaseEnv } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const pool =
      globalForPrisma.pool ?? new Pool({ connectionString: getDatabaseEnv().DATABASE_URL });
    globalForPrisma.pool = pool;
    globalForPrisma.prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  }
  return globalForPrisma.prisma;
}
