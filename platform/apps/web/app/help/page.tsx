export const metadata = { title: "Pusat bantuan" };

const FAQ = [
  ["Bagaimana cara membayar?", "Setelah konfirmasi checkout, kamu diarahkan ke halaman pembayaran Midtrans untuk memilih metode yang tersedia (QRIS, e-wallet, virtual account, kartu). Pesanan diproses setelah pembayaran dikonfirmasi oleh penyedia pembayaran."],
  ["Berapa lama batas pembayaran?", "24 jam. Jika belum dibayar, pesanan batal otomatis dan stok dikembalikan."],
  ["Kapan dana diteruskan ke penjual?", "Setelah pesanan selesai (kamu menekan “Pesanan sudah diterima”, atau otomatis 3 hari setelah barang sampai). Pencairan dilakukan melalui mitra pembayaran berizin."],
  ["Bagaimana cara melacak pesanan?", "Buka Pesanan saya. Setelah penjual mengirim, nomor resi tampil di detail pesanan dan bisa dilacak di situs kurir."],
  ["Apa yang bisa dilakukan Shopia AI?", "Mencarikan produk dari kalimat biasa, memberi rekomendasi dengan alasan, dan membandingkan produk. AI hanya memakai data katalog Shopia dan tidak pernah memesan atau membayar atas namamu."],
  ["Bagaimana cara berjualan?", "Buka menu Mulai berjualan, isi data toko, lalu tunggu persetujuan admin. Setelah aktif, produkmu tampil di katalog."],
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-extrabold">Pusat bantuan</h1>
      <div className="mt-5 divide-y divide-line rounded-2xl border border-line bg-white">
        {FAQ.map(([q, a]) => (
          <details key={q} className="group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
              {q} <span className="text-brand-600 transition group-open:rotate-45">＋</span>
            </summary>
            <p className="mt-2 text-sm text-slate-700">{a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
