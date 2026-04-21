import { Injectable } from '@nestjs/common';
import { Lexer, Tokens } from 'marked';

import { DocumentSection } from '../types/document-section.type';
import { DocumentSourceType, ParsedDocument } from '../types/parsed-document.type';

@Injectable()
export class MarkdownParser {
  parse(content: string, sourceType: Extract<DocumentSourceType, 'markdown' | 'txt'>): ParsedDocument {
    if (sourceType === 'txt') {
      return this.parseTxt(content, sourceType);
    }

    const tokens = Lexer.lex(content);
    const sections: DocumentSection[] = [];
    const paragraphs: string[] = [];
    let currentSection: DocumentSection | null = null;
    let fallbackTitle = 'Untitled Presentation';

    for (const token of tokens) {
      if (token.type === 'heading') {
        currentSection = {
          level: token.depth,
          title: token.text.trim(),
          body: '',
          bullets: [],
        };
        sections.push(currentSection);
        if (sections.length === 1) {
          fallbackTitle = currentSection.title;
        }
        continue;
      }

      if (token.type === 'list') {
        const bullets = this.extractListItems(token as Tokens.List);
        if (currentSection) {
          currentSection.bullets.push(...bullets);
        }
        paragraphs.push(...bullets);
        continue;
      }

      if (token.type !== 'paragraph' && token.type !== 'text') {
        continue;
      }

      const line = token.text.trim();
      if (!line) {
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

  private parseTxt(content: string, sourceType: 'txt'): ParsedDocument {
    const paragraphs = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const title = paragraphs[0] ?? 'Untitled Presentation';

    return {
      title,
      sourceType,
      rawText: content,
      sections: [
        {
          level: 1,
          title,
          body: paragraphs.join('\n'),
          bullets: paragraphs.slice(1, 7),
        },
      ],
      paragraphs,
    };
  }

  private extractListItems(token: Tokens.List): string[] {
    return token.items
      .map((item) => item.text.trim())
      .filter((item) => item.length > 0);
  }
}
