import { Injectable } from '@nestjs/common';
import { tool } from '@langchain/core/tools';

import { HtmlParser } from './parsers/html.parser';
import { MarkdownParser } from './parsers/markdown.parser';
import { TxtParser } from './parsers/txt.parser';
import { DocumentSourceType, ParsedDocument } from './types/parsed-document.type';

interface DocumentParserToolInput {
  content: string;
  sourceType: DocumentSourceType;
}

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

  asLangChainTool() {
    return tool(
      async (input) => {
        const parserInput = input as DocumentParserToolInput;
        const parsedDocument = await this.parse(
          parserInput.content,
          parserInput.sourceType,
        );
        return JSON.stringify(parsedDocument);
      },
      {
        name: 'document_parser',
        description:
          'Parse Markdown, plain text, or HTML source content into a structured presentation document.',
        schema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'Raw source document content.',
            },
            sourceType: {
              type: 'string',
              enum: ['markdown', 'txt', 'html'],
              description: 'Source document format.',
            },
          },
          required: ['content', 'sourceType'],
          additionalProperties: false,
        },
      },
    );
  }
}
