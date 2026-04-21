import { Module } from '@nestjs/common';

import { SvgGeneratorService } from './svg-generator.service';

@Module({
  providers: [SvgGeneratorService],
  exports: [SvgGeneratorService],
})
export class VisualsModule {}
