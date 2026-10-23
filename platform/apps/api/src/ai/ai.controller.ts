import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsObject, IsOptional, IsString, Length, MaxLength, ValidateNested } from 'class-validator';
import { CurrentUser, Public, Roles, type AuthUser } from '../auth/auth.decorators.js';
import { clampInt } from '../common/util.js';
import { AiService } from './ai.service.js';

class ChatMessageDto {
  @IsIn(['user', 'assistant']) role!: 'user' | 'assistant';
  @IsString() @Length(1, 2000) content!: string;
}
class AssistantDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => ChatMessageDto) messages!: ChatMessageDto[];
}
class CompareDto {
  @IsArray() @ArrayMinSize(2) @ArrayMaxSize(4) @IsString({ each: true }) @MaxLength(40, { each: true }) productIds!: string[];
}
class SellerCopyDto {
  @IsString() @Length(3, 150) name!: string;
  @IsString() @Length(10, 2000) facts!: string;
  @IsOptional() @IsObject() attributes?: Record<string, string>;
}

@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Public() @Get('status')
  status() {
    return { mode: this.ai.mode };
  }

  /** Pencarian bahasa alami -> filter katalog -> hasil */
  @Public() @Get('search') @Throttle({ default: { limit: 30, ttl: 60_000 } })
  search(@Query('q') q: string, @Query('page') page?: string, @CurrentUser() u?: AuthUser) {
    return this.ai.search(String(q ?? '').slice(0, 300), u?.id, clampInt(page, 1, 50, 1));
  }

  @Public() @Post('assistant') @HttpCode(200) @Throttle({ default: { limit: 15, ttl: 60_000 } })
  assistant(@Body() dto: AssistantDto, @CurrentUser() u?: AuthUser) {
    return this.ai.assistant(dto.messages, u?.id);
  }

  @Public() @Post('compare') @HttpCode(200) @Throttle({ default: { limit: 15, ttl: 60_000 } })
  compare(@Body() dto: CompareDto, @CurrentUser() u?: AuthUser) {
    return this.ai.compare(dto.productIds, u?.id);
  }

  @Roles('SELLER') @Post('seller/copy') @HttpCode(200) @Throttle({ default: { limit: 10, ttl: 60_000 } })
  sellerCopy(@CurrentUser() u: AuthUser, @Body() dto: SellerCopyDto) {
    return this.ai.sellerCopy(u.id, dto);
  }

  @Roles('SELLER') @Get('seller/insight') @Throttle({ default: { limit: 10, ttl: 60_000 } })
  sellerInsight(@CurrentUser() u: AuthUser) {
    return this.ai.sellerInsight(u.id);
  }
}
