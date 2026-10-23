/**
 * Konfigurasi dari environment variables, divalidasi saat aplikasi mulai.
 * Rahasia (API key, secret) HANYA dibaca di server dan tidak pernah dikirim ke browser.
 */
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Environment variable ${name} wajib diisi`);
  return v;
}
const optional = (name: string, fallback = ''): string => process.env[name] ?? fallback;
const int = (name: string, fallback: number): number => {
  const v = process.env[name];
  const n = v === undefined || v === '' ? fallback : Number(v);
  if (!Number.isFinite(n)) throw new Error(`${name} harus berupa angka`);
  return n;
};

export type PaymentProviderName = 'midtrans' | 'mock';
export type StorageDriver = 'local' | 's3';

export function loadConfig() {
  const nodeEnv = optional('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';
  const jwtSecret = required('API_JWT_SECRET');
  if (jwtSecret.length < 32) throw new Error('API_JWT_SECRET minimal 32 karakter');

  const paymentProvider = optional('PAYMENT_PROVIDER', 'mock') as PaymentProviderName;
  if (!['midtrans', 'mock'].includes(paymentProvider)) throw new Error('PAYMENT_PROVIDER harus midtrans atau mock');
  if (isProduction && paymentProvider === 'mock') throw new Error('PAYMENT_PROVIDER=mock tidak boleh dipakai di production');

  const storageDriver = optional('STORAGE_DRIVER', 'local') as StorageDriver;

  return {
    nodeEnv,
    isProduction,
    port: int('PORT', 4000),
    databaseUrl: required('DATABASE_URL'),
    webOrigin: optional('WEB_ORIGIN', 'http://localhost:3000'),
    publicApiUrl: optional('PUBLIC_API_URL', 'http://localhost:4000'),
    jwt: { secret: new TextEncoder().encode(jwtSecret), issuer: 'shopia-web', audience: 'shopia-api' },
    payment: {
      provider: paymentProvider,
      expiryMinutes: int('PAYMENT_EXPIRY_MINUTES', 60 * 24),
      midtrans: {
        serverKey: paymentProvider === 'midtrans' ? required('MIDTRANS_SERVER_KEY') : optional('MIDTRANS_SERVER_KEY'),
        isProduction: optional('MIDTRANS_IS_PRODUCTION', 'false') === 'true',
      },
      // Kunci khusus mode mock untuk menandatangani notifikasi tiruan
      mockServerKey: 'mock-server-key-for-local-development-only',
    },
    platformFeePercent: int('PLATFORM_FEE_PERCENT', 0),
    storage: {
      driver: storageDriver,
      localDir: optional('UPLOAD_DIR', './uploads'),
      s3: {
        endpoint: optional('S3_ENDPOINT'),
        region: optional('S3_REGION', 'auto'),
        bucket: optional('S3_BUCKET'),
        accessKeyId: optional('S3_ACCESS_KEY_ID'),
        secretAccessKey: optional('S3_SECRET_ACCESS_KEY'),
        publicUrl: optional('S3_PUBLIC_URL'),
      },
    },
    ai: {
      provider: optional('AI_PROVIDER', process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'rules'),
      model: optional('AI_MODEL', 'claude-opus-5-5'),
      maxRequestsPerUserPerDay: int('AI_MAX_REQUESTS_PER_USER_PER_DAY', 100),
      maxTokensPerDay: int('AI_MAX_TOKENS_PER_DAY', 2_000_000),
    },
  };
}

export type AppConfig = ReturnType<typeof loadConfig>;
export const APP_CONFIG = Symbol('APP_CONFIG');
