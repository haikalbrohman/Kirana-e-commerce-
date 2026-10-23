import { Body, Controller, ForbiddenException, NotFoundException, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { PrismaService } from '../prisma/prisma.service.js';

class ReviewDto {
  @IsString() @MaxLength(40) orderItemId!: string;
  @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsString() @MaxLength(1000) comment?: string;
}

/** Ulasan hanya dari pembeli yang barangnya sudah sampai (ulasan terverifikasi). */
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post() @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async create(@CurrentUser() u: AuthUser, @Body() dto: ReviewDto) {
    const item = await this.prisma.client.orderItem.findFirst({
      where: { id: dto.orderItemId, order: { buyerId: u.id } },
      include: { order: { select: { status: true } }, review: true },
    });
    if (!item) throw new NotFoundException('Item pesanan tidak ditemukan');
    if (!['DELIVERED', 'COMPLETED'].includes(item.order.status)) throw new ForbiddenException('Ulasan bisa diberikan setelah barang diterima');
    if (item.review) throw new ForbiddenException('Kamu sudah mengulas produk ini');

    return this.prisma.client.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: { productId: item.productId, orderItemId: item.id, userId: u.id, rating: dto.rating, comment: dto.comment?.trim() || null },
      });
      const agg = await tx.review.aggregate({ where: { productId: item.productId, status: 'PUBLISHED' }, _avg: { rating: true }, _count: true });
      await tx.product.update({ where: { id: item.productId }, data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count } });
      return review;
    });
  }
}
