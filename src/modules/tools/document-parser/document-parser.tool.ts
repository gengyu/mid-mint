import { Injectable } from '@nestjs/common';

import { HtmlParser } from './parsers/html.parser';
import { MarkdownParser } from './parsers/markdown.parser';
import { TxtParser } from './parsers/txt.parser';
import { DocumentSourceType, ParsedDocument } from './types/parsed-document.type';

@Injectable()
export class DocumentParserTool {
  constructor(
    private readonly markdownParser: MarkdownParser,
    private readonly txtParser: TxtParser,
    private readonly htmlParser: HtmlParser,
  ) {}

  async parse(content: string, sourceType: DocumentSourceType): Promise<ParsedDocument> {
    switch (sourceType) {
      case 'txt':
        return this.txtParser.parse(content);
      case 'html':
        return this.htmlParser.parse(content);
      case 'markdown':
      default:
        return this.markdownParser.parse(content, 'markdown');
    }
  }
}
