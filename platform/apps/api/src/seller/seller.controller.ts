import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, Roles, type AuthUser } from '../auth/auth.decorators.js';
import { clampInt } from '../common/util.js';
import { MAX_IMAGE_BYTES } from '../storage/storage.service.js';
import { ProductDto, ShipDto, StoreDto } from './seller.dto.js';
import { SellerService } from './seller.service.js';

@Controller('seller')
export class SellerController {
  constructor(private readonly seller: SellerService) {}

  /** Siapa pun yang sudah masuk bisa mengajukan pembukaan toko */
  @Post('store') openStore(@CurrentUser() u: AuthUser, @Body() dto: StoreDto) {
    return this.seller.openStore(u.id, dto);
  }

  @Roles('SELLER') @Get('store') store(@CurrentUser() u: AuthUser) {
    return this.seller.myStore(u.id);
  }
  @Roles('SELLER') @Patch('store') updateStore(@CurrentUser() u: AuthUser, @Body() dto: StoreDto) {
    return this.seller.updateStore(u.id, dto);
  }

  @Roles('SELLER') @Get('products') products(@CurrentUser() u: AuthUser, @Query('status') status?: string, @Query('q') q?: string) {
    return this.seller.products(u.id, status, q);
  }
  @Roles('SELLER') @Get('products/:id') product(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.seller.product(u.id, id);
  }
  @Roles('SELLER') @Post('products') create(@CurrentUser() u: AuthUser, @Body() dto: ProductDto) {
    return this.seller.saveProduct(u.id, dto);
  }
  @Roles('SELLER') @Patch('products/:id') update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: ProductDto) {
    return this.seller.saveProduct(u.id, dto, id);
  }
  @Roles('SELLER') @Post('products/:id/publish') @HttpCode(200) publish(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.seller.setStatus(u.id, id, 'ACTIVE');
  }
  @Roles('SELLER') @Post('products/:id/unpublish') @HttpCode(200) unpublish(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.seller.setStatus(u.id, id, 'DRAFT');
  }
  @Roles('SELLER') @Post('products/:id/archive') @HttpCode(200) archive(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.seller.setStatus(u.id, id, 'ARCHIVED');
  }

  @Roles('SELLER') @Post('uploads') @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } }))
  upload(@CurrentUser() u: AuthUser, @UploadedFile() file?: { buffer: Buffer; size: number; mimetype: string }) {
    return this.seller.upload(u.id, file);
  }

  @Roles('SELLER') @Get('orders') orders(@CurrentUser() u: AuthUser, @Query('status') status?: string) {
    return this.seller.orders(u.id, status);
  }
  @Roles('SELLER') @Post('orders/:id/process') @HttpCode(200) process(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.seller.process(u.id, id);
  }
  @Roles('SELLER') @Post('orders/:id/ship') @HttpCode(200) ship(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: ShipDto) {
    return this.seller.ship(u.id, id, dto.trackingNumber, dto.courier);
  }
  @Roles('SELLER') @Post('orders/:id/deliver') @HttpCode(200) deliver(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.seller.markDelivered(u.id, id);
  }

  @Roles('SELLER') @Get('stats') stats(@CurrentUser() u: AuthUser, @Query('days') days?: string) {
    return this.seller.stats(u.id, clampInt(days, 7, 90, 30));
  }
  @Roles('SELLER') @Get('price-insight') priceInsight(@Query('categoryId') categoryId: string, @Query('productId') productId?: string) {
    return this.seller.priceInsight(categoryId, productId);
  }
}
