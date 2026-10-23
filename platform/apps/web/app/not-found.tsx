import { ButtonLink, EmptyState } from "@/components/ui";
import { IconSearch } from "@/components/icons";

export default function NotFound() {
  return <EmptyState icon={<IconSearch size={28} />} title="Halaman tidak ditemukan" text="Link yang kamu buka mungkin salah atau produknya sudah tidak dijual." action={<ButtonLink href="/">Kembali ke beranda</ButtonLink>} />;
}
