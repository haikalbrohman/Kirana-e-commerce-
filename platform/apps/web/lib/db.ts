import "server-only";
import { createPrismaClient, type PrismaClient } from "@shopia/db";

// Satu koneksi untuk seluruh server (hindari koneksi berlipat saat hot-reload)
const g = globalThis as unknown as { shopiaPrisma?: PrismaClient };
export const prisma = g.shopiaPrisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") g.shopiaPrisma = prisma;
