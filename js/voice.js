/* =====================================================================
   KIRANA AI - PESAN SUARA
   ---------------------------------------------------------------------
   Membacakan balasan Kirana AI dengan suara (bahasa Indonesia).
   - Di aplikasi Android: memakai mesin suara HP (plugin TextToSpeech)
   - Di browser: memakai suara bawaan browser (Web Speech API)
   Gratis, tanpa server, tanpa kunci API.
   ===================================================================== */

const KiranaVoice = (() => {
  const native = () => {
    const cap = window.Capacitor;
    return cap && cap.isNativePlatform && cap.isNativePlatform() && cap.Plugins && cap.Plugins.TextToSpeech;
  };
  const web = () => "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  let onEnd = null;

  // Hapus emoji & simbol agar suara terdengar wajar
  function clean(text) {
    return String(text || "")
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "")
      .replace(/[•*_#>\[\]]/g, " ")
      .replace(/\bRp\s?([\d.]+)/g, (_, n) => n.replace(/\./g, "") + " rupiah")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Pilih suara Indonesia jika tersedia di browser
  function pickVoice() {
    const list = window.speechSynthesis.getVoices();
    return list.find((v) => /id[-_]ID/i.test(v.lang) && /female|wanita|google/i.test(v.name)) || list.find((v) => /^id/i.test(v.lang)) || null;
  }

  function stop() {
    const n = native();
    if (n) n.stop().catch(() => {});
    else if (web()) window.speechSynthesis.cancel();
    if (onEnd) onEnd();
    onEnd = null;
  }

  // done() dipanggil saat suara selesai / dihentikan
  async function speak(text, done) {
    stop();
    const t = clean(text);
    if (!t) return false;
    onEnd = done || null;
    const finish = () => {
      if (onEnd) onEnd();
      onEnd = null;
    };
    const n = native();
    if (n) {
      try {
        await n.speak({ text: t, lang: "id-ID", rate: 1.0, pitch: 1.05, volume: 1.0 });
      } catch (e) {
        console.warn("Kirana AI: suara gagal", e);
      }
      finish();
      return true;
    }
    if (!web()) return false;
    const u = new SpeechSynthesisUtterance(t);
    u.lang = "id-ID";
    u.rate = 1.02;
    u.pitch = 1.05;
    const v = pickVoice();
    if (v) u.voice = v;
    u.onend = finish;
    u.onerror = finish;
    window.speechSynthesis.speak(u);
    return true;
  }

  const supported = () => !!(native() || web());
  // Perkiraan durasi (detik) untuk label pesan suara
  const duration = (text) => Math.max(1, Math.round(clean(text).split(" ").length / 2.6));

  if (web()) window.speechSynthesis.onvoiceschanged = () => {};

  return { speak, stop, supported, duration };
})();
