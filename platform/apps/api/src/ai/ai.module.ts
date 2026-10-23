import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { SellerModule } from '../seller/seller.module.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';

@Module({ imports: [CatalogModule, SellerModule], controllers: [AiController], providers: [AiService] })
export class AiModule {}
