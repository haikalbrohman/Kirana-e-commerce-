import type { CreateTransactionInput, PaymentGateway, ProviderStatus } from './gateway.js';
import { midtransSignature, verifyMidtransBody } from './gateway.js';

/**
 * Gateway TIRUAN khusus pengembangan lokal (tanpa akun Midtrans).
 * Meniru format notifikasi Midtrans termasuk tanda tangan, sehingga jalur
 * verifikasi webhook yang sama ikut teruji. DITOLAK saat NODE_ENV=production.
 */
export class MockGateway implements PaymentGateway {
  readonly name = 'mock';
  private readonly statuses = new Map<string, ProviderStatus>();

  constructor(private readonly serverKey: string, private readonly webOrigin: string) {}

  async createTransaction(input: CreateTransactionInput) {
    this.statuses.set(input.providerOrderId, { orderId: input.providerOrderId, transactionStatus: 'pending', grossAmount: input.amount });
    return { token: null, redirectUrl: `${this.webOrigin}/pay/mock/${encodeURIComponent(input.providerOrderId)}` };
  }

  verifySignature(body: Record<string, unknown>) {
    return verifyMidtransBody(body, this.serverKey);
  }

  async fetchStatus(orderId: string) {
    return this.statuses.get(orderId) ?? null;
  }

  async cancel(orderId: string) {
    const s = this.statuses.get(orderId);
    if (s) s.transactionStatus = 'cancel';
  }

  /** Buat notifikasi bertanda tangan seperti yang dikirim Midtrans. */
  buildNotification(orderId: string, transactionStatus: string, amount: number) {
    const grossAmount = `${amount}.00`;
    const statusCode = transactionStatus === 'settlement' ? '200' : transactionStatus === 'pending' ? '201' : '202';
    const transactionId = `mock-${orderId}-${transactionStatus}`;
    this.statuses.set(orderId, { orderId, transactionStatus, grossAmount: amount, transactionId, statusCode, paymentType: 'qris' });
    return {
      order_id: orderId,
      transaction_id: transactionId,
      transaction_status: transactionStatus,
      status_code: statusCode,
      gross_amount: grossAmount,
      payment_type: 'qris',
      signature_key: midtransSignature(orderId, statusCode, grossAmount, this.serverKey),
    };
  }
}
