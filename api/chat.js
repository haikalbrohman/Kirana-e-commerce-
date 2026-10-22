/* =====================================================================
   SHOPIA AI - SERVER (Vercel Serverless Function)
   ---------------------------------------------------------------------
   File ini OPSIONAL. Dipakai jika ingin Shopia AI ditenagai Claude
   (AI sungguhan) dan bukan AI lokal bawaan.

   Cara pakai:
   1. Deploy repo ini ke Vercel.
   2. Di Vercel -> Settings -> Environment Variables, tambahkan
      ANTHROPIC_API_KEY = (API key dari https://console.anthropic.com)
   3. Di js/data.js ubah CONFIG.aiEndpoint menjadi "/api/chat".

   API key disimpan di server, TIDAK pernah dikirim ke browser.
   ===================================================================== */

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // membaca ANTHROPIC_API_KEY dari environment

// Batas sederhana agar endpoint tidak disalahgunakan
const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY = 10;

function buildSystemPrompt(catalog, store) {
  return `Kamu adalah "Shopia AI", asisten belanja di toko online Shopia (Indonesia).
Gaya bicara: ramah, santai, singkat (maksimal 4-5 kalimat), bahasa Indonesia sehari-hari, boleh pakai emoji secukupnya.

Tugasmu:
- Bantu pembeli menemukan produk yang cocok berdasarkan kebutuhan, budget, dan selera.
- Jawab pertanyaan tentang ongkir, voucher, pembayaran, dan retur memakai data toko di bawah.
- Hanya rekomendasikan produk yang ADA di katalog. Jangan mengarang produk, harga, atau stok.
- Saat merekomendasikan produk, sebutkan ID-nya dengan format [[id]] (contoh: [[p03]]) agar website menampilkan kartu produknya. Maksimal 4 produk.
- Harga ditulis dalam format Rupiah, contoh Rp149.000.
- Jika pertanyaan di luar urusan belanja di Shopia, arahkan kembali dengan sopan.
- Untuk keluhan pesanan atau hal yang butuh admin, sarankan menekan tombol WhatsApp.

Data toko:
- Gratis ongkir Reguler/Hemat untuk belanja minimal Rp${Number(store.freeShippingMin || 0).toLocaleString("id-ID")}.
- Pengiriman: ${JSON.stringify(store.shipping || [])}
- Pembayaran: ${JSON.stringify(store.payments || [])}
- Voucher: ${JSON.stringify(store.vouchers || [])}
- Retur: maksimal 7 hari setelah barang diterima, barang belum dipakai dan label masih ada.

Katalog produk (JSON):
${JSON.stringify(catalog)}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, history = [], catalog = [], store = {} } = req.body || {};
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Pesan kosong" });
    }

    // Susun riwayat chat: hanya peran user/assistant, isi teks, dipotong
    const past = (Array.isArray(history) ? history : [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) }));
    // Percakapan harus diawali pesan user
    while (past.length && past[0].role !== "user") past.shift();

    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 2000,
      // Chat belanja cukup dengan effort rendah: cepat dan hemat
      output_config: { effort: "low" },
      // Jika permintaan ditolak filter keamanan, otomatis dicoba ulang dengan model cadangan
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: buildSystemPrompt(catalog.slice(0, 200), store),
      messages: [...past, { role: "user", content: message.slice(0, MAX_MESSAGE_LENGTH) }],
    });

    if (response.stop_reason === "refusal") {
      return res.status(200).json({ reply: "Maaf, aku tidak bisa membantu untuk itu. Ada produk yang ingin kamu cari? 😊" });
    }

    const reply = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    return res.status(200).json({ reply: reply || "Maaf, coba ulangi pertanyaanmu ya 🙏" });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "Terlalu banyak permintaan, coba lagi sebentar." });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Claude API error:", err.status, err.message);
      return res.status(502).json({ error: "AI sedang tidak tersedia" });
    }
    console.error(err);
    return res.status(500).json({ error: "Terjadi kesalahan server" });
  }
}
