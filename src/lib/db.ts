import "server-only";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaNodeSqlite } from "@/lib/sqlite-adapter";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function hasNativeQueryEngine(): boolean {
  try {
    const dir = path.join(process.cwd(), "node_modules/.prisma/client");
    return fs.readdirSync(dir).some((f) => f.startsWith("libquery_engine"));
  } catch {
    return false;
  }
}

function createPrisma(): PrismaClient {
  const log = process.env.NODE_ENV === "production" ? (["error"] as const) : (["error", "warn"] as const);
  if (hasNativeQueryEngine()) {
    return new PrismaClient({ log: [...log] });
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL belum diset");
  }
  return new PrismaClient({
    adapter: new PrismaNodeSqlite({ url }),
    log: [...log],
  });
}

export const db = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
