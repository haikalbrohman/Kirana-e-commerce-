export const metadata = { title: "Kebijakan privasi" };

/** Ringkasan kebijakan privasi. Tinjau bersama penasihat hukum sebelum peluncuran (UU No. 27/2022 tentang Pelindungan Data Pribadi). */
export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-extrabold">Kebijakan privasi</h1>
      <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Draf ringkas. Wajib ditinjau penasihat hukum sebelum Shopia diluncurkan untuk publik.</p>
      <div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-700">
        <section><h2 className="mb-1 font-bold text-ink">Data yang kami kumpulkan</h2><p>Nama dan email untuk akun; alamat & nomor HP untuk pengiriman; riwayat pesanan; serta produk yang kamu lihat untuk rekomendasi. Kami tidak menyimpan data kartu atau rekening; pembayaran diproses oleh Midtrans.</p></section>
        <section><h2 className="mb-1 font-bold text-ink">Untuk apa data dipakai</h2><p>Memproses pesanan, mengirim barang, mencegah penipuan, dan memberi rekomendasi. Alamat pengiriman hanya dibagikan ke penjual dari pesananmu.</p></section>
        <section><h2 className="mb-1 font-bold text-ink">Shopia AI</h2><p>Pesan ke asisten diproses oleh penyedia AI untuk menjawab pertanyaanmu. Shopia hanya mencatat metadata penggunaan (waktu, jumlah token), bukan isi percakapan. Jangan menuliskan data sensitif di chat.</p></section>
        <section><h2 className="mb-1 font-bold text-ink">Hak kamu</h2><p>Kamu berhak mengakses, memperbaiki, dan meminta penghapusan data pribadimu sesuai UU Pelindungan Data Pribadi. Hubungi admin Shopia untuk permintaan tersebut.</p></section>
        <section><h2 className="mb-1 font-bold text-ink">Penyimpanan</h2><p>Data pesanan disimpan selama diperlukan untuk kewajiban hukum dan perpajakan; data lain dihapus atau dianonimkan ketika tidak lagi diperlukan.</p></section>
      </div>
    </div>
  );
}
