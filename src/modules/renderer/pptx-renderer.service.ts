import path from 'node:path';

import { Injectable } from '@nestjs/common';
import PptxGenJS from 'pptxgenjs';

import { ensureDir } from '../../common/utils/file.util';
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
    await ensureDir(path.dirname(filePath));

    const globalScope = globalThis as any;
    const previousValues = {
      window: globalScope.window,
      document: globalScope.document,
      navigator: globalScope.navigator,
      XMLHttpRequest: globalScope.XMLHttpRequest,
      FileReader: globalScope.FileReader,
    };

    this.clearBrowserGlobals(globalScope);

    try {
      const pptx = new PptxGenJS();
      pptx.layout = PPT_LAYOUT;
      pptx.author = PPT_AUTHOR;
      pptx.company = 'mid-mint';
      pptx.subject = title;
      pptx.title = title;
      pptx.theme = {
        headFontFace: 'Aptos Display',
        bodyFontFace: 'Aptos',
      };

      for (const spec of slides) {
        const slide = pptx.addSlide();
        slide.background = { color: spec.layout === 'cover' ? '0B1F33' : 'F6F8FC' };

        this.renderSlide(slide, spec);

        if (spec.notes) {
          slide.addNotes(spec.notes);
        }
      }

      await pptx.writeFile({ fileName: filePath, compression: true });
    } finally {
      this.restoreGlobalValue(globalScope, 'window', previousValues.window);
      this.restoreGlobalValue(globalScope, 'document', previousValues.document);
      this.restoreGlobalValue(globalScope, 'navigator', previousValues.navigator);
      this.restoreGlobalValue(globalScope, 'XMLHttpRequest', previousValues.XMLHttpRequest);
      this.restoreGlobalValue(globalScope, 'FileReader', previousValues.FileReader);
    }
  }

  private renderSlide(slide: PptxGenJS.Slide, spec: SlideSpec): void {
    switch (spec.layout) {
      case 'cover':
        renderCoverTemplate(slide, spec);
        return;
      case 'agenda':
        renderAgendaTemplate(slide, spec);
        return;
      case 'section-divider':
        renderSectionDividerTemplate(slide, spec);
        return;
      case 'comparison':
        renderComparisonTemplate(slide, spec);
        return;
      case 'process':
        renderProcessTemplate(slide, spec);
        return;
      case 'quote':
        renderQuoteTemplate(slide, spec);
        return;
      case 'text-visual':
        renderTextVisualTemplate(slide, spec);
        return;
      case 'summary-closing':
      default:
        renderTitleBulletsTemplate(slide, spec);
    }
  }

  private clearBrowserGlobals(globalScope: any): void {
    delete globalScope.window;
    delete globalScope.document;
    delete globalScope.navigator;
    delete globalScope.XMLHttpRequest;
    delete globalScope.FileReader;
  }

  private restoreGlobalValue(globalScope: any, key: string, value: unknown): void {
    if (typeof value === 'undefined') {
      delete globalScope[key];
      return;
    }

    globalScope[key] = value;
  }
}
