import { Injectable } from '@nestjs/common';

import { DocumentParserTool } from './document-parser/document-parser.tool';

@Injectable()
export class ToolRegistryService {
  constructor(private readonly documentParserTool: DocumentParserTool) {}

  getLangChainTools() {
    return [this.documentParserTool.asLangChainTool()];
  }
}
