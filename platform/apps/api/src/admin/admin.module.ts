import { Module } from '@nestjs/common';
import { CommerceModule } from '../commerce.module.js';
import { AdminController } from './admin.controller.js';

@Module({ imports: [CommerceModule], controllers: [AdminController] })
export class AdminModule {}
