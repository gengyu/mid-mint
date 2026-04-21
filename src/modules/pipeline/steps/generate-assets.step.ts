import { Injectable } from '@nestjs/common';

import { ProjectStorageService } from '../../storage/project-storage.service';
import { SvgGeneratorService } from '../../visuals/svg-generator.service';
import { SlideSpec } from '../../slides/slide.types';

@Injectable()
export class GenerateAssetsStep {
  constructor(
    private readonly svgGeneratorService: SvgGeneratorService,
    private readonly projectStorageService: ProjectStorageService,
  ) {}

  async run(projectId: string, slides: SlideSpec[]): Promise<SlideSpec[]> {
    const generatedAssets = this.svgGeneratorService.generate(slides);
    const assetPathBySlide = new Map<number, string>();

    for (const asset of generatedAssets) {
      const filePath = await this.projectStorageService.writeAsset(projectId, asset.fileName, asset.svg);
      assetPathBySlide.set(asset.slideNumber, filePath);
    }

    return slides.map((slide) => ({
      ...slide,
      assetPath: assetPathBySlide.get(slide.slideNumber),
    }));
  }
}
