import { Injectable } from '@nestjs/common';
import { Lexer, Tokens } from 'marked';

import { DocumentCodeBlock, DocumentSection, DocumentTableData } from '../types/document-section.type';
import { ParsedDocument } from '../types/parsed-document.type';

@Injectable()
export class MarkdownParser {
  parse(content: string, sourceType: 'markdown'): ParsedDocument {
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
          codeBlocks: [],
          formulas: [],
          mermaidDefinitions: [],
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
        const codeContent = token.text.trim();
        if (!codeContent) {
          continue;
        }

        if (currentSection) {
          if (token.lang?.trim().toLowerCase() === 'mermaid') {
            currentSection.mermaidDefinitions = [
              ...(currentSection.mermaidDefinitions ?? []),
              codeContent,
            ];
            const summarized = this.summarizeCodeBlock(codeContent);
            if (summarized) {
              currentSection.body = currentSection.body
                ? `${currentSection.body}\n${summarized}`
                : summarized;
            }
          } else {
            currentSection.codeBlocks = [
              ...(currentSection.codeBlocks ?? []),
              {
                language: token.lang?.trim() || undefined,
                content: codeContent,
              } satisfies DocumentCodeBlock,
            ];
            const summarized = this.summarizeCodeBlock(codeContent);
            currentSection.body = currentSection.body
              ? `${currentSection.body}\n${summarized}`
              : summarized;
          }

          currentSection.formulas = this.mergeFormulas(
            currentSection.formulas,
            this.extractFormulas(codeContent),
          );
        } else {
          introParagraphs.push(this.summarizeCodeBlock(codeContent));
        }

        paragraphs.push(codeContent);
        continue;
      }

      if (this.isTableToken(token)) {
        const tableData = this.extractTableData(token);
        if (!tableData) {
          continue;
        }

        if (currentSection) {
          currentSection.tableData = tableData;
          currentSection.bullets.push(
            ...tableData.rows
              .map((row) => row.filter(Boolean).join(' vs '))
              .filter((row) => row.length > 0)
              .slice(0, 4),
          );
        } else {
          introParagraphs.push(...tableData.rows.map((row) => row.join(' | ')));
        }

        paragraphs.push(
          ...(tableData.headers ?? []),
          ...tableData.rows.map((row) => row.join(' | ')),
        );
        continue;
      }

      if (this.isHtmlToken(token)) {
        const htmlText = this.normalizeText(token.text);
        if (!htmlText) {
          continue;
        }

        if (currentSection) {
          currentSection.body = currentSection.body
            ? `${currentSection.body}\n${htmlText}`
            : htmlText;
          currentSection.formulas = this.mergeFormulas(
            currentSection.formulas,
            this.extractFormulas(htmlText),
          );
        } else {
          introParagraphs.push(htmlText);
        }

        paragraphs.push(htmlText);
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

  private summarizeCodeBlock(value: string): string {
    const compact = value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 4)
      .join(' ');

    return this.normalizeText(compact);
  }

  private extractFormulas(content: string): string[] {
    const matches = content.match(/\$\$[\s\S]+?\$\$|\$[^$\n]+\$/g) ?? [];
    return matches.map((item) => item.trim()).filter(Boolean);
  }

  private mergeFormulas(existing: string[] | undefined, incoming: string[]): string[] {
    return Array.from(new Set([...(existing ?? []), ...incoming]));
  }

  private extractTableData(token: Tokens.Table): DocumentTableData | null {
    const headers = token.header
      ?.map((cell) => this.normalizeText(cell.text))
      .filter((cell) => cell.length > 0);
    const rows = token.rows
      ?.map((row) =>
        row
          .map((cell) => this.normalizeText(cell.text))
          .filter((cell) => cell.length > 0),
      )
      .filter((row) => row.length > 0);

    if (!rows?.length) {
      return null;
    }

    return {
      headers: headers?.length ? headers : undefined,
      rows,
    };
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

  private isTableToken(token: Tokens.Generic): token is Tokens.Table {
    return token.type === 'table';
  }

  private isHtmlToken(token: Tokens.Generic): token is Tokens.HTML {
    return token.type === 'html';
  }
}
