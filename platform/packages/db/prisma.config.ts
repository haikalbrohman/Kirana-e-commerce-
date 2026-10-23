import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // `prisma generate` tidak butuh database; migrate/seed akan gagal jelas jika DATABASE_URL kosong
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
