import { Injectable } from '@nestjs/common';

import {
  DocumentCodeBlock,
  DocumentSection,
  DocumentTableData,
} from '../types/document-section.type';
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
    const codeBlocks = this.extractCodeBlocks(block);
    const mermaidDefinitions = codeBlocks
      .filter((item) => item.language?.toLowerCase() === 'mermaid')
      .map((item) => item.content);
    const nonMermaidCodeBlocks = codeBlocks.filter(
      (item) => item.language?.toLowerCase() !== 'mermaid',
    );
    const tableData = this.extractTableData(lines);
    const formulas = this.extractFormulas(block);
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
        codeBlocks: nonMermaidCodeBlocks,
        tableData,
        formulas,
        mermaidDefinitions,
      };
    }

    return {
      level: 2,
      title: this.buildGeneratedTitle(index, plainLines, bulletLines),
      body: plainLines.join('\n'),
      bullets: bulletLines,
      codeBlocks: nonMermaidCodeBlocks,
      tableData,
      formulas,
      mermaidDefinitions,
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

  private extractCodeBlocks(block: string): DocumentCodeBlock[] {
    const matches = Array.from(block.matchAll(/```([\w-]+)?\n([\s\S]*?)```/g));
    return matches
      .map((match) => ({
        language: match[1]?.trim() || undefined,
        content: match[2]?.trim() || '',
      }))
      .filter((item) => item.content.length > 0);
  }

  private extractTableData(lines: string[]): DocumentTableData | undefined {
    const tableLines = lines.filter((line) => /\|/.test(line));
    if (tableLines.length < 2) {
      return undefined;
    }

    const normalizedRows = tableLines
      .filter((line) => !/^\|?[-:\s|]+\|?$/.test(line))
      .map((line) =>
        line
          .split('|')
          .map((cell) => cell.trim())
          .filter(Boolean),
      )
      .filter((row) => row.length > 1);

    if (normalizedRows.length < 2) {
      return undefined;
    }

    const [headers, ...rows] = normalizedRows;
    return {
      headers,
      rows,
    };
  }

  private extractFormulas(block: string): string[] {
    return (block.match(/\$\$[\s\S]+?\$\$|\$[^$\n]+\$/g) ?? []).map((item) => item.trim());
  }
}
