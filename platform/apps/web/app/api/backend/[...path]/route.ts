/**
 * Backend-for-Frontend: semua panggilan API dari browser lewat sini.
 * - Identitas pengguna ditambahkan di server (token tidak pernah ke browser).
 * - Permintaan yang mengubah data harus berasal dari situs ini sendiri (proteksi CSRF).
 */
import { NextResponse, type NextRequest } from "next/server";
import { API_URL, authHeader } from "@/lib/api";

const MAX_BODY = 6 * 1024 * 1024; // foto maks 5 MB + overhead

function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  if (!origin) return site === "same-origin";
  return origin === req.nextUrl.origin || origin === process.env.AUTH_URL;
}

async function proxy(req: NextRequest, ctx: RouteContext<"/api/backend/[...path]">) {
  const { path } = await ctx.params;
  if (path.some((p) => p === ".." || p.includes("\\"))) return NextResponse.json({ message: "Path tidak valid" }, { status: 400 });
  if (req.method !== "GET" && !sameOrigin(req)) return NextResponse.json({ message: "Permintaan ditolak" }, { status: 403 });

  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY) return NextResponse.json({ message: "Ukuran data terlalu besar" }, { status: 413 });

  const headers: Record<string, string> = { ...(await authHeader()) };
  const contentType = req.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;
  // Teruskan IP asli agar pembatasan permintaan (rate limit) di API bekerja per pengguna
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip) headers["X-Forwarded-For"] = ip;

  const url = `${API_URL}/v1/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;
  const res = await fetch(url, {
    method: req.method,
    headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
    cache: "no-store",
  }).catch(() => null);
  if (!res) return NextResponse.json({ message: "Server Shopia sedang tidak dapat dihubungi" }, { status: 503 });

  return new NextResponse(res.body, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json", "Cache-Control": "no-store" },
  });
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
