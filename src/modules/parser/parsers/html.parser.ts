import { Injectable } from '@nestjs/common';
import { compile } from 'html-to-text';

import { ParsedDocument } from '../types/parsed-document.type';
import { StructuredTextParser } from './structured-text.parser';

@Injectable()
export class HtmlParser {
  constructor(private readonly structuredTextParser: StructuredTextParser) {}

  private readonly toText = compile({
    wordwrap: false,
    selectors: [
      { selector: 'a', options: { ignoreHref: true } },
      { selector: 'img', format: 'skip' },
    ],
  });

  parse(content: string): ParsedDocument {
    const rawText = this.toText(content);
    return this.structuredTextParser.parse(rawText, 'html', {
      titleOverride: this.extractTitle(content) ?? undefined,
    });
  }

  private extractTitle(content: string): string | null {
    const titleMatch = content.match(/<title[^>]*>(.*?)<\/title>/i);
    return titleMatch?.[1]?.trim() || null;
  }
}
