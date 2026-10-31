# 🤍 Kirana — Asisten AI Pribadi (AI Agent)

Versi AI agent dari aplikasi Streamlit Kirana. Selain menu lama (Beranda, Daftar Tugas,
Catatan Harian, Saran Singkat), ada menu **🤖 Ngobrol dengan Kirana**: kamu cukup mengetik
bahasa sehari-hari, dan Kirana akan **bertindak sendiri** memakai Claude.

Contoh:
- *"Besok aku harus kirim laporan, beli kado ibu, dan olahraga"* → 3 tugas ditambahkan
- *"Tugas nomor 2 sudah selesai"* → tugas dicentang
- *"Catat: hari ini capek tapi senang"* → catatan tersimpan dengan waktu
- *"Apa saja yang belum kukerjakan?"* → Kirana membaca daftar tugas lalu merangkum

## Alat (tools) yang bisa dipakai agent
`simpan_prioritas`, `tambah_tugas`, `lihat_tugas`, `tandai_tugas`, `hapus_tugas`,
`simpan_catatan`, `lihat_catatan`, `waktu_sekarang`.

Data disimpan di `data_kirana.json`, jadi tidak hilang saat halaman di-refresh.
Perubahan lewat chat langsung terlihat di menu Daftar Tugas / Catatan, dan sebaliknya.

## Cara menjalankan di PyCharm

1. **File → Open**, pilih folder `asisten-kirana`.
2. Jika PyCharm menawarkan membuat *virtual environment* (venv), pilih **OK**.
   Jika tidak: **Settings → Project → Python Interpreter → Add Interpreter → Virtualenv**.
3. Buka `requirements.txt`, klik **Install requirements** di bagian atas
   (atau di tab **Terminal**: `pip install -r requirements.txt`).
4. Salin `.streamlit/secrets.toml.example` menjadi `.streamlit/secrets.toml`, lalu isi API key.
5. Buka `jalankan.py`, tekan tombol **▶ Run**. Browser akan terbuka di http://localhost:8501.
6. Untuk berhenti, tekan tombol **■ Stop** merah di PyCharm.

Tips belajar: pasang *breakpoint* (klik di samping nomor baris) di fungsi `jalankan_alat`
lalu jalankan `jalankan.py` dengan **🐞 Debug** untuk melihat alat apa yang dipanggil Claude.

## Cara menjalankan lewat terminal

```bash
cd asisten-kirana
pip install -r requirements.txt
cp .streamlit/secrets.toml.example .streamlit/secrets.toml   # lalu isi API key
streamlit run app.py
```

API key Claude bisa dibuat di https://console.anthropic.com. Bisa juga diisi lewat
environment variable `ANTHROPIC_API_KEY`.

**Deploy gratis:** upload ke Streamlit Community Cloud, pilih `asisten-kirana/app.py`,
lalu isi `ANTHROPIC_API_KEY` di menu *Secrets*. (Catatan: di cloud, file data bisa
ter-reset saat aplikasi restart.)

## Catatan teknis
- Model: `claude-opus-5-5`, effort `low` (cepat dan hemat untuk obrolan).
- Jika sebuah permintaan ditolak filter keamanan, Claude otomatis mencoba model cadangan
  (`fallbacks: "default"`). Hapus dua baris `betas`/`fallbacks` di `app.py` jika tidak mau.
- Agent dibatasi maksimal 10 langkah per pesan.
