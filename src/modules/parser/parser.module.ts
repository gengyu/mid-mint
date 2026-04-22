import { Module } from '@nestjs/common';

import { MarkdownParser } from './parsers/markdown.parser';
import { TxtParser } from './parsers/txt.parser';
import { ParserService } from './parser.service';

@Module({
  providers: [MarkdownParser, TxtParser, ParserService],
  exports: [ParserService],
})
export class ParserModule {}
