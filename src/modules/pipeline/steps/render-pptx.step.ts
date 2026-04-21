import { Injectable } from '@nestjs/common';

import { PptxRendererService } from '../../renderer/pptx-renderer.service';
import { SlideSpec } from '../../slides/slide.types';
import { ProjectStorageService } from '../../storage/project-storage.service';

@Injectable()
export class RenderPptxStep {
  constructor(
    private readonly pptxRendererService: PptxRendererService,
    private readonly projectStorageService: ProjectStorageService,
  ) {}

  async run(projectId: string, title: string, slides: SlideSpec[]): Promise<string> {
    const outputPath = this.projectStorageService.getOutputPptxPath(projectId, title);
    await this.pptxRendererService.render(outputPath, title, slides);
    return outputPath;
  }
}
