import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, IsUrl, Length, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';

export class StoreDto {
  @IsString() @Length(3, 60) name!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsString() @MaxLength(60) city?: string;
  @IsOptional() @IsBoolean() isUmkm?: boolean;
  @IsOptional() @IsUrl({ require_tld: false }) logoUrl?: string;
}

export class VariantDto {
  @IsOptional() @IsString() @MaxLength(40) id?: string;
  @IsString() @Length(1, 60) name!: string;
  @IsOptional() @IsObject() options?: Record<string, string>;
  @IsOptional() @IsString() @MaxLength(60) sku?: string;
  @IsInt() @Min(100) @Max(1_000_000_000) price!: number;
  @IsOptional() @IsInt() @Min(0) compareAtPrice?: number | null;
  @IsInt() @Min(0) @Max(1_000_000) stock!: number;
  @IsOptional() @IsInt() @Min(1) @Max(100_000) weightGram?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ImageDto {
  @IsUrl({ require_tld: false }) url!: string;
  @IsOptional() @IsString() @MaxLength(120) alt?: string;
}

export class ProductDto {
  @IsString() @Length(5, 150) name!: string;
  @IsString() @MaxLength(40) categoryId!: string;
  @IsString() @Length(20, 5000) description!: string;
  @IsOptional() @IsObject() attributes?: Record<string, string>;
  @IsOptional() @IsArray() @ArrayMaxSize(15) @IsString({ each: true }) @MaxLength(30, { each: true }) tags?: string[];
  @IsIn(['DRAFT', 'ACTIVE']) status!: 'DRAFT' | 'ACTIVE';
  @IsArray() @ArrayMaxSize(8) @ValidateNested({ each: true }) @Type(() => ImageDto) images!: ImageDto[];
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => VariantDto) variants!: VariantDto[];
}

export class ShipDto {
  @IsString() @Length(5, 40) trackingNumber!: string;
  @IsOptional() @IsString() @MaxLength(30) courier?: string;
}
