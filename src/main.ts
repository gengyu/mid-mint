import 'dotenv/config';

import { NestFactory } from '@nestjs/core';

import { APP_PORT } from './config/app.config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  await app.listen(APP_PORT);
}

void bootstrap();
