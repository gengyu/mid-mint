import { Module } from '@nestjs/common';

import { SlideSpecService } from './slide-spec.service';

@Module({
  providers: [SlideSpecService],
  exports: [SlideSpecService],
})
export class SlidesModule {}
