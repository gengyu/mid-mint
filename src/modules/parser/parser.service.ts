import { Injectable } from '@nestjs/common';

import { DocxParser } from './parsers/docx.parser';
import { HtmlParser } from './parsers/html.parser';
import { MarkdownParser } from './parsers/markdown.parser';
import { DocumentSourceType, ParsedDocument } from './types/parsed-document.type';

@Injectable()
export class ParserService {
  constructor(
    private readonly markdownParser: MarkdownParser,
    private readonly htmlParser: HtmlParser,
    private readonly docxParser: DocxParser,
  ) {}

  async parse(content: string, sourceType: DocumentSourceType): Promise<ParsedDocument> {
    switch (sourceType) {
      case 'html':
        return this.htmlParser.parse(content);
      case 'docx':
        return this.docxParser.parse(content);
      case 'markdown':
      case 'txt':
      default:
        return this.markdownParser.parse(content, sourceType);
    }
  }
}
