import { Injectable } from '@nestjs/common';

import { DocumentSection } from '../types/document-section.type';
import { ParsedDocument } from '../types/parsed-document.type';

@Injectable()
export class MarkdownParser {
  parse(content: string, sourceType: 'markdown' | 'txt'): ParsedDocument {
    const lines = content.split(/\r?\n/);
    const sections: DocumentSection[] = [];
    const paragraphs: string[] = [];
    let currentSection: DocumentSection | null = null;
    let fallbackTitle = 'Untitled Presentation';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        continue;
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        currentSection = {
          level: headingMatch[1].length,
          title: headingMatch[2].trim(),
          body: '',
          bullets: [],
        };
        sections.push(currentSection);
        if (sections.length === 1) {
          fallbackTitle = currentSection.title;
        }
        continue;
      }

      const bulletMatch = line.match(/^[-*+]\s+(.*)$/);
      if (bulletMatch) {
        const bulletText = bulletMatch[1].trim();
        if (currentSection) {
          currentSection.bullets.push(bulletText);
        }
        paragraphs.push(bulletText);
        continue;
      }

      if (currentSection) {
        currentSection.body = currentSection.body
          ? `${currentSection.body}\n${line}`
          : line;
      } else if (paragraphs.length === 0) {
        fallbackTitle = line;
      }

      paragraphs.push(line);
    }

    if (sections.length === 0) {
      sections.push({
        level: 1,
        title: fallbackTitle,
        body: paragraphs.join('\n'),
        bullets: paragraphs.slice(0, 6),
      });
    }

    return {
      title: fallbackTitle,
      sourceType,
      rawText: content,
      sections,
      paragraphs,
    };
  }
}
