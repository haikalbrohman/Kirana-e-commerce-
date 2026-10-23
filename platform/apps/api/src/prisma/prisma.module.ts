import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { APP_CONFIG, loadConfig } from '../config.js';
import { AuditService } from '../common/audit.service.js';
import { NotificationService } from '../common/notification.service.js';

@Global()
@Module({
  providers: [PrismaService, AuditService, NotificationService, { provide: APP_CONFIG, useFactory: loadConfig }],
  exports: [PrismaService, AuditService, NotificationService, APP_CONFIG],
})
export class PrismaModule {}
