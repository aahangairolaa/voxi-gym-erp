import { PrismaClient, type Prisma } from "@prisma/client";

/**
 * One shared Prisma client for the whole app.
 * In development Next.js reloads files often, so we keep the client on
 * `globalThis` to avoid opening hundreds of database connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Neon databases can be far from the server (and pause when idle), so the first
 * connection may take a few seconds. Give connections more time than Prisma's
 * 5-second defaults, unless the URL already sets its own values.
 */
function withTimeouts(url: string | undefined) {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    if (!u.searchParams.has("connect_timeout")) u.searchParams.set("connect_timeout", "15"); // seconds to open a connection
    if (!u.searchParams.has("pool_timeout")) u.searchParams.set("pool_timeout", "20"); // seconds to wait for a free connection
    // On Vercel every server instance opens its own pool; keep it small so a
    // managed Postgres (Azure, Neon …) doesn't run out of connections.
    if (process.env.VERCEL && !u.searchParams.has("connection_limit")) u.searchParams.set("connection_limit", "3");
    return u.toString();
  } catch {
    return url;
  }
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: withTimeouts(process.env.DATABASE_URL),
    // Transactions (selling a membership, recording a payment) get 20s instead of 5s.
    transactionOptions: { maxWait: 10_000, timeout: 20_000 },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/** The type of `tx` inside db.$transaction(async (tx) => …) */
export type Tx = Prisma.TransactionClient;
