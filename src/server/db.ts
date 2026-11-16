import { PrismaClient, type Prisma } from "@prisma/client";

/**
 * One shared Prisma client for the whole app.
 * In development Next.js reloads files often, so we keep the client on
 * `globalThis` to avoid opening hundreds of database connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/** The type of `tx` inside db.$transaction(async (tx) => …) */
export type Tx = Prisma.TransactionClient;
