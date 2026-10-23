import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthGuard } from './auth/auth.guard.js';
import { HealthController } from './health/health.controller.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { CommerceModule } from './commerce.module.js';
import { SellerModule } from './seller/seller.module.js';
import { AdminModule } from './admin/admin.module.js';
import { AiModule } from './ai/ai.module.js';

@Module({
  imports: [
    PrismaModule,
    CatalogModule,
    CommerceModule,
    SellerModule,
    AdminModule,
    AiModule,
    // Batas umum: 120 permintaan/menit per IP. Endpoint sensitif punya batas lebih ketat.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
