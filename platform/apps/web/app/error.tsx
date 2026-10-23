"use client";

import { Button, EmptyState } from "@/components/ui";
import { IconAlert } from "@/components/icons";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <EmptyState icon={<IconAlert size={28} />} title="Ada yang tidak beres" text="Terjadi gangguan saat memuat halaman. Coba lagi, atau kembali beberapa saat lagi." action={<Button onClick={reset}>Coba lagi</Button>} />;
}
