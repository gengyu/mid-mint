import { Module } from '@nestjs/common';

import { PptxRendererService } from './pptx-renderer.service';

@Module({
  providers: [PptxRendererService],
  exports: [PptxRendererService],
})
export class RendererModule {}
