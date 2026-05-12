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
    const parsed = this.structuredTextParser.parse(rawText, 'html', {
      titleOverride: this.extractTitle(content) ?? undefined,
    });
    const formulas = this.extractFormulas(content);

    if (formulas.length > 0) {
      parsed.sections = parsed.sections.map((section, index) =>
        index === 0
          ? {
              ...section,
              formulas: Array.from(new Set([...(section.formulas ?? []), ...formulas])),
            }
          : section,
      );
    }

    return parsed;
  }

  private extractTitle(content: string): string | null {
    const titleMatch = content.match(/<title[^>]*>(.*?)<\/title>/i);
    return titleMatch?.[1]?.trim() || null;
  }

  private extractFormulas(content: string): string[] {
    return (content.match(/\$\$[\s\S]+?\$\$|\$[^$\n]+\$/g) ?? []).map((item) => item.trim());
  }
}
