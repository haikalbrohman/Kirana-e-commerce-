import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { api, ApiError } from "./api";
import type { Me } from "./types";

/** Pengguna saat ini (dengan peran dari database lewat API). Di-cache per permintaan. */
export const getMe = cache(async (): Promise<Me | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;
  try {
    return await api<Me>("/me");
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return null;
    throw e;
  }
});

/** Wajib masuk; jika belum, arahkan ke halaman masuk lalu kembali ke halaman semula. */
export async function requireMe(returnTo: string) {
  const me = await getMe();
  if (!me) redirect(`/login?callbackUrl=${encodeURIComponent(returnTo)}`);
  return me;
}

export async function requireRole(role: "SELLER" | "ADMIN", returnTo: string) {
  const me = await requireMe(returnTo);
  if (!me.roles.includes(role)) redirect(role === "SELLER" ? "/seller/open" : "/");
  return me;
}
