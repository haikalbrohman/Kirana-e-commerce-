import { Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { CurrentUser, Public, type AuthUser } from '../auth/auth.decorators.js';
import { CatalogService } from './catalog.service.js';
import { ProductQueryDto } from './catalog.dto.js';
import { shippingQuotes } from '../checkout/shipping.js';
import { clampInt } from '../common/util.js';

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Public() @Get('categories')
  categories() {
    return this.catalog.categories();
  }

  @Public() @Get('home')
  home() {
    return this.catalog.home();
  }

  @Public() @Get('products')
  products(@Query() query: ProductQueryDto) {
    return this.catalog.search(query);
  }

  @Public() @Get('products/:id')
  product(@Param('id') id: string) {
    return this.catalog.detail(id);
  }

  @Public() @Get('products/:id/similar')
  similar(@Param('id') id: string) {
    return this.catalog.similar(id);
  }

  @Post('products/:id/view') @HttpCode(200)
  view(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.catalog.recordView(user.id, id);
  }

  @Public() @Get('recommendations')
  recommendations(@CurrentUser() user?: AuthUser) {
    return this.catalog.recommendations(user?.id);
  }

  /** Voucher yang sedang berlaku (untuk banner promo; hanya data yang benar-benar aktif) */
  @Public() @Get('vouchers')
  vouchers() {
    return this.catalog.activeVouchers();
  }

  /** Perkiraan ongkir untuk berat tertentu (tarif sama dengan saat checkout) */
  @Public() @Get('shipping/quote')
  shippingQuote(@Query('weightGram') weight?: string) {
    return { note: 'Tarif perkiraan berdasarkan berat. Total pasti dihitung saat checkout.', options: shippingQuotes(clampInt(weight, 1, 100_000, 1000)) };
  }

  @Public() @Get('stores/featured')
  featuredStores() {
    return this.catalog.featuredStores();
  }

  @Public() @Get('stores/:slug')
  store(@Param('slug') slug: string) {
    return this.catalog.store(slug);
  }
}
