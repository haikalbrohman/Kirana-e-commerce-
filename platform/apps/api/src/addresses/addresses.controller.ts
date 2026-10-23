import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { PrismaService } from '../prisma/prisma.service.js';

class AddressDto {
  @IsOptional() @IsString() @MaxLength(30) label?: string;
  @IsString() @Length(2, 80) recipientName!: string;
  @Matches(/^(\+62|62|0)8\d{7,12}$/, { message: 'Nomor HP tidak valid (contoh: 081234567890)' }) phone!: string;
  @IsString() @Length(5, 200) line1!: string;
  @IsString() @Length(2, 60) city!: string;
  @IsString() @Length(2, 60) province!: string;
  @Matches(/^\d{5}$/, { message: 'Kode pos harus 5 digit' }) postalCode!: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

const MAX_ADDRESSES = 10;

@Controller('addresses')
export class AddressesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get() list(@CurrentUser() u: AuthUser) {
    return this.prisma.client.address.findMany({ where: { userId: u.id }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
  }

  @Post() async create(@CurrentUser() u: AuthUser, @Body() dto: AddressDto) {
    const count = await this.prisma.client.address.count({ where: { userId: u.id } });
    if (count >= MAX_ADDRESSES) throw new NotFoundException('Maksimal 10 alamat');
    const isDefault = dto.isDefault || count === 0;
    return this.prisma.client.$transaction(async (tx) => {
      if (isDefault) await tx.address.updateMany({ where: { userId: u.id, isDefault: true }, data: { isDefault: false } });
      return tx.address.create({ data: { ...dto, isDefault, userId: u.id } });
    });
  }

  @Patch(':id') async update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: AddressDto) {
    const found = await this.prisma.client.address.findFirst({ where: { id, userId: u.id } });
    if (!found) throw new NotFoundException('Alamat tidak ditemukan');
    return this.prisma.client.$transaction(async (tx) => {
      if (dto.isDefault) await tx.address.updateMany({ where: { userId: u.id, isDefault: true, id: { not: id } }, data: { isDefault: false } });
      return tx.address.update({ where: { id }, data: { ...dto, isDefault: dto.isDefault ?? found.isDefault } });
    });
  }

  @Delete(':id') async remove(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    await this.prisma.client.address.deleteMany({ where: { id, userId: u.id } });
    return { ok: true };
  }
}
