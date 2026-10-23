import "server-only";
import { SignJWT } from "jose";
import { auth } from "@/auth";

/**
 * Klien API untuk server Next.js.
 * Identitas pengguna dari sesi Auth.js diteruskan ke API sebagai token
 * berumur pendek (5 menit) yang ditandatangani rahasia bersama.
 * Token ini TIDAK pernah dikirim ke browser.
 */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const API_URL = process.env.API_URL ?? "http://localhost:4000";

export async function apiToken(userId: string) {
  const secret = process.env.API_JWT_SECRET;
  if (!secret) throw new Error("API_JWT_SECRET belum diatur");
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer("shopia-web")
    .setAudience("shopia-api")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode(secret));
}

export async function authHeader(): Promise<Record<string, string>> {
  const session = await auth();
  return session?.user?.id ? { Authorization: `Bearer ${await apiToken(session.user.id)}` } : {};
}

/** Panggil API dari Server Component / Server Action / Route Handler. */
export async function api<T>(path: string, init: RequestInit & { anonymous?: boolean } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!init.anonymous) for (const [k, v] of Object.entries(await authHeader())) headers.set(k, v);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const res = await fetch(`${API_URL}/v1${path}`, { ...init, headers, cache: "no-store" });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
    throw new ApiError(res.status, msg ?? "Terjadi kesalahan");
  }
  return data as T;
}

/** Sama seperti api(), tetapi mengembalikan null jika 404 (untuk halaman detail). */
export async function apiOrNull<T>(path: string, init?: RequestInit & { anonymous?: boolean }): Promise<T | null> {
  try {
    return await api<T>(path, init);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export { API_URL };
