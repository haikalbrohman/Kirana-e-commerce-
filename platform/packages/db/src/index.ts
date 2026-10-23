/**
 * @shopia/db — Prisma Client bersama untuk API (NestJS) dan Web (Next.js / Auth.js).
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

export * from "./generated/prisma/client";

/** Buat Prisma Client baru dengan driver adapter PostgreSQL. */
export function createPrismaClient(connectionString = process.env.DATABASE_URL): PrismaClient {
  if (!connectionString) throw new Error("DATABASE_URL belum diatur");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
