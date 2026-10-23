import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, demoLoginEnabled, googleEnabled, signIn } from "@/auth";
import { Logo } from "@/components/header";
import { Button, Card, Input, Label } from "@/components/ui";
import { IconGoogle, IconMail } from "@/components/icons";

export const metadata = { title: "Masuk" };

/** Hanya izinkan kembali ke halaman di situs ini (cegah open redirect) */
const safeReturn = (url?: string) => (url && url.startsWith("/") && !url.startsWith("//") ? url : "/");

const ERRORS: Record<string, string> = {
  AccessDenied: "Akun ini tidak dapat masuk. Hubungi admin Shopia jika menurutmu ini kesalahan.",
  Verification: "Link masuk sudah kedaluwarsa atau sudah dipakai. Minta link baru.",
  OAuthAccountNotLinked: "Email ini sudah terdaftar dengan cara masuk lain.",
  EmailSignin: "Email belum bisa dikirim. Coba lagi beberapa saat.",
  CredentialsSignin: "Akun demo tidak ditemukan. Jalankan seed database terlebih dahulu.",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = (await props.searchParams) as { callbackUrl?: string; error?: string };
  const redirectTo = safeReturn(sp.callbackUrl);
  if ((await auth())?.user) redirect(redirectTo);

  async function emailLogin(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect(`/login?error=EmailSignin&callbackUrl=${encodeURIComponent(redirectTo)}`);
    try {
      await signIn("email", { email, redirectTo });
    } catch (e) {
      if (e instanceof AuthError) redirect(`/login?error=${e.type}&callbackUrl=${encodeURIComponent(redirectTo)}`);
      throw e;
    }
  }
  async function googleLogin() {
    "use server";
    await signIn("google", { redirectTo });
  }
  async function demoLogin(formData: FormData) {
    "use server";
    try {
      await signIn("demo", { email: String(formData.get("email")), redirectTo });
    } catch (e) {
      if (e instanceof AuthError) redirect(`/login?error=CredentialsSignin`);
      throw e;
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-10">
      <div className="mb-6 flex justify-center"><Logo /></div>
      <Card className="p-6 animate-slide-up">
        <h1 className="text-xl font-extrabold">Masuk atau daftar</h1>
        <p className="mt-1 text-sm text-muted">Tanpa kata sandi. Kami kirim link masuk ke email kamu.</p>
        {sp.error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{ERRORS[sp.error] ?? "Gagal masuk. Silakan coba lagi."}</p>}

        {googleEnabled && (
          <form action={googleLogin} className="mt-5">
            <Button variant="outline" block size="lg"><IconGoogle /> Lanjut dengan Google</Button>
          </form>
        )}
        {googleEnabled && <div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />atau<span className="h-px flex-1 bg-line" /></div>}

        <form action={emailLogin} className={googleEnabled ? "" : "mt-5"}>
          <label className="block">
            <Label>Email</Label>
            <Input name="email" type="email" required autoComplete="email" placeholder="nama@email.com" />
          </label>
          <Button block size="lg" className="mt-3"><IconMail size={18} /> Kirim link masuk</Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted">Dengan masuk, kamu menyetujui <a href="/privacy" className="underline">Kebijakan Privasi</a> Shopia.</p>
      </Card>

      {demoLoginEnabled && (
        <Card className="mt-4 border-dashed border-amber-300 bg-amber-50 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Mode pengembangan · login demo</p>
          <p className="mt-1 text-xs text-amber-900">Tidak tersedia di production. Akun berasal dari data contoh (seed).</p>
          <div className="mt-3 grid gap-2">
            {[["pembeli@shopia.id", "Pembeli"], ["rumahbatik@shopia.id", "Penjual (Rumah Batik Sari)"], ["admin@shopia.id", "Administrator"]].map(([email, label]) => (
              <form key={email} action={demoLogin}>
                <input type="hidden" name="email" value={email} />
                <Button variant="outline" size="sm" block>Masuk sebagai {label}</Button>
              </form>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
