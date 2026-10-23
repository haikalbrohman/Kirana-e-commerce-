import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { APP_CONFIG, type AppConfig } from './config.js';
import { PrismaExceptionFilter } from './common/prisma-exception.filter.js';

export function configureApp(app: NestExpressApplication) {
  const config = app.get<AppConfig>(APP_CONFIG);
  app.set('trust proxy', 1); // di belakang load balancer hosting
  app.use(helmet());
  // Hanya web Shopia yang boleh memanggil API dari browser
  app.enableCors({ origin: config.webOrigin, credentials: false });
  app.useBodyParser('json', { limit: '1mb' });
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: false } }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter());
  if (config.storage.driver === 'local') {
    // Foto produk (mode lokal). Di production gunakan object storage (S3/R2).
    app.useStaticAssets(config.storage.localDir, { prefix: '/uploads/', maxAge: '7d', dotfiles: 'deny', index: false });
  }
  return config;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  const config = configureApp(app);
  app.enableShutdownHooks();
  await app.listen(config.port);
  new Logger('Shopia').log(`API berjalan di port ${config.port} (${config.nodeEnv})`);
}

if (process.env.SHOPIA_NO_LISTEN !== '1') await bootstrap();
