import { createHash, timingSafeEqual } from 'node:crypto';

/** Abstraksi penyedia pembayaran agar Midtrans bisa diganti/diuji. */
export interface CreateTransactionInput {
  providerOrderId: string;
  amount: number;
  customer: { name: string; email: string; phone?: string };
  lines: { id: string; name: string; price: number; quantity: number }[];
  expiryMinutes: number;
  finishUrl: string;
}

export interface ProviderStatus {
  orderId: string;
  transactionStatus: string; // settlement, pending, expire, ...
  fraudStatus?: string;
  grossAmount: number;
  paymentType?: string;
  transactionId?: string;
  statusCode?: string;
}

export interface PaymentGateway {
  readonly name: string;
  createTransaction(input: CreateTransactionInput): Promise<{ token: string | null; redirectUrl: string }>;
  /** Verifikasi tanda tangan notifikasi webhook. */
  verifySignature(body: Record<string, unknown>): boolean;
  /** Ambil status resmi langsung dari penyedia (bukan dari browser/webhook). */
  fetchStatus(orderId: string): Promise<ProviderStatus | null>;
  cancel(orderId: string): Promise<void>;
}

/** Tanda tangan Midtrans: SHA512(order_id + status_code + gross_amount + server_key) */
export function midtransSignature(orderId: string, statusCode: string, grossAmount: string, serverKey: string) {
  return createHash('sha512').update(orderId + statusCode + grossAmount + serverKey).digest('hex');
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function verifyMidtransBody(body: Record<string, unknown>, serverKey: string) {
  const { order_id, status_code, gross_amount, signature_key } = body as Record<string, string>;
  if (![order_id, status_code, gross_amount, signature_key].every((v) => typeof v === 'string' && v.length)) return false;
  return safeEqual(midtransSignature(order_id, status_code, gross_amount, serverKey), signature_key.toLowerCase());
}

/** Ubah status Midtrans menjadi status pembayaran Shopia. */
export function mapProviderStatus(s: Pick<ProviderStatus, 'transactionStatus' | 'fraudStatus'>): 'PAID' | 'PENDING' | 'FAILED' | 'EXPIRED' | 'REFUNDED' | null {
  switch (s.transactionStatus) {
    case 'settlement':
      return 'PAID';
    case 'capture':
      return s.fraudStatus === 'accept' || !s.fraudStatus ? 'PAID' : 'PENDING';
    case 'pending':
    case 'authorize':
      return 'PENDING';
    case 'deny':
    case 'cancel':
    case 'failure':
      return 'FAILED';
    case 'expire':
      return 'EXPIRED';
    case 'refund':
      return 'REFUNDED';
    default:
      return null; // partial_refund dll. dicatat saja
  }
}
