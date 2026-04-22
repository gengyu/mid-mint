import { Injectable } from '@nestjs/common';
import PptxGenJS from 'pptxgenjs';

import { PPT_AUTHOR, PPT_LAYOUT } from '../../config/ppt.config';
import { SlideSpec } from '../slides/slide.types';
import { renderAgendaTemplate } from './templates/agenda.template';
import { renderComparisonTemplate } from './templates/comparison.template';
import { renderCoverTemplate } from './templates/cover.template';
import { renderProcessTemplate } from './templates/process.template';
import { renderQuoteTemplate } from './templates/quote.template';
import { renderSectionDividerTemplate } from './templates/section-divider.template';
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
      slide.background = { color: spec.layout === 'cover' ? '0B1F33' : 'F6F8FC' };

      switch (spec.layout) {
        case 'cover':
          renderCoverTemplate(slide, spec);
          break;
        case 'agenda':
          renderAgendaTemplate(slide, spec);
          break;
        case 'section-divider':
          renderSectionDividerTemplate(slide, spec);
          break;
        case 'comparison':
          renderComparisonTemplate(slide, spec);
          break;
        case 'process':
          renderProcessTemplate(slide, spec);
          break;
        case 'quote':
          renderQuoteTemplate(slide, spec);
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
