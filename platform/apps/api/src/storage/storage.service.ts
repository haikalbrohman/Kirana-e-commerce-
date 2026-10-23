import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { APP_CONFIG, type AppConfig } from '../config.js';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Kenali jenis gambar dari isi file (bukan dari nama/ekstensi yang bisa dipalsukan). */
export function detectImageType(buf: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

const CONTENT_TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' } as const;

/** Penyimpanan foto: lokal (pengembangan) atau object storage S3-compatible (Cloudflare R2, Supabase, AWS S3). */
@Injectable()
export class StorageService {
  private s3?: S3Client;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    const s = config.storage.s3;
    if (config.storage.driver === 's3') {
      if (!s.bucket || !s.accessKeyId || !s.secretAccessKey || !s.publicUrl) throw new Error('Konfigurasi S3 belum lengkap (S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_URL)');
      this.s3 = new S3Client({ region: s.region, endpoint: s.endpoint || undefined, credentials: { accessKeyId: s.accessKeyId, secretAccessKey: s.secretAccessKey } });
    }
  }

  /** Awalan URL yang dianggap milik Shopia (untuk validasi URL gambar produk). */
  get publicPrefix() {
    return this.config.storage.driver === 's3' ? this.config.storage.s3.publicUrl.replace(/\/$/, '') + '/' : `${this.config.publicApiUrl}/uploads/`;
  }

  async saveImage(buf: Buffer, folder: string) {
    if (buf.length > MAX_IMAGE_BYTES) throw new BadRequestException('Ukuran foto maksimal 5 MB');
    const type = detectImageType(buf);
    if (!type) throw new BadRequestException('Format foto harus JPG, PNG, atau WEBP');
    const key = `${folder.replace(/[^a-zA-Z0-9/_-]/g, '')}/${Date.now().toString(36)}-${randomBytes(8).toString('hex')}.${type}`;

    if (this.s3) {
      await this.s3.send(new PutObjectCommand({ Bucket: this.config.storage.s3.bucket, Key: key, Body: buf, ContentType: CONTENT_TYPES[type], CacheControl: 'public, max-age=31536000, immutable' }));
    } else {
      const root = resolve(this.config.storage.localDir);
      const path = resolve(join(root, key));
      if (!path.startsWith(root)) throw new BadRequestException('Path tidak valid');
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, buf);
    }
    return { url: this.publicPrefix + key };
  }
}
