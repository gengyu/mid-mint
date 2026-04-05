import type { TemplateSlot } from "@/lib/templates/types";
import { smartSplit, truncateText } from "@/lib/utils/text";

type LayoutResult = {
  lines: string[];
  fontSize: number;
};

function estimatedCharWidth(char: string) {
  if (/[\u4e00-\u9fa5]/.test(char)) {
    return 1;
  }

  if (/[A-Z0-9]/.test(char)) {
    return 0.68;
  }

  return 0.56;
}

function estimateTextWidth(text: string, fontSize: number) {
  return Array.from(text).reduce((sum, char) => sum + estimatedCharWidth(char) * fontSize, 0);
}

function wrapLine(words: string[], maxWidth: number, fontSize: number) {
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const tentative = current ? `${current} ${word}` : word;
    if (estimateTextWidth(tentative, fontSize) <= maxWidth) {
      current = tentative;
      continue;
    }

    if (!current) {
      const chars = Array.from(word);
      let chunk = "";
      for (const char of chars) {
        const nextChunk = `${chunk}${char}`;
        if (estimateTextWidth(nextChunk, fontSize) <= maxWidth) {
          chunk = nextChunk;
        } else {
          lines.push(chunk);
          chunk = char;
        }
      }
      current = chunk;
      continue;
    }

    lines.push(current);
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

export function layoutText(slot: TemplateSlot, rawText: string): LayoutResult {
  let fontSize = slot.fontSize;
  const source = truncateText(rawText, slot.maxLength * slot.maxLines);
  const words = smartSplit(source);

  while (fontSize >= slot.minFontSize) {
    const lines = wrapLine(words, slot.width, fontSize);
    const height = lines.length * slot.lineHeight;

    if (lines.length <= slot.maxLines && height <= slot.height) {
      return { lines, fontSize };
    }

    fontSize -= 2;
  }

  const smallestLines = wrapLine(words, slot.width, slot.minFontSize).slice(0, slot.maxLines);
  const lastLineIndex = smallestLines.length - 1;
  if (lastLineIndex >= 0) {
    smallestLines[lastLineIndex] = truncateText(smallestLines[lastLineIndex], Math.max(1, slot.maxLength - 1));
  }

  return {
    lines: smallestLines,
    fontSize: slot.minFontSize
  };
}
