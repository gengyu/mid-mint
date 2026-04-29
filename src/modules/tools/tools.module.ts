import { Module } from '@nestjs/common';

import { DocumentParserTool } from './document-parser/document-parser.tool';
import { HtmlParser } from './document-parser/parsers/html.parser';
import { MarkdownParser } from './document-parser/parsers/markdown.parser';
import { StructuredTextParser } from './document-parser/parsers/structured-text.parser';
import { TxtParser } from './document-parser/parsers/txt.parser';

@Module({
  providers: [MarkdownParser, StructuredTextParser, TxtParser, HtmlParser, DocumentParserTool],
  exports: [DocumentParserTool],
})
export class ToolsModule {}
