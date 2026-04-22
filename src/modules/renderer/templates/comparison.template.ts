import { SlideSpec } from '../../slides/slide.types';
import { THEME, splitBullets } from './rendering-theme';

interface PptSlideLike {
  addImage: (...args: any[]) => unknown;
  addShape: (...args: any[]) => unknown;
  addTable: (...args: any[]) => unknown;
  addText: (...args: any[]) => unknown;
}

export function renderComparisonTemplate(slide: PptSlideLike, spec: SlideSpec): void {
  slide.addText(spec.eyebrow ?? 'Comparison', {
    x: 0.7,
    y: 0.45,
    w: 2.8,
    h: 0.3,
    fontSize: 12,
    bold: true,
    color: THEME.teal,
    fontFace: 'Aptos',
  });
  slide.addText(spec.title, {
    x: 0.7,
    y: 0.8,
    w: 10.2,
    h: 0.8,
    fontSize: 24,
    bold: true,
    color: THEME.ink,
    fontFace: 'Aptos Display',
  });

  if (spec.visualTechnique === 'table' && spec.tableData?.rows?.length) {
    const hasHeaders = !!(spec.tableData.headers && spec.tableData.headers.length > 0);
    const headerRow = hasHeaders ? spec.tableData.headers!.map((cell) => ({
      text: cell,
      options: { bold: true, color: THEME.white, fill: { color: THEME.teal }, fontFace: 'Aptos', fontSize: 13, align: 'left', valign: 'mid' },
    })) : [];
    const dataRows = spec.tableData.rows.map((row, rowIndex) =>
      row.map((cell) => ({
        text: cell,
        options: {
          bold: false,
          color: THEME.text,
          fill: { color: rowIndex % 2 === 0 ? THEME.white : THEME.pale },
          fontFace: 'Aptos',
          fontSize: 13,
          align: 'left',
          valign: 'mid',
        },
      })),
    );
    const rows = hasHeaders ? [headerRow, ...dataRows] : dataRows;

    slide.addShape('roundRect', {
      x: 0.7,
      y: 1.75,
      w: 11.3,
      h: 4.8,
      rectRadius: 0.12,
      fill: { color: THEME.white },
      line: { color: THEME.sky, width: 1.1 },
    });
    slide.addText('COMPARISON TABLE', {
      x: 1.0,
      y: 1.85,
      w: 2.2,
      h: 0.2,
      fontSize: 9,
      bold: true,
      color: THEME.teal,
      fontFace: 'Aptos',
    });
    slide.addTable(rows, {
      x: 0.95,
      y: 2.15,
      w: 10.8,
      h: 3.9,
      border: { type: 'solid', color: THEME.sky, pt: 1 },
      margin: [0.06, 0.1, 0.06, 0.1],
      rowH: hasHeaders ? 0.5 : 0.45,
      valign: 'mid',
      align: 'left',
      autoPage: false,
    });

    if (spec.highlight) {
      slide.addText(spec.highlight, {
        x: 0.95,
        y: 6.15,
        w: 10.6,
        h: 0.3,
        fontSize: 13,
        color: THEME.muted,
        fontFace: 'Aptos',
      });
    }
    return;
  }

  const [leftBullets, rightBullets] = splitBullets(spec.bullets);

  if (spec.assetPath) {
    // Asset present: left two columns + right asset panel
    slide.addShape('roundRect', {
      x: 0.7,
      y: 1.8,
      w: 3.0,
      h: 3.9,
      rectRadius: 0.12,
      fill: { color: THEME.white },
      line: { color: THEME.sky, width: 1.1 },
    });
    slide.addText(leftBullets.map((bullet) => ({ text: bullet, options: { bullet: { indent: 12 } } })), {
      x: 0.95,
      y: 2.1,
      w: 2.45,
      h: 3.2,
      fontSize: 15,
      color: THEME.text,
      breakLine: true,
      fontFace: 'Aptos',
    });
    slide.addShape('roundRect', {
      x: 4.0,
      y: 1.8,
      w: 3.0,
      h: 3.9,
      rectRadius: 0.12,
      fill: { color: THEME.pale },
      line: { color: THEME.sky, width: 1.1 },
    });
    slide.addText(rightBullets.map((bullet) => ({ text: bullet, options: { bullet: { indent: 12 } } })), {
      x: 4.25,
      y: 2.1,
      w: 2.45,
      h: 3.2,
      fontSize: 15,
      color: THEME.text,
      breakLine: true,
      fontFace: 'Aptos',
    });

    slide.addShape('roundRect', {
      x: 7.4,
      y: 1.9,
      w: 4.7,
      h: 3.7,
      rectRadius: 0.12,
      fill: { color: THEME.white },
      line: { color: THEME.sky, width: 1.1 },
    });
    slide.addImage({
      path: spec.assetPath,
      x: 7.65,
      y: 2.15,
      w: 4.15,
      h: 3.15,
    });
  } else {
    // No asset: use full width for balanced two-column comparison (PPT_V2_LAYOUTS.md Iteration C)
    const colWidth = 5.1;
    const gap = 0.4;
    slide.addShape('roundRect', {
      x: 0.7,
      y: 1.8,
      w: colWidth,
      h: 3.9,
      rectRadius: 0.12,
      fill: { color: THEME.white },
      line: { color: THEME.sky, width: 1.1 },
    });
    slide.addText('A', {
      x: 0.95,
      y: 1.92,
      w: 0.3,
      h: 0.22,
      fontSize: 11,
      bold: true,
      color: THEME.teal,
      fontFace: 'Aptos',
    });
    slide.addText(leftBullets.map((bullet) => ({ text: bullet, options: { bullet: { indent: 12 } } })), {
      x: 0.95,
      y: 2.25,
      w: colWidth - 0.5,
      h: 3.1,
      fontSize: 15,
      color: THEME.text,
      breakLine: true,
      fontFace: 'Aptos',
    });

    slide.addShape('roundRect', {
      x: 0.7 + colWidth + gap,
      y: 1.8,
      w: colWidth,
      h: 3.9,
      rectRadius: 0.12,
      fill: { color: THEME.pale },
      line: { color: THEME.sky, width: 1.1 },
    });
    slide.addText('B', {
      x: 0.7 + colWidth + gap + 0.25,
      y: 1.92,
      w: 0.3,
      h: 0.22,
      fontSize: 11,
      bold: true,
      color: THEME.teal,
      fontFace: 'Aptos',
    });
    slide.addText(rightBullets.map((bullet) => ({ text: bullet, options: { bullet: { indent: 12 } } })), {
      x: 0.7 + colWidth + gap + 0.25,
      y: 2.25,
      w: colWidth - 0.5,
      h: 3.1,
      fontSize: 15,
      color: THEME.text,
      breakLine: true,
      fontFace: 'Aptos',
    });

    // Highlight strip at bottom for key contrast point
    if (spec.highlight) {
      slide.addShape('roundRect', {
        x: 0.7,
        y: 5.95,
        w: 11.3,
        h: 0.5,
        rectRadius: 0.08,
        fill: { color: THEME.pale },
        line: { color: THEME.sky, width: 0.6 },
      });
      slide.addText(spec.highlight, {
        x: 1.0,
        y: 5.98,
        w: 10.7,
        h: 0.4,
        fontSize: 13,
        bold: true,
        color: THEME.teal,
        fontFace: 'Aptos',
      });
    }
  }
}
