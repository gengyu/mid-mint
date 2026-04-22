import { Injectable } from '@nestjs/common';
import { Lexer, Tokens } from 'marked';

import { DocumentSection } from '../types/document-section.type';
import { ParsedDocument } from '../types/parsed-document.type';

@Injectable()
export class MarkdownParser {
  parse(content: string, sourceType: 'markdown' | 'txt'): ParsedDocument {
    const sections: DocumentSection[] = [];
    const paragraphs: string[] = [];
    const introParagraphs: string[] = [];
    let currentSection: DocumentSection | null = null;
    let title = 'Untitled Presentation';

    for (const token of Lexer.lex(content)) {
      if (this.isHeadingToken(token)) {
        const headingTitle = token.text.trim();
        if (!headingTitle) {
          continue;
        }

        if (title === 'Untitled Presentation' && token.depth === 1) {
          title = headingTitle;
          paragraphs.push(headingTitle);
          currentSection = null;
          continue;
        }

        currentSection = {
          level: token.depth,
          title: headingTitle,
          body: '',
          bullets: [],
        };
        sections.push(currentSection);
        if (title === 'Untitled Presentation') {
          title = headingTitle;
        }
        paragraphs.push(headingTitle);
        continue;
      }

      if (this.isParagraphToken(token)) {
        const paragraphText = this.normalizeText(token.text);
        if (!paragraphText) {
          continue;
        }

        if (currentSection) {
          currentSection.body = currentSection.body
            ? `${currentSection.body}\n${paragraphText}`
            : paragraphText;
        } else {
          introParagraphs.push(paragraphText);
          if (title === 'Untitled Presentation') {
            title = paragraphText;
          }
        }

        paragraphs.push(paragraphText);
        continue;
      }

      if (this.isListToken(token)) {
        const bulletTexts = token.items
          .map((item) => this.normalizeText(item.text))
          .filter((item) => item.length > 0);

        if (bulletTexts.length === 0) {
          continue;
        }

        if (currentSection) {
          currentSection.bullets.push(...bulletTexts);
        } else {
          introParagraphs.push(...bulletTexts);
        }

        paragraphs.push(...bulletTexts);
        continue;
      }

      if (this.isCodeToken(token)) {
        const codeText = this.normalizeText(token.text);
        if (!codeText) {
          continue;
        }

        if (currentSection) {
          currentSection.body = currentSection.body
            ? `${currentSection.body}\n${codeText}`
            : codeText;
        } else {
          introParagraphs.push(codeText);
        }

        paragraphs.push(codeText);
        continue;
      }
    }

    if (sections.length > 0 && introParagraphs.length > 0) {
      sections.unshift({
        level: 2,
        title: 'Overview',
        body: introParagraphs.join('\n'),
        bullets: introParagraphs.slice(0, 4),
      });
    }

    if (sections.length === 0) {
      sections.push({
        level: 1,
        title,
        body: paragraphs.join('\n'),
        bullets: paragraphs.slice(0, 6),
      });
    }

    return {
      title,
      sourceType,
      rawText: content,
      sections,
      paragraphs,
    };
  }

  private normalizeText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  private isHeadingToken(token: Tokens.Generic): token is Tokens.Heading {
    return token.type === 'heading';
  }

  private isParagraphToken(token: Tokens.Generic): token is Tokens.Paragraph {
    return token.type === 'paragraph';
  }

  private isListToken(token: Tokens.Generic): token is Tokens.List {
    return token.type === 'list';
  }

  private isCodeToken(token: Tokens.Generic): token is Tokens.Code {
    return token.type === 'code';
  }
}
