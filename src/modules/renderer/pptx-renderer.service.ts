import { Injectable } from '@nestjs/common';
import PptxGenJS from 'pptxgenjs';

import { PPT_AUTHOR, PPT_LAYOUT } from '../../config/ppt.config';
import { SlideSpec } from '../slides/slide.types';
import { renderComparisonTemplate } from './templates/comparison.template';
import { renderCoverTemplate } from './templates/cover.template';
import { renderTextVisualTemplate } from './templates/text-visual.template';
import { renderTitleBulletsTemplate } from './templates/title-bullets.template';

@Injectable()
export class PptxRendererService {
  async render(filePath: string, title: string, slides: SlideSpec[]): Promise<void> {
    const pptx = new PptxGenJS();
    pptx.layout = PPT_LAYOUT;
    pptx.author = PPT_AUTHOR;
    pptx.subject = title;
    pptx.title = title;

    for (const spec of slides) {
      const slide = pptx.addSlide();
      slide.background = { color: 'F8FAFC' };

      switch (spec.layout) {
        case 'cover':
          renderCoverTemplate(slide, spec);
          break;
        case 'comparison':
          renderComparisonTemplate(slide, spec);
          break;
        case 'text-visual':
          renderTextVisualTemplate(slide, spec);
          break;
        case 'title-bullets':
        default:
          renderTitleBulletsTemplate(slide, spec);
          break;
      }

      if (spec.notes) {
        slide.addNotes(spec.notes);
      }
    }

    await pptx.writeFile({ fileName: filePath });
  }
}
