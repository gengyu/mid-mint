import { Injectable } from '@nestjs/common';

import { MarkdownParser } from './parsers/markdown.parser';
import { ParsedDocument } from './types/parsed-document.type';

@Injectable()
export class ParserService {
  constructor(private readonly markdownParser: MarkdownParser) {}

  parse(content: string, sourceType: 'markdown' | 'txt'): ParsedDocument {
    return this.markdownParser.parse(content, sourceType);
  }
}
