"use client";

/** Panggil API dari browser melalui Backend-for-Frontend (/api/backend). */
export class ClientApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function call<T = unknown>(path: string, init: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const res = await fetch(`/api/backend${path}`, {
    method: init.method ?? (init.body || init.form ? "POST" : "GET"),
    headers: init.form ? undefined : init.body ? { "Content-Type": "application/json" } : undefined,
    body: init.form ?? (init.body ? JSON.stringify(init.body) : undefined),
  }).catch(() => null);
  if (!res) throw new ClientApiError(0, "Tidak ada koneksi internet");
  const text = await res.text();
  let data: { message?: string | string[] } | null = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* bukan JSON */
  }
  if (!res.ok) {
    const msg = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
    if (res.status === 401) throw new ClientApiError(401, "Silakan masuk terlebih dahulu");
    if (res.status === 429) throw new ClientApiError(429, "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.");
    throw new ClientApiError(res.status, msg ?? "Terjadi kesalahan, coba lagi");
  }
  return data as T;
}

/** Kecilkan foto di perangkat sebelum upload (maks 1600px, JPEG) agar cepat & hemat kuota. */
export async function compressImage(file: File, maxSize = 1600, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("Format foto tidak didukung");
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal memproses foto"))), "image/jpeg", quality));
}
