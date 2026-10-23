import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { CheckoutService } from './checkout.service.js';

class CheckoutDto {
  @IsOptional() @IsString() @MaxLength(40) addressId?: string;
  @IsOptional() @IsObject() shipping?: Record<string, string>;
  @IsOptional() @IsString() @MaxLength(40) voucherCode?: string;
  @IsOptional() @IsObject() notes?: Record<string, string>;
  @IsOptional() @IsUUID() idempotencyKey?: string;
}

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  /** Pratinjau total (tanpa membuat pesanan) */
  @Post('quote') @HttpCode(200)
  quote(@CurrentUser() u: AuthUser, @Body() dto: CheckoutDto) {
    return this.checkout.quote(u.id, dto);
  }

  /** Buat pesanan + pembayaran. Dibatasi agar tidak disalahgunakan. */
  @Post() @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@CurrentUser() u: AuthUser, @Body() dto: CheckoutDto) {
    return this.checkout.create(u.id, dto);
  }
}
