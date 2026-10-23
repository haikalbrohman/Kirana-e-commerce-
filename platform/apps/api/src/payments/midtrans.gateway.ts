import { Logger } from '@nestjs/common';
import type { CreateTransactionInput, PaymentGateway, ProviderStatus } from './gateway.js';
import { verifyMidtransBody } from './gateway.js';

/** Midtrans Snap (sandbox atau production). Kunci server hanya ada di backend. */
export class MidtransGateway implements PaymentGateway {
  readonly name = 'midtrans';
  private readonly logger = new Logger('Midtrans');
  private readonly snapBase: string;
  private readonly apiBase: string;
  private readonly auth: string;

  constructor(private readonly serverKey: string, isProduction: boolean) {
    this.snapBase = isProduction ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com';
    this.apiBase = isProduction ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
    this.auth = 'Basic ' + Buffer.from(serverKey + ':').toString('base64');
  }

  private async request(url: string, init: RequestInit = {}) {
    const res = await fetch(url, {
      ...init,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: this.auth },
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text();
    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      /* respons bukan JSON */
    }
    return { ok: res.ok, status: res.status, json };
  }

  async createTransaction(input: CreateTransactionInput) {
    // Midtrans mewajibkan jumlah item_details = gross_amount
    const items = input.lines.map((l) => ({ id: l.id.slice(0, 50), name: l.name.slice(0, 50), price: l.price, quantity: l.quantity }));
    const res = await this.request(`${this.snapBase}/snap/v1/transactions`, {
      method: 'POST',
      body: JSON.stringify({
        transaction_details: { order_id: input.providerOrderId, gross_amount: input.amount },
        item_details: items,
        customer_details: { first_name: input.customer.name.slice(0, 50), email: input.customer.email, phone: input.customer.phone },
        expiry: { unit: 'minute', duration: input.expiryMinutes },
        callbacks: { finish: input.finishUrl },
      }),
    });
    if (!res.ok || !res.json.redirect_url) {
      this.logger.error(`Gagal membuat transaksi (${res.status}): ${JSON.stringify(res.json.error_messages ?? res.json).slice(0, 300)}`);
      throw new Error('Gagal menghubungi Midtrans');
    }
    return { token: res.json.token as string, redirectUrl: res.json.redirect_url as string };
  }

  verifySignature(body: Record<string, unknown>) {
    return verifyMidtransBody(body, this.serverKey);
  }

  async fetchStatus(orderId: string): Promise<ProviderStatus | null> {
    const res = await this.request(`${this.apiBase}/v2/${encodeURIComponent(orderId)}/status`);
    if (res.json.status_code === '404' || !res.json.transaction_status) return null;
    return {
      orderId,
      transactionStatus: res.json.transaction_status,
      fraudStatus: res.json.fraud_status,
      grossAmount: Math.round(Number(res.json.gross_amount)),
      paymentType: res.json.payment_type,
      transactionId: res.json.transaction_id,
      statusCode: res.json.status_code,
    };
  }

  async cancel(orderId: string) {
    const res = await this.request(`${this.apiBase}/v2/${encodeURIComponent(orderId)}/cancel`, { method: 'POST' });
    if (!res.ok) this.logger.warn(`Pembatalan ${orderId} tidak berhasil di Midtrans (${res.status}); transaksi akan kedaluwarsa otomatis`);
  }
}
