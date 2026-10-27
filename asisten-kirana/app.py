"""Kirana — Asisten AI Pribadi (versi AI agent).

Jalankan:  streamlit run app.py
Butuh API key Claude di ANTHROPIC_API_KEY atau .streamlit/secrets.toml.
"""

import json
import os
import random
from datetime import datetime
from pathlib import Path

import anthropic
import streamlit as st

MODEL = "claude-opus-5-5"
DATA_FILE = Path(__file__).parent / "data_kirana.json"
MAKS_LANGKAH = 10  # batas putaran agent per pesan, agar tidak berputar terus

SARAN = [
    "Coba jeda bernapas 2 menit sebelum lanjut bekerja",
    "Minum segelas air putih sekarang",
    "Pisahkan tugas besar menjadi langkah-langkah kecil",
    "Jangan memaksakan diri jika tubuh sudah merasa lelah",
]

SYSTEM_PROMPT = """Kamu adalah Kirana, asisten AI pribadi yang hangat, sopan, dan ringkas.
Selalu jawab dalam bahasa Indonesia sehari-hari yang ramah.

Kamu bisa mengelola data pengguna lewat alat (tools): prioritas harian, daftar tugas,
dan catatan harian. Gunakan alat setiap kali pengguna meminta menambah, melihat,
menyelesaikan, atau menghapus sesuatu — jangan hanya berpura-pura sudah menyimpannya.
Jika pengguna bercerita panjang tentang harinya, tawarkan untuk menyimpannya sebagai catatan.
Jika pengguna menyebut beberapa hal yang harus dikerjakan, pecah menjadi tugas terpisah.
Untuk pertanyaan soal hari atau tanggal, panggil alat waktu_sekarang.
Jika pengguna tampak lelah atau stres, beri saran kecil yang menenangkan.
Setelah memakai alat, sampaikan hasilnya singkat (1-3 kalimat)."""


# ---------- Penyimpanan data (file JSON agar tidak hilang saat refresh) ----------

def muat_data():
    if DATA_FILE.exists():
        try:
            return json.loads(DATA_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    return {"prioritas": "", "daftar_tugas": [], "catatan_harian": []}


def simpan_data():
    DATA_FILE.write_text(
        json.dumps(st.session_state.data, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def waktu_str():
    return datetime.now().strftime("%d-%m-%Y %H:%M")


# ---------- Alat (tools) yang bisa dipakai agent ----------

def _skema(props=None, required=None):
    return {
        "type": "object",
        "properties": props or {},
        "required": required or [],
        "additionalProperties": False,
    }


TOOLS = [
    {
        "name": "simpan_prioritas",
        "description": "Simpan prioritas utama pengguna untuk hari ini (menimpa yang lama).",
        "input_schema": _skema({"prioritas": {"type": "string"}}, ["prioritas"]),
    },
    {
        "name": "tambah_tugas",
        "description": "Tambahkan satu tugas baru ke daftar tugas pengguna.",
        "input_schema": _skema({"teks": {"type": "string", "description": "Isi tugas"}}, ["teks"]),
    },
    {
        "name": "lihat_tugas",
        "description": "Lihat seluruh daftar tugas beserta nomor dan statusnya.",
        "input_schema": _skema(),
    },
    {
        "name": "tandai_tugas",
        "description": "Tandai tugas selesai atau belum selesai berdasarkan nomornya (mulai dari 1).",
        "input_schema": _skema(
            {"nomor": {"type": "integer"}, "selesai": {"type": "boolean"}},
            ["nomor", "selesai"],
        ),
    },
    {
        "name": "hapus_tugas",
        "description": "Hapus tugas berdasarkan nomornya (mulai dari 1).",
        "input_schema": _skema({"nomor": {"type": "integer"}}, ["nomor"]),
    },
    {
        "name": "simpan_catatan",
        "description": "Simpan catatan harian pengguna. Waktu dicatat otomatis.",
        "input_schema": _skema({"isi": {"type": "string"}}, ["isi"]),
    },
    {
        "name": "lihat_catatan",
        "description": "Lihat catatan harian terbaru.",
        "input_schema": _skema(
            {"jumlah": {"type": "integer", "description": "Berapa catatan terakhir, mis. 5"}},
            ["jumlah"],
        ),
    },
    {
        "name": "waktu_sekarang",
        "description": "Ambil hari, tanggal, dan jam saat ini.",
        "input_schema": _skema(),
    },
]
for _t in TOOLS:
    _t["strict"] = True


def jalankan_alat(nama, inp):
    """Jalankan satu alat dan kembalikan hasilnya sebagai teks."""
    data = st.session_state.data
    tugas = data["daftar_tugas"]

    def cek_nomor(n):
        if not 1 <= n <= len(tugas):
            raise ValueError(f"Nomor {n} tidak ada. Ada {len(tugas)} tugas.")
        return n - 1

    if nama == "simpan_prioritas":
        data["prioritas"] = inp["prioritas"]
        hasil = f"Prioritas disimpan: {inp['prioritas']}"
    elif nama == "tambah_tugas":
        tugas.append({"teks": inp["teks"], "selesai": False})
        hasil = f"Tugas #{len(tugas)} ditambahkan: {inp['teks']}"
    elif nama == "lihat_tugas":
        if not tugas:
            return "Daftar tugas masih kosong."
        return "\n".join(
            f"{i}. [{'x' if t['selesai'] else ' '}] {t['teks']}" for i, t in enumerate(tugas, 1)
        )
    elif nama == "tandai_tugas":
        i = cek_nomor(inp["nomor"])
        tugas[i]["selesai"] = inp["selesai"]
        hasil = f"Tugas #{inp['nomor']} ditandai {'selesai' if inp['selesai'] else 'belum selesai'}."
    elif nama == "hapus_tugas":
        i = cek_nomor(inp["nomor"])
        hasil = f"Tugas dihapus: {tugas.pop(i)['teks']}"
    elif nama == "simpan_catatan":
        data["catatan_harian"].append({"waktu": waktu_str(), "isi": inp["isi"]})
        hasil = "Catatan tersimpan."
    elif nama == "lihat_catatan":
        catatan = data["catatan_harian"][-max(1, inp["jumlah"]):]
        if not catatan:
            return "Belum ada catatan."
        return "\n".join(f"[{c['waktu']}] {c['isi']}" for c in catatan)
    elif nama == "waktu_sekarang":
        hari = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
        now = datetime.now()
        return f"{hari[now.weekday()]}, {now.strftime('%d-%m-%Y %H:%M')}"
    else:
        raise ValueError(f"Alat tidak dikenal: {nama}")

    simpan_data()
    return hasil


# ---------- Agent loop ----------

def ambil_api_key():
    try:
        if "ANTHROPIC_API_KEY" in st.secrets:
            return st.secrets["ANTHROPIC_API_KEY"]
    except Exception:  # tidak ada secrets.toml
        pass
    return os.environ.get("ANTHROPIC_API_KEY")


@st.cache_resource
def buat_client(api_key):
    return anthropic.Anthropic(api_key=api_key)


def jalankan_agent(client, pesan_api, status):
    """Putar agent: Claude memanggil alat sampai selesai. Mengembalikan teks jawaban."""
    for _ in range(MAKS_LANGKAH):
        resp = client.beta.messages.create(
            model=MODEL,
            max_tokens=16000,
            system=[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
            tools=TOOLS,
            messages=pesan_api,
            output_config={"effort": "low"},
            # Jika permintaan ditolak oleh filter keamanan, coba otomatis di model cadangan.
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )
        # Simpan seluruh isi balasan (termasuk blok thinking) agar riwayat tetap valid.
        pesan_api.append({"role": "assistant", "content": resp.content})

        if resp.stop_reason == "refusal":
            return "Maaf, aku tidak bisa membantu permintaan itu."
        if resp.stop_reason == "pause_turn":
            continue
        if resp.stop_reason != "tool_use":
            teks = "".join(b.text for b in resp.content if b.type == "text").strip()
            if resp.stop_reason == "max_tokens":
                teks += "\n\n_(jawaban terpotong)_"
            return teks or "Sudah kulakukan. 🤍"

        hasil_alat = []
        for blok in resp.content:
            if blok.type != "tool_use":
                continue
            try:
                isi = jalankan_alat(blok.name, blok.input)
                status.write(f"🔧 `{blok.name}` — {isi.splitlines()[0]}")
                hasil_alat.append({"type": "tool_result", "tool_use_id": blok.id, "content": isi})
            except Exception as e:
                status.write(f"⚠️ `{blok.name}` gagal: {e}")
                hasil_alat.append(
                    {"type": "tool_result", "tool_use_id": blok.id, "content": str(e), "is_error": True}
                )
        # Semua hasil alat dikirim dalam satu pesan.
        pesan_api.append({"role": "user", "content": hasil_alat})

    return "Maaf, permintaan ini terlalu panjang untuk kuselesaikan sekaligus. Coba dipecah, ya."


# ---------- Tampilan ----------

st.set_page_config(page_title="Kirana — Asisten Pribadi", page_icon="🤍", layout="wide")
st.title("🤍 Kirana — Asisten AI Pribadimu")

if "data" not in st.session_state:
    st.session_state.data = muat_data()
if "pesan_api" not in st.session_state:
    st.session_state.pesan_api = []  # riwayat lengkap untuk Claude
if "chat" not in st.session_state:
    st.session_state.chat = []  # riwayat yang ditampilkan: (peran, teks)

data = st.session_state.data

menu = st.sidebar.radio(
    "Menu", ["🤖 Ngobrol dengan Kirana", "🏠 Beranda", "✅ Daftar Tugas", "📝 Catatan Harian", "💡 Saran Singkat"]
)

if menu == "🤖 Ngobrol dengan Kirana":
    st.caption(
        "Contoh: *\"besok aku harus kirim laporan, beli kado ibu, dan olahraga\"* · "
        "*\"tugas nomor 2 sudah selesai\"* · *\"catat: hari ini aku capek tapi senang\"*"
    )
    api_key = ambil_api_key()
    if not api_key:
        st.warning(
            "API key Claude belum diatur. Isi `ANTHROPIC_API_KEY` di environment atau di "
            "`.streamlit/secrets.toml`. Lihat README."
        )
        st.stop()
    client = buat_client(api_key)

    if st.sidebar.button("🧹 Mulai obrolan baru"):
        st.session_state.pesan_api = []
        st.session_state.chat = []
        st.rerun()

    if not st.session_state.chat:
        with st.chat_message("assistant", avatar="🤍"):
            st.write("Halo! Aku Kirana. Apa prioritas utama kamu hari ini?")

    for peran, teks in st.session_state.chat:
        with st.chat_message(peran, avatar="🤍" if peran == "assistant" else None):
            st.markdown(teks)

    if prompt := st.chat_input("Tulis pesan untuk Kirana..."):
        st.session_state.chat.append(("user", prompt))
        with st.chat_message("user"):
            st.markdown(prompt)

        panjang_awal = len(st.session_state.pesan_api)
        st.session_state.pesan_api.append({"role": "user", "content": prompt})
        with st.chat_message("assistant", avatar="🤍"):
            with st.status("Kirana sedang berpikir...", expanded=False) as status:
                jawaban = None
                try:
                    jawaban = jalankan_agent(client, st.session_state.pesan_api, status)
                    status.update(label="Selesai", state="complete")
                except anthropic.AuthenticationError:
                    galat = "API key tidak valid. Periksa kembali pengaturannya."
                except anthropic.RateLimitError:
                    galat = "Kirana sedang sibuk. Coba lagi sebentar lagi, ya."
                except anthropic.APIStatusError as e:
                    galat = f"Claude mengembalikan galat {e.status_code}: {e.message}"
                except anthropic.APIConnectionError:
                    galat = "Gagal terhubung ke Claude. Periksa koneksi internet."
                if jawaban is None:
                    # Buang pesan yang gagal agar riwayat tetap rapi.
                    del st.session_state.pesan_api[panjang_awal:]
                    status.update(label="Gagal", state="error")
                    jawaban = galat
            st.markdown(jawaban)
        st.session_state.chat.append(("assistant", jawaban))

elif menu == "🏠 Beranda":
    st.subheader("Halo, apa prioritas utama kamu hari ini?")
    if data["prioritas"]:
        st.success(f"✅ Prioritas hari ini: {data['prioritas']}")
    prioritas = st.text_input("Tulis di sini:")
    if st.button("Simpan Prioritas") and prioritas.strip():
        data["prioritas"] = prioritas.strip()
        simpan_data()
        st.rerun()
    belum = sum(not t["selesai"] for t in data["daftar_tugas"])
    st.metric("Tugas belum selesai", belum)
    st.info("💬 Jangan lupa istirahat sejenak jika sudah lelah.")

elif menu == "✅ Daftar Tugas":
    st.subheader("Daftar Tugas-ku")
    tugas_baru = st.text_input("Tambah tugas baru:")
    if st.button("Tambah") and tugas_baru.strip():
        data["daftar_tugas"].append({"teks": tugas_baru.strip(), "selesai": False})
        simpan_data()
        st.rerun()
    for i, tugas in enumerate(data["daftar_tugas"]):
        kol1, kol2 = st.columns([8, 1])
        selesai = kol1.checkbox(tugas["teks"], value=tugas["selesai"], key=f"t{i}")
        if selesai != tugas["selesai"]:
            tugas["selesai"] = selesai
            simpan_data()
        if kol2.button("🗑️", key=f"h{i}"):
            data["daftar_tugas"].pop(i)
            simpan_data()
            st.rerun()

elif menu == "📝 Catatan Harian":
    st.subheader("Tulis catatan harian")
    isi = st.text_area("Apa yang ingin kamu tulis?")
    if st.button("Simpan Catatan") and isi.strip():
        data["catatan_harian"].append({"waktu": waktu_str(), "isi": isi.strip()})
        simpan_data()
        st.success("Catatan tersimpan!")
    st.divider()
    st.subheader("Riwayat Catatan")
    for c in reversed(data["catatan_harian"]):
        st.text(f"[{c['waktu']}] {c['isi']}")

elif menu == "💡 Saran Singkat":
    st.subheader("Saran kecil hari ini")
    st.info(f"🌱 {random.choice(SARAN)}")
    for s in SARAN:
        st.write(f"• {s}")
