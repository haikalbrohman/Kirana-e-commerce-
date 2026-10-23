import { Module } from '@nestjs/common';
import { CommerceModule } from '../commerce.module.js';
import { StorageService } from '../storage/storage.service.js';
import { SellerController } from './seller.controller.js';
import { SellerService } from './seller.service.js';

@Module({ imports: [CommerceModule], controllers: [SellerController], providers: [SellerService, StorageService], exports: [SellerService] })
export class SellerModule {}
