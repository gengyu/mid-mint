import { Injectable } from '@nestjs/common';

import { ParserService } from '../../parser/parser.service';
import { ParsedDocument } from '../../parser/types/parsed-document.type';

@Injectable()
export class ParseDocumentStep {
  constructor(private readonly parserService: ParserService) {}

  run(content: string, sourceType: 'markdown' | 'txt'): ParsedDocument {
    return this.parserService.parse(content, sourceType);
  }
}
