import { Card } from "@/components/ui";
import { IconMail } from "@/components/icons";

export const metadata = { title: "Cek email kamu" };

export default function CheckEmailPage() {
  return (
    <div className="px-4 py-16">
      <Card className="mx-auto max-w-md p-8 text-center animate-slide-up">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-50 text-brand-600"><IconMail size={30} /></div>
        <h1 className="mt-4 text-xl font-extrabold">Cek email kamu</h1>
        <p className="mt-2 text-sm text-muted">Kami sudah mengirim link masuk. Buka email dan klik tombol <strong>Masuk sekarang</strong>. Link berlaku 24 jam dan hanya bisa dipakai sekali.</p>
        <p className="mt-4 text-xs text-muted">Tidak ada email? Cek folder spam, atau kembali dan kirim ulang.</p>
      </Card>
    </div>
  );
}
