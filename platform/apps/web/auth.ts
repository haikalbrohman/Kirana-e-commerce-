/**
 * Autentikasi Shopia (Auth.js v5): Google, email magic link (verifikasi email
 * otomatis), dan login demo khusus pengembangan lokal.
 */
import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

const isProduction = process.env.NODE_ENV === "production";
export const demoLoginEnabled = !isProduction && process.env.AUTH_DEMO_LOGIN === "true";
// Email pemilik (dipisah koma) yang otomatis menjadi Admin saat masuk.
// Cara aman membuat admin pertama di production tanpa akun demo.
const adminEmails = new Set(
  (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean),
);
export const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

async function sendMagicLink({ identifier, url }: { identifier: string; url: string }) {
  const key = process.env.AUTH_RESEND_KEY;
  if (!key) {
    if (isProduction) throw new Error("Layanan email belum dikonfigurasi (AUTH_RESEND_KEY)");
    // Pengembangan: tampilkan link di terminal agar bisa login tanpa layanan email
    console.log(`\n🔐 Link masuk Shopia untuk ${identifier}:\n${url}\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Shopia <no-reply@shopia.id>",
      to: identifier,
      subject: "Link masuk ke Shopia",
      text: `Klik link berikut untuk masuk ke Shopia (berlaku 24 jam):\n${url}\n\nAbaikan email ini jika kamu tidak meminta link masuk.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
        <h2 style="color:#047857;margin:0 0 12px">Masuk ke Shopia</h2>
        <p>Klik tombol di bawah untuk masuk. Link berlaku 24 jam dan hanya bisa dipakai sekali.</p>
        <p><a href="${url}" style="display:inline-block;background:#059669;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Masuk sekarang</a></p>
        <p style="color:#64748b;font-size:13px">Abaikan email ini jika kamu tidak meminta link masuk.</p></div>`,
    }),
  });
  if (!res.ok) throw new Error(`Gagal mengirim email (${res.status})`);
}

const providers: Provider[] = [
  Resend({ id: "email", name: "Email", from: process.env.EMAIL_FROM ?? "Shopia <no-reply@shopia.id>", apiKey: process.env.AUTH_RESEND_KEY ?? "dev", sendVerificationRequest: sendMagicLink }),
];
// Google memverifikasi email, sehingga aman menautkan ke akun email yang sama
if (googleEnabled) providers.push(Google({ allowDangerousEmailAccountLinking: true }));
if (demoLoginEnabled) {
  providers.push(
    Credentials({
      id: "demo",
      name: "Demo",
      credentials: { email: { label: "Email" } },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase();
        return prisma.user.findUnique({ where: { email } });
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers,
  pages: { signIn: "/login", verifyRequest: "/login/check-email", error: "/login" },
  events: {
    async signIn({ user }) {
      const email = user?.email?.toLowerCase();
      if (!user?.id || !email || !adminEmails.has(email)) return;
      const row = await prisma.user.findUnique({ where: { id: user.id }, select: { roles: true } });
      if (row && !row.roles.includes("ADMIN")) {
        await prisma.user.update({ where: { id: user.id }, data: { roles: { set: [...new Set([...row.roles, "BUYER" as const, "ADMIN" as const])] } } });
      }
    },
  },
  callbacks: {
    async signIn({ user }) {
      // Akun yang dinonaktifkan admin tidak bisa masuk
      if (!user?.email) return false;
      const existing = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() }, select: { status: true } });
      return existing?.status !== "SUSPENDED";
    },
    async jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.uid && session.user) session.user.id = token.uid as string;
      return session;
    },
  },
});
