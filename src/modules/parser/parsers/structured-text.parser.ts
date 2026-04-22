import { Injectable } from '@nestjs/common';

import { DocumentSection } from '../types/document-section.type';
import { DocumentSourceType, ParsedDocument } from '../types/parsed-document.type';

interface StructuredTextParseOptions {
  titleOverride?: string;
}

@Injectable()
export class StructuredTextParser {
  parse(
    content: string,
    sourceType: Exclude<DocumentSourceType, 'markdown'>,
    options: StructuredTextParseOptions = {},
  ): ParsedDocument {
    const normalizedContent = this.normalizeContent(content);
    const blocks = normalizedContent
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter(Boolean);
    const paragraphs = normalizedContent
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const title = options.titleOverride?.trim() || this.pickTitle(blocks, paragraphs);
    const sections = this.buildSections(blocks, title);

    return {
      title,
      sourceType,
      rawText: content,
      sections,
      paragraphs,
    };
  }

  private normalizeContent(content: string): string {
    return content.replace(/\r\n/g, '\n').trim();
  }

  private buildSections(blocks: string[], title: string): DocumentSection[] {
    if (blocks.length === 0) {
      return [
        {
          level: 1,
          title,
          body: '',
          bullets: [],
        },
      ];
    }

    const contentBlocks = this.dropTitleBlock(blocks, title);
    if (contentBlocks.length === 0) {
      return [
        {
          level: 1,
          title,
          body: blocks[0] ?? title,
          bullets: [],
        },
      ];
    }

    return contentBlocks.map((block, index) => this.buildSectionFromBlock(block, index));
  }

  private buildSectionFromBlock(block: string, index: number): DocumentSection {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const bulletLines = lines
      .filter((line) => /^[-*+]\s+/.test(line))
      .map((line) => line.replace(/^[-*+]\s+/, '').trim());
    const plainLines = lines.filter((line) => !/^[-*+]\s+/.test(line));

    if (this.looksLikeTitledBlock(lines)) {
      const [rawTitle, ...restLines] = lines;
      const bodyLines = restLines.filter((line) => !/^[-*+]\s+/.test(line));
      const bullets = restLines
        .filter((line) => /^[-*+]\s+/.test(line))
        .map((line) => line.replace(/^[-*+]\s+/, '').trim());

      return {
        level: 2,
        title: rawTitle.replace(/[:：]\s*$/, '').trim(),
        body: bodyLines.join('\n'),
        bullets,
      };
    }

    return {
      level: 2,
      title: this.buildGeneratedTitle(index, plainLines, bulletLines),
      body: plainLines.join('\n'),
      bullets: bulletLines,
    };
  }

  private dropTitleBlock(blocks: string[], title: string): string[] {
    if (blocks.length === 0) {
      return blocks;
    }

    const firstBlock = blocks[0]
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (firstBlock.length === 1 && firstBlock[0] === title) {
      return blocks.slice(1);
    }

    return blocks;
  }

  private pickTitle(blocks: string[], paragraphs: string[]): string {
    const firstBlock = blocks[0]
      ?.split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (firstBlock?.length) {
      const firstLine = firstBlock[0];
      if (firstBlock.length === 1 || this.looksLikeTitleLine(firstLine)) {
        return firstLine.replace(/[:：]\s*$/, '').trim();
      }
    }

    return paragraphs[0] || 'Untitled Presentation';
  }

  private looksLikeTitledBlock(lines: string[]): boolean {
    return lines.length >= 2 && this.looksLikeTitleLine(lines[0]);
  }

  private looksLikeTitleLine(line: string): boolean {
    return line.length <= 60 && !/^[-*+]\s+/.test(line);
  }

  private buildGeneratedTitle(index: number, plainLines: string[], bulletLines: string[]): string {
    const candidate = plainLines[0] || bulletLines[0];
    if (candidate) {
      return candidate.slice(0, 36);
    }

    return `Section ${index + 1}`;
  }
}
