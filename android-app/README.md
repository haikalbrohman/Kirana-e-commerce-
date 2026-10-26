# 📱 Aplikasi Android Kirana

Folder ini membungkus website Kirana menjadi aplikasi Android (dibuat dengan [Capacitor](https://capacitorjs.com)).
Aplikasi membuka https://haikalbrohman.github.io/Kirana-e-commerce-/ di dalam layar penuh, jadi **setiap
perubahan di website langsung terlihat di aplikasi** tanpa perlu membuat APK baru.

## Download

👉 **https://github.com/haikalbrohman/Kirana-e-commerce-/releases/latest/download/Kirana.apk**

Buka link itu di HP Android → download → buka file `Kirana.apk` → izinkan "pasang dari sumber ini" → Pasang.

## Bagaimana APK dibuat

Tidak perlu Android Studio. Setiap ada perubahan di folder `android-app/`, GitHub Actions
(`.github/workflows/android-app.yml`) otomatis membuat:

- `Kirana.apk` — untuk dipasang langsung di HP
- `Kirana.aab` — untuk upload ke Google Play Console

Bisa juga dijalankan manual: tab **Actions** → **Aplikasi Android** → **Run workflow**.

## Yang bisa diubah

| Ingin mengubah | File |
|---|---|
| Alamat website yang dibuka | `capacitor.config.json` (`server.url`) dan `www/offline.html` |
| Nama aplikasi | `capacitor.config.json` (`appName`) dan `android/app/src/main/res/values/strings.xml` |
| Ikon & layar pembuka | ganti gambar di `assets/`, lalu jalankan `npm run icons` |
| Halaman saat tidak ada internet | `www/offline.html` |

## Sebelum upload ke Google Play

APK sekarang ditandatangani dengan **kunci uji coba** (`android/app/kirana-uji.keystore`) yang ikut tersimpan di
repo publik. Untuk Play Store, buat kunci rahasia sendiri lalu isi 4 GitHub Secrets:
`KIRANA_KEYSTORE_BASE64`, `KIRANA_KEYSTORE_PASSWORD`, `KIRANA_KEY_ALIAS`, `KIRANA_KEY_PASSWORD`.
Package name aplikasi: `com.haikalbrohman.kirana` (tidak bisa diganti setelah terbit di Play Store).
