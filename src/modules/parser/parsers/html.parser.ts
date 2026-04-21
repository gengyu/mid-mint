import { Injectable } from '@nestjs/common';
import { compile } from 'html-to-text';

import { DocumentSection } from '../types/document-section.type';
import { ParsedDocument } from '../types/parsed-document.type';

@Injectable()
export class HtmlParser {
  private readonly toText = compile({
    wordwrap: false,
    selectors: [
      { selector: 'a', options: { ignoreHref: true } },
      { selector: 'img', format: 'skip' },
    ],
  });

  parse(content: string): ParsedDocument {
    const rawText = this.toText(content);
    const paragraphs = rawText
      .split(/\n+/)
      .map((line: string) => line.trim())
      .filter(Boolean);
    const title = this.extractTitle(content) ?? paragraphs[0] ?? 'Untitled Presentation';

    const sections: DocumentSection[] = [
      {
        level: 1,
        title,
        body: paragraphs.join('\n'),
        bullets: paragraphs.slice(1, 7),
      },
    ];

    return {
      title,
      sourceType: 'html',
      rawText,
      sections,
      paragraphs,
    };
  }

  private extractTitle(content: string): string | null {
    const titleMatch = content.match(/<title[^>]*>(.*?)<\/title>/i);
    return titleMatch?.[1]?.trim() || null;
  }
}
