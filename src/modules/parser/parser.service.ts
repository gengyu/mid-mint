import { Injectable } from '@nestjs/common';

import { DocxParser } from './parsers/docx.parser';
import { HtmlParser } from './parsers/html.parser';
import { MarkdownParser } from './parsers/markdown.parser';
import { TxtParser } from './parsers/txt.parser';
import { DocumentSourceType, ParsedDocument } from './types/parsed-document.type';

@Injectable()
export class ParserService {
  constructor(
    private readonly markdownParser: MarkdownParser,
    private readonly txtParser: TxtParser,
    private readonly htmlParser: HtmlParser,
    private readonly docxParser: DocxParser,
  ) {}

  async parse(content: string, sourceType: DocumentSourceType): Promise<ParsedDocument> {
    switch (sourceType) {
      case 'txt':
        return this.txtParser.parse(content);
      case 'html':
        return this.htmlParser.parse(content);
      case 'docx':
        return this.docxParser.parse(content);
      case 'markdown':
      default:
        return this.markdownParser.parse(content, 'markdown');
    }
  }
}
