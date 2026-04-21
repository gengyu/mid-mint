import { Injectable } from '@nestjs/common';
import mammoth from 'mammoth';

import { DocumentSection } from '../types/document-section.type';
import { ParsedDocument } from '../types/parsed-document.type';

@Injectable()
export class DocxParser {
  async parse(base64Content: string): Promise<ParsedDocument> {
    const buffer = Buffer.from(base64Content, 'base64');
    const result = await mammoth.extractRawText({ buffer });
    const rawText = result.value.trim();
    const paragraphs = rawText
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    const title = paragraphs[0] ?? 'Untitled Presentation';

    const sections: DocumentSection[] = [
      {
        level: 1,
        title,
        body: paragraphs.join('\n'),
        bullets: paragraphs.slice(1, 7),
      },
    ];

    return {
      title,
      sourceType: 'docx',
      rawText,
      sections,
      paragraphs,
    };
  }
}
