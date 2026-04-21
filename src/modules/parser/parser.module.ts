import { Module } from '@nestjs/common';

import { DocxParser } from './parsers/docx.parser';
import { HtmlParser } from './parsers/html.parser';
import { MarkdownParser } from './parsers/markdown.parser';
import { ParserService } from './parser.service';

@Module({
  providers: [MarkdownParser, HtmlParser, DocxParser, ParserService],
  exports: [ParserService],
})
export class ParserModule {}
