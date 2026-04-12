import { Module } from '@nestjs/common';
import { TemplatesController } from './templates.controller';

@Module({
  controllers: [TemplatesController],
  providers: [],
})
export class TemplatesModule {}
