import { Module } from '@nestjs/common';

import { PptDslBuilderService } from './ppt-dsl-builder.service';

@Module({
  providers: [PptDslBuilderService],
  exports: [PptDslBuilderService],
})
export class PptDslModule {}
