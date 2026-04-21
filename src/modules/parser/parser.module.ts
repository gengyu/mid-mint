import { Module } from '@nestjs/common';

import { MarkdownParser } from './parsers/markdown.parser';
import { ParserService } from './parser.service';

@Module({
  providers: [MarkdownParser, ParserService],
  exports: [ParserService],
})
export class ParserModule {}
