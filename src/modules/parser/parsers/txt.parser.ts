import { Injectable } from '@nestjs/common';

import { ParsedDocument } from '../types/parsed-document.type';
import { StructuredTextParser } from './structured-text.parser';

@Injectable()
export class TxtParser {
  constructor(private readonly structuredTextParser: StructuredTextParser) {}

  parse(content: string): ParsedDocument {
    return this.structuredTextParser.parse(content, 'txt');
  }
}
