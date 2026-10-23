/**
 * Pilihan pengiriman.
 * CATATAN: ini TARIF PERKIRAAN tetap berdasarkan berat, karena integrasi ongkir
 * real-time (mis. RajaOngkir/Biteship) belum dikonfigurasi. Tampilkan sebagai "perkiraan".
 */
export const SHIPPING_OPTIONS = [
  { id: 'hemat', label: 'Hemat', courier: 'SiCepat', service: 'HALU', base: 9000, perKg: 3000, eta: '4–6 hari' },
  { id: 'reguler', label: 'Reguler', courier: 'JNE', service: 'REG', base: 12000, perKg: 5000, eta: '2–3 hari' },
  { id: 'express', label: 'Express', courier: 'J&T', service: 'EZ', base: 22000, perKg: 8000, eta: '1–2 hari' },
] as const;

export type ShippingOptionId = (typeof SHIPPING_OPTIONS)[number]['id'];
export const DEFAULT_SHIPPING: ShippingOptionId = 'reguler';

export function shippingCost(optionId: string, weightGram: number) {
  const opt = SHIPPING_OPTIONS.find((o) => o.id === optionId);
  if (!opt) return null;
  const kg = Math.max(1, Math.ceil(weightGram / 1000));
  return { ...opt, cost: opt.base + opt.perKg * (kg - 1), weightKg: kg };
}

export function shippingQuotes(weightGram: number) {
  return SHIPPING_OPTIONS.map((o) => shippingCost(o.id, weightGram)!);
}
