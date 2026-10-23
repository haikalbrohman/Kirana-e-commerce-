import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsIn } from 'class-validator';
import { CurrentUser, Public, type AuthUser } from '../auth/auth.decorators.js';
import { PaymentsService } from './payments.service.js';

class SimulateDto {
  @IsIn(['settlement', 'deny', 'expire']) result!: 'settlement' | 'deny' | 'expire';
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /** Webhook Midtrans (Payment Notification URL). Diverifikasi dengan tanda tangan + cek status. */
  @Public() @Post('midtrans/notification') @HttpCode(200) @Throttle({ default: { limit: 300, ttl: 60_000 } })
  notification(@Body() body: Record<string, unknown>) {
    return this.payments.handleNotification(body);
  }

  @Get(':id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.payments.getForUser(u.id, id);
  }

  @Post(':id/cancel') @HttpCode(200) cancel(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.payments.cancelByBuyer(u.id, id);
  }

  @Post('mock/:providerOrderId/simulate') @HttpCode(200)
  simulate(@CurrentUser() u: AuthUser, @Param('providerOrderId') id: string, @Body() dto: SimulateDto) {
    return this.payments.simulate(u.id, id, dto.result);
  }
}
