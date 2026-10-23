import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

/** Mencatat tindakan penting (terutama tindakan admin) ke tabel AuditLog. */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(params: { actorId?: string; action: string; entityType: string; entityId: string; metadata?: Record<string, unknown>; ip?: string }) {
    return this.prisma.client.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: (params.metadata ?? {}) as object,
        ip: params.ip,
      },
    });
  }
}
