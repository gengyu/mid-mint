import { Injectable } from '@nestjs/common';

import { MarkdownParser } from './parsers/markdown.parser';
import { TxtParser } from './parsers/txt.parser';
import { ParsedDocument } from './types/parsed-document.type';

@Injectable()
export class ParserService {
  constructor(
    private readonly markdownParser: MarkdownParser,
    private readonly txtParser: TxtParser,
  ) {}

  parse(content: string, sourceType: 'markdown' | 'txt'): ParsedDocument {
    if (sourceType === 'txt') {
      return this.txtParser.parse(content);
    }

    return this.markdownParser.parse(content, sourceType);
  }
}
