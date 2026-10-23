/**
 * Uji end-to-end API terhadap database PostgreSQL sungguhan (shopia_test).
 * Jalankan: npm run test:e2e -w @shopia/api   (lihat README untuk menyiapkan database uji)
 */
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SignJWT } from 'jose';
import request from 'supertest';
import { createPrismaClient } from '@shopia/db';

process.env.DATABASE_URL ??= 'postgresql://postgres@localhost:5433/shopia_test';
process.env.API_JWT_SECRET = 'test-secret-test-secret-test-secret-123';
process.env.PAYMENT_PROVIDER = 'mock';
process.env.SHOPIA_NO_LISTEN = '1';
process.env.SHOPIA_DISABLE_SWEEP = '1';
process.env.AI_PROVIDER = 'rules';
process.env.UPLOAD_DIR = mkdtempSync(join(tmpdir(), 'shopia-uploads-'));
process.env.PUBLIC_API_URL = 'http://localhost:4000';

const MOCK_KEY = 'mock-server-key-for-local-development-only';
const db = createPrismaClient();
let app: NestExpressApplication;
let http: any;

const token = (userId: string, secret = process.env.API_JWT_SECRET!) =>
  new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(userId).setIssuer('shopia-web').setAudience('shopia-api').setIssuedAt().setExpirationTime('5m').sign(new TextEncoder().encode(secret));

async function userByEmail(email: string) {
  return db.user.findUniqueOrThrow({ where: { email } });
}
async function as(email: string) {
  const u = await userByEmail(email);
  const t = await token(u.id);
  return { id: u.id, auth: { Authorization: `Bearer ${t}` } };
}
async function variant(productPrefix: string, variantName?: string) {
  return db.productVariant.findFirstOrThrow({ where: { product: { name: { startsWith: productPrefix } }, ...(variantName ? { name: variantName } : {}) }, include: { product: true } });
}
/** Ubah status di penyedia tiruan lalu kembalikan notifikasi bertanda tangan (seperti Midtrans asli). */
async function providerNotify(orderId: string, status: string, amount: number) {
  const { PaymentsService } = await import('../src/payments/payments.service.js');
  return (app.get(PaymentsService).gateway as any).buildNotification(orderId, status, amount);
}
/** Notifikasi bertanda tangan TANPA mengubah status di penyedia (mensimulasikan webhook yang tidak jujur). */
function signedNotification(orderId: string, status: string, amount: number) {
  const gross = `${amount}.00`;
  const code = status === 'settlement' ? '200' : '202';
  return { order_id: orderId, transaction_id: `t-${orderId}-${status}`, transaction_status: status, status_code: code, gross_amount: gross, signature_key: createHash('sha512').update(orderId + code + gross + MOCK_KEY).digest('hex') };
}

beforeAll(async () => {
  const { AppModule } = await import('../src/app.module.js');
  const { configureApp } = await import('../src/main.js');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false });
  configureApp(app);
  await app.init();
  http = app.getHttpServer();
});

afterAll(async () => {
  await app?.close();
  await db.$disconnect();
});

describe('Katalog', () => {
  it('health check', async () => {
    await request(http).get('/v1/health').expect(200);
  });

  it('memfilter harga, kategori & mengurutkan', async () => {
    const res = await request(http).get('/v1/products').query({ category: 'elektronik', maxPrice: 500000, sort: 'price_asc' }).expect(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    const prices = res.body.items.map((i: any) => i.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(prices.every((p: number) => p <= 500000)).toBe(true);
    expect(res.body.items.every((i: any) => i.category.slug === 'elektronik')).toBe(true);
  });

  it('pencarian kata kunci menemukan produk relevan', async () => {
    const res = await request(http).get('/v1/products').query({ q: 'tas laptop kerja' }).expect(200);
    expect(res.body.items[0].name).toMatch(/Tas Kerja/);
  });

  it('diskon hanya tampil jika harga coret valid', async () => {
    const res = await request(http).get('/v1/products').query({ limit: 60 }).expect(200);
    for (const p of res.body.items) {
      if (p.compareAtPrice) expect(p.compareAtPrice).toBeGreaterThan(p.price);
      else expect(p.discountPercent).toBe(0);
    }
  });

  it('detail produk + ulasan dengan nama disamarkan', async () => {
    const v = await variant('Laptop Pelajar');
    const res = await request(http).get(`/v1/products/${v.productId}`).expect(200);
    expect(res.body.variants.length).toBe(2);
    expect(res.body.attributes.RAM).toBe('16 GB');
    expect(res.body.reviews[0].author).not.toBe('Rina Pembeli');
    await request(http).get(`/v1/products/${v.productId}/similar`).expect(200);
  });

  it('rekomendasi tamu jujur memakai produk populer', async () => {
    const res = await request(http).get('/v1/recommendations').expect(200);
    expect(res.body.personalized).toBe(false);
  });
});

describe('Keamanan autentikasi', () => {
  it('menolak tanpa token, token palsu, dan peran yang salah', async () => {
    await request(http).get('/v1/cart').expect(401);
    const forged = await token((await userByEmail('pembeli@shopia.id')).id, 'secret-palsu-secret-palsu-secret-palsu');
    await request(http).get('/v1/cart').set('Authorization', `Bearer ${forged}`).expect(401);
    const buyer = await as('pembeli@shopia.id');
    await request(http).get('/v1/admin/stats').set(buyer.auth).expect(403);
    await request(http).get('/v1/seller/products').set(buyer.auth).expect(403);
  });

  it('akun yang dinonaktifkan tidak bisa mengakses API', async () => {
    const u = await db.user.create({ data: { email: `suspend-${Date.now()}@test.id`, status: 'SUSPENDED' } });
    await request(http).get('/v1/me').set('Authorization', `Bearer ${await token(u.id)}`).expect(403);
  });

  it('menolak field yang tidak dikenal (mis. mencoba mengirim harga sendiri)', async () => {
    const buyer = await as('pembeli@shopia.id');
    const res = await request(http).post('/v1/checkout/quote').set(buyer.auth).send({ total: 1 }).expect(400);
    expect(JSON.stringify(res.body.message)).toContain('total');
  });
});

describe('Belanja: keranjang -> checkout -> pembayaran', () => {
  it('alur lengkap dengan voucher, idempotensi, webhook bertanda tangan', async () => {
    const buyer = await as('pembeli@shopia.id');
    const v = await variant('Sepatu Lari', 'Hitam / 42');
    const stockBefore = v.stock;
    await request(http).post('/v1/cart/items').set(buyer.auth).send({ variantId: v.id, quantity: 2 }).expect(201);
    await request(http).post('/v1/cart/items').set(buyer.auth).send({ variantId: v.id, quantity: 999 }).expect(400);

    const address = await db.address.findFirstOrThrow({ where: { userId: buyer.id } });
    const quote = await request(http).post('/v1/checkout/quote').set(buyer.auth).send({ addressId: address.id, voucherCode: 'HEMAT20K' }).expect(200);
    expect(quote.body.subtotal).toBe(v.price * 2);
    expect(quote.body.discountTotal).toBe(20000);
    expect(quote.body.total).toBe(quote.body.subtotal + quote.body.shippingTotal - 20000);

    const key = randomUUID();
    const created = await request(http).post('/v1/checkout').set(buyer.auth).send({ addressId: address.id, voucherCode: 'HEMAT20K', idempotencyKey: key }).expect(201);
    const again = await request(http).post('/v1/checkout').set(buyer.auth).send({ addressId: address.id, voucherCode: 'HEMAT20K', idempotencyKey: key }).expect(201);
    expect(again.body.paymentId).toBe(created.body.paymentId);
    expect(again.body.reused).toBe(true);

    const payment = await db.payment.findUniqueOrThrow({ where: { id: created.body.paymentId }, include: { orders: { include: { items: true } } } });
    expect(payment.amount).toBe(quote.body.total);
    expect(payment.orders[0].items[0].unitPrice).toBe(v.price); // snapshot harga
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock).toBe(stockBefore - 2);

    // Webhook palsu ditolak
    await request(http).post('/v1/payments/midtrans/notification').send({ ...signedNotification(payment.providerOrderId, 'settlement', payment.amount), signature_key: 'palsu' }).expect(403);
    // Bertanda tangan sah tapi penyedia masih "pending" -> tidak dipercaya
    await request(http).post('/v1/payments/midtrans/notification').send(signedNotification(payment.providerOrderId, 'settlement', payment.amount)).expect(200);
    expect((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('PENDING');
    // Nominal dari penyedia tidak cocok -> diabaikan & dicatat untuk admin
    await request(http).post('/v1/payments/midtrans/notification').send({ ...(await providerNotify(payment.providerOrderId, 'settlement', payment.amount - 1000)), transaction_id: 'tampered' }).expect(200);
    expect((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('PENDING');
    expect(await db.auditLog.count({ where: { action: 'payment.amount_mismatch', entityId: payment.id } })).toBe(1);

    // Webhook sah -> PAID; dikirim ulang tetap aman (idempoten)
    const ok = await providerNotify(payment.providerOrderId, 'settlement', payment.amount);
    await request(http).post('/v1/payments/midtrans/notification').send(ok).expect(200);
    const dup = await request(http).post('/v1/payments/midtrans/notification').send(ok).expect(200);
    expect(dup.body.duplicate).toBe(true);
    const paid = await request(http).get(`/v1/payments/${payment.id}`).set(buyer.auth).expect(200);
    expect(paid.body.status).toBe('PAID');
    expect(paid.body.orders.every((o: any) => o.status === 'PAID')).toBe(true);
  });

  it('kedaluwarsa mengembalikan stok', async () => {
    const buyer = await as('pembeli@shopia.id');
    const v = await variant('Power Bank');
    await request(http).post('/v1/cart/items').set(buyer.auth).send({ variantId: v.id, quantity: 3 }).expect(201);
    const address = await db.address.findFirstOrThrow({ where: { userId: buyer.id } });
    const created = await request(http).post('/v1/checkout').set(buyer.auth).send({ addressId: address.id }).expect(201);
    const p = await db.payment.findUniqueOrThrow({ where: { id: created.body.paymentId } });
    await request(http).post('/v1/payments/midtrans/notification').send(await providerNotify(p.providerOrderId, 'expire', p.amount)).expect(200);
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock).toBe(v.stock);
    const orders = await db.order.findMany({ where: { paymentId: p.id } });
    expect(orders.every((o) => o.status === 'CANCELLED')).toBe(true);
  });

  it('tidak bisa menjual melebihi stok saat dua pembeli checkout bersamaan', async () => {
    const v = await variant('Selendang Batik', 'Motif Truntum');
    await db.productVariant.update({ where: { id: v.id }, data: { stock: 1 } });
    const buyers = await Promise.all(
      [0, 1].map(async (i) => {
        const u = await db.user.create({ data: { email: `race-${i}-${Date.now()}@test.id`, name: `Race ${i}` } });
        const a = await db.address.create({ data: { userId: u.id, recipientName: 'Uji', phone: '081200000000', line1: 'Jl. Uji No. 1', city: 'Bandung', province: 'Jawa Barat', postalCode: '40111', isDefault: true } });
        const auth = { Authorization: `Bearer ${await token(u.id)}` };
        await request(http).post('/v1/cart/items').set(auth).send({ variantId: v.id, quantity: 1 }).expect(201);
        return { auth, addressId: a.id };
      }),
    );
    const results = await Promise.all(buyers.map((b) => request(http).post('/v1/checkout').set(b.auth).send({ addressId: b.addressId })));
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock).toBe(0);
  });
});

describe('Penjual & admin', () => {
  it('buka toko, upload foto, produk tersembunyi sampai toko disetujui admin', async () => {
    const u = await db.user.create({ data: { email: `penjual-${Date.now()}@test.id`, name: 'Penjual Baru' } });
    const seller = { Authorization: `Bearer ${await token(u.id)}` };
    const admin = await as('admin@shopia.id');

    const store = await request(http).post('/v1/seller/store').set(seller).send({ name: 'Toko Uji Coba', city: 'Bogor' }).expect(201);
    expect(store.body.status).toBe('PENDING');

    // Foto: file teks yang mengaku JPG ditolak, PNG asli diterima
    await request(http).post('/v1/seller/uploads').set(seller).attach('file', Buffer.from('bukan gambar sama sekali'), 'palsu.jpg').expect(400);
    const png = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');
    const up = await request(http).post('/v1/seller/uploads').set(seller).attach('file', png, 'foto.png').expect(201);
    expect(up.body.url).toMatch(/^http:\/\/localhost:4000\/uploads\/products\/.+\.png$/);

    const category = await db.category.findUniqueOrThrow({ where: { slug: 'rumah-dapur' } });
    const body = {
      name: 'Talenan Kayu Jati Anti Jamur',
      categoryId: category.id,
      description: 'Talenan kayu jati solid, tebal 2 cm, tidak mudah berjamur dan aman untuk pisau.',
      attributes: { Bahan: 'Kayu jati', Ukuran: '35 x 25 x 2 cm' },
      tags: ['talenan', 'dapur'],
      status: 'ACTIVE',
      images: [{ url: up.body.url }],
      variants: [{ name: 'Standar', price: 120000, compareAtPrice: 150000, stock: 10, weightGram: 1200 }],
    };
    // URL foto dari luar Shopia ditolak
    await request(http).post('/v1/seller/products').set(seller).send({ ...body, images: [{ url: 'https://contoh.com/a.jpg' }] }).expect(400);
    const created = await request(http).post('/v1/seller/products').set(seller).send(body).expect(201);
    expect(created.body.minPrice).toBe(120000);
    await request(http).get(`/v1/products/${created.body.id}`).expect(404); // toko belum disetujui

    await request(http).post(`/v1/admin/stores/${store.body.id}/approve`).set(admin.auth).expect(200);
    await request(http).get(`/v1/products/${created.body.id}`).expect(200);

    // Ubah stok -> tercatat di riwayat stok
    const v = created.body.variants[0];
    await request(http).patch(`/v1/seller/products/${created.body.id}`).set(seller).send({ ...body, variants: [{ ...body.variants[0], id: v.id, stock: 25 }] }).expect(200);
    const moves = await db.inventoryMovement.findMany({ where: { variantId: v.id }, orderBy: { createdAt: 'asc' } });
    expect(moves.map((m) => [m.reason, m.delta])).toEqual([['INITIAL', 10], ['RESTOCK', 15]]);

    // Admin menurunkan produk -> hilang dari katalog, tercatat di audit log
    await request(http).post(`/v1/admin/products/${created.body.id}/takedown`).set(admin.auth).send({ reason: 'Foto tidak sesuai produk' }).expect(200);
    await request(http).get(`/v1/products/${created.body.id}`).expect(404);
    const logs = await db.auditLog.findMany({ where: { entityId: { in: [store.body.id, created.body.id] } } });
    expect(logs.map((l) => l.action).sort()).toEqual(['product.takedown', 'store.approve', 'store.open']);
  });

  it('penjual memproses & mengirim; ulasan hanya setelah barang diterima', async () => {
    const buyer = await as('pembeli@shopia.id');
    const seller = await as('dapurnusantara@shopia.id');
    const v = await variant('Tumbler Stainless', 'Krem');
    await request(http).post('/v1/cart/items').set(buyer.auth).send({ variantId: v.id, quantity: 1 }).expect(201);
    const address = await db.address.findFirstOrThrow({ where: { userId: buyer.id } });
    const created = await request(http).post('/v1/checkout').set(buyer.auth).send({ addressId: address.id }).expect(201);
    const p = await db.payment.findUniqueOrThrow({ where: { id: created.body.paymentId }, include: { orders: { include: { items: true } } } });
    const order = p.orders[0];

    await request(http).post(`/v1/seller/orders/${order.id}/process`).set(seller.auth).expect(400); // belum dibayar
    await request(http).post('/v1/payments/midtrans/notification').send(await providerNotify(p.providerOrderId, 'settlement', p.amount)).expect(200);

    const other = await as('gadgetkita@shopia.id');
    await request(http).post(`/v1/seller/orders/${order.id}/process`).set(other.auth).expect(404); // toko lain
    await request(http).post(`/v1/seller/orders/${order.id}/process`).set(seller.auth).expect(200);
    await request(http).post(`/v1/seller/orders/${order.id}/ship`).set(seller.auth).send({ trackingNumber: '' }).expect(400);

    await request(http).post('/v1/reviews').set(buyer.auth).send({ orderItemId: order.items[0].id, rating: 5 }).expect(403); // belum diterima
    await request(http).post(`/v1/seller/orders/${order.id}/ship`).set(seller.auth).send({ trackingNumber: 'JNE123456789' }).expect(200);
    await request(http).post(`/v1/orders/${order.id}/complete`).set(buyer.auth).expect(200);
    await request(http).post('/v1/reviews').set(buyer.auth).send({ orderItemId: order.items[0].id, rating: 4, comment: 'Dingin tahan lama' }).expect(201);
    await request(http).post('/v1/reviews').set(buyer.auth).send({ orderItemId: order.items[0].id, rating: 5 }).expect(403); // sekali saja

    const done = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { events: true } });
    expect(done.status).toBe('COMPLETED');
    expect(done.payoutStatus).toBe('PENDING');
    expect(done.events.map((e) => e.status)).toEqual(['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED']);
    expect((await db.product.findUniqueOrThrow({ where: { id: v.productId } })).ratingCount).toBe(1);

    const stats = await request(http).get('/v1/seller/stats').set(seller.auth).expect(200);
    expect(stats.body.totals.grossSales).toBeGreaterThanOrEqual(v.price);
  });

  it('admin tidak bisa mencabut peran admin dirinya sendiri', async () => {
    const admin = await as('admin@shopia.id');
    await request(http).patch(`/v1/admin/users/${admin.id}`).set(admin.auth).send({ roles: ['BUYER'] }).expect(400);
    const stats = await request(http).get('/v1/admin/stats').set(admin.auth).expect(200);
    expect(stats.body.users).toBeGreaterThan(0);
  });
});
