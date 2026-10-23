import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators.js';
import { CartService } from './cart.service.js';

class AddItemDto {
  @IsString() @MaxLength(40) variantId!: string;
  @IsInt() @Min(1) @Max(999) quantity!: number;
}
class UpdateItemDto {
  @IsInt() @Min(1) @Max(999) quantity!: number;
}

@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get() get(@CurrentUser() u: AuthUser) {
    return this.cart.get(u.id);
  }
  @Post('items') add(@CurrentUser() u: AuthUser, @Body() dto: AddItemDto) {
    return this.cart.add(u.id, dto.variantId, dto.quantity);
  }
  @Patch('items/:id') update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.cart.update(u.id, id, dto.quantity);
  }
  @Delete('items/:id') remove(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.cart.remove(u.id, id);
  }
}
