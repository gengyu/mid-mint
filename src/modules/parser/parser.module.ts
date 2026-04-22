import { Module } from '@nestjs/common';

import { HtmlParser } from './parsers/html.parser';
import { MarkdownParser } from './parsers/markdown.parser';
import { StructuredTextParser } from './parsers/structured-text.parser';
import { TxtParser } from './parsers/txt.parser';
import { ParserService } from './parser.service';

@Module({
  providers: [MarkdownParser, StructuredTextParser, TxtParser, HtmlParser, ParserService],
  exports: [ParserService],
})
export class ParserModule {}
