import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

/** Notifikasi di dalam aplikasi (mis. perubahan status pesanan). */
@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  notify(userId: string, title: string, body: string, link?: string) {
    return this.prisma.client.notification.create({ data: { userId, title, body, link } });
  }
}
