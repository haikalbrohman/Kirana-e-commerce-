import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { validCompareAt } from '../common/util.js';

const MAX_CART_LINES = 50;

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private async cartId(userId: string) {
    const cart = await this.prisma.client.cart.upsert({ where: { userId }, update: {}, create: { userId }, select: { id: true } });
    return cart.id;
  }

  /** Keranjang dengan harga & stok TERKINI dari database, dikelompokkan per toko. */
  async get(userId: string) {
    const cart = await this.prisma.client.cart.findUnique({
      where: { userId },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true, name: true, status: true,
                    images: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } },
                    store: { select: { id: true, name: true, slug: true, city: true, status: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const groups = new Map<string, { store: { id: string; name: string; slug: string; city: string | null }; items: any[]; subtotal: number }>();
    let subtotal = 0;
    let count = 0;
    for (const item of cart?.items ?? []) {
      const v = item.variant;
      const p = v.product;
      const available = p.status === 'ACTIVE' && p.store.status === 'ACTIVE' && v.isActive;
      let issue: string | null = null;
      if (!available) issue = 'Produk tidak tersedia';
      else if (v.stock === 0) issue = 'Stok habis';
      else if (item.quantity > v.stock) issue = `Stok tersisa ${v.stock}`;
      const line = {
        id: item.id,
        productId: p.id,
        variantId: v.id,
        productName: p.name,
        variantName: v.name,
        imageUrl: p.images[0]?.url ?? null,
        price: v.price,
        compareAtPrice: validCompareAt(v.price, v.compareAtPrice),
        quantity: item.quantity,
        stock: v.stock,
        lineTotal: v.price * item.quantity,
        issue,
      };
      const g = groups.get(p.store.id) ?? { store: { id: p.store.id, name: p.store.name, slug: p.store.slug, city: p.store.city }, items: [], subtotal: 0 };
      g.items.push(line);
      if (!issue) {
        g.subtotal += line.lineTotal;
        subtotal += line.lineTotal;
        count += item.quantity;
      }
      groups.set(p.store.id, g);
    }
    return { groups: [...groups.values()], subtotal, count, hasIssues: [...groups.values()].some((g) => g.items.some((i) => i.issue)) };
  }

  async add(userId: string, variantId: string, quantity: number) {
    const v = await this.prisma.client.productVariant.findFirst({
      where: { id: variantId, isActive: true, product: { status: 'ACTIVE', store: { status: 'ACTIVE' } } },
      select: { stock: true, product: { select: { store: { select: { ownerId: true } } } } },
    });
    if (!v) throw new NotFoundException('Produk tidak tersedia');
    if (v.product.store.ownerId === userId) throw new BadRequestException('Tidak bisa membeli produk dari toko sendiri');
    const cartId = await this.cartId(userId);
    const existing = await this.prisma.client.cartItem.findUnique({ where: { cartId_variantId: { cartId, variantId } } });
    const newQty = (existing?.quantity ?? 0) + quantity;
    if (newQty > v.stock) throw new BadRequestException(v.stock ? `Stok hanya tersisa ${v.stock}` : 'Stok habis');
    if (!existing && (await this.prisma.client.cartItem.count({ where: { cartId } })) >= MAX_CART_LINES)
      throw new BadRequestException('Keranjang penuh (maksimal 50 produk)');
    await this.prisma.client.cartItem.upsert({
      where: { cartId_variantId: { cartId, variantId } },
      update: { quantity: newQty },
      create: { cartId, variantId, quantity },
    });
    return this.get(userId);
  }

  async update(userId: string, itemId: string, quantity: number) {
    const item = await this.prisma.client.cartItem.findFirst({ where: { id: itemId, cart: { userId } }, include: { variant: { select: { stock: true } } } });
    if (!item) throw new NotFoundException('Item keranjang tidak ditemukan');
    if (quantity > item.variant.stock) throw new BadRequestException(`Stok hanya tersisa ${item.variant.stock}`);
    await this.prisma.client.cartItem.update({ where: { id: itemId }, data: { quantity } });
    return this.get(userId);
  }

  async remove(userId: string, itemId: string) {
    await this.prisma.client.cartItem.deleteMany({ where: { id: itemId, cart: { userId } } });
    return this.get(userId);
  }
}
