import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { Injectable } from '@nestjs/common';

import { ensureDir } from '../../common/utils/file.util';
import { PPT_AUTHOR } from '../../config/ppt.config';
import { SlideSpec } from '../slides/slide.types';

const execFileAsync = promisify(execFile);
const EMU_PER_INCH = 914400;
const SLIDE_WIDTH = 13.333;
const SLIDE_HEIGHT = 7.5;

@Injectable()
export class PptxRendererService {
  async render(filePath: string, title: string, slides: SlideSpec[]): Promise<void> {
    const packageDir = await mkdtemp(path.join(tmpdir(), 'mid-mint-pptx-'));

    try {
      await this.writePackage(packageDir, title, slides);
      await ensureDir(path.dirname(filePath));

      await execFileAsync('zip', ['-qr', filePath, '.'], {
        cwd: packageDir,
      });
    } finally {
      await rm(packageDir, { recursive: true, force: true });
    }
  }

  private async writePackage(packageDir: string, title: string, slides: SlideSpec[]): Promise<void> {
    const slideCount = slides.length;
    const slideIds = slides.map((slide, index) => ({
      slide,
      relIndex: index + 2,
      slideId: 256 + index,
    }));

    await this.writeXml(
      packageDir,
      '[Content_Types].xml',
      this.buildContentTypesXml(slideCount),
    );
    await this.writeXml(packageDir, '_rels/.rels', this.buildRootRelsXml());
    await this.writeXml(packageDir, 'docProps/core.xml', this.buildCoreXml(title));
    await this.writeXml(packageDir, 'docProps/app.xml', this.buildAppXml(slides));
    await this.writeXml(packageDir, 'ppt/presentation.xml', this.buildPresentationXml(slideIds));
    await this.writeXml(
      packageDir,
      'ppt/_rels/presentation.xml.rels',
      this.buildPresentationRelsXml(slideCount),
    );
    await this.writeXml(packageDir, 'ppt/theme/theme1.xml', this.buildThemeXml());
    await this.writeXml(
      packageDir,
      'ppt/slideMasters/slideMaster1.xml',
      this.buildSlideMasterXml(),
    );
    await this.writeXml(
      packageDir,
      'ppt/slideMasters/_rels/slideMaster1.xml.rels',
      this.buildSlideMasterRelsXml(),
    );
    await this.writeXml(
      packageDir,
      'ppt/slideLayouts/slideLayout1.xml',
      this.buildSlideLayoutXml(),
    );
    await this.writeXml(
      packageDir,
      'ppt/slideLayouts/_rels/slideLayout1.xml.rels',
      this.buildSlideLayoutRelsXml(),
    );
    await this.writeXml(packageDir, 'ppt/tableStyles.xml', this.buildTableStylesXml());
    await this.writeXml(packageDir, 'ppt/viewProps.xml', this.buildViewPropsXml());
    await this.writeXml(packageDir, 'ppt/presProps.xml', this.buildPresPropsXml());

    for (const { slide, relIndex } of slideIds) {
      await this.writeXml(
        packageDir,
        `ppt/slides/slide${slide.slideNumber}.xml`,
        this.buildSlideXml(slide),
      );
      await this.writeXml(
        packageDir,
        `ppt/slides/_rels/slide${slide.slideNumber}.xml.rels`,
        this.buildSlideRelsXml(),
      );
    }
  }

  private async writeXml(packageDir: string, relativePath: string, content: string): Promise<void> {
    const targetPath = path.join(packageDir, relativePath);
    await ensureDir(path.dirname(targetPath));
    await writeFile(targetPath, content, 'utf-8');
  }

  private buildContentTypesXml(slideCount: number): string {
    const slideOverrides = Array.from({ length: slideCount }, (_, index) => {
      const slideNumber = index + 1;
      return `<Override PartName="/ppt/slides/slide${slideNumber}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
    }).join('');

    return this.xml(`
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
        <Default Extension="xml" ContentType="application/xml"/>
        <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
        <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
        <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
        <Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/>
        <Override PartName="/ppt/viewProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml"/>
        <Override PartName="/ppt/tableStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"/>
        <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
        <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
        <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
        ${slideOverrides}
      </Types>
    `);
  }

  private buildRootRelsXml(): string {
    return this.xml(`
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
        <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
        <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
      </Relationships>
    `);
  }

  private buildCoreXml(title: string): string {
    const createdAt = new Date().toISOString();
    return this.xml(`
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
        <dc:title>${this.escapeXml(title)}</dc:title>
        <dc:creator>${this.escapeXml(PPT_AUTHOR)}</dc:creator>
        <cp:lastModifiedBy>${this.escapeXml(PPT_AUTHOR)}</cp:lastModifiedBy>
        <dcterms:created xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:created>
        <dcterms:modified xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:modified>
      </cp:coreProperties>
    `);
  }

  private buildAppXml(slides: SlideSpec[]): string {
    const titles = slides.map((slide) => `<vt:lpstr>${this.escapeXml(slide.title)}</vt:lpstr>`).join('');
    return this.xml(`
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
        <Application>mid-mint</Application>
        <PresentationFormat>Widescreen</PresentationFormat>
        <Slides>${slides.length}</Slides>
        <Notes>0</Notes>
        <HiddenSlides>0</HiddenSlides>
        <MMClips>0</MMClips>
        <ScaleCrop>false</ScaleCrop>
        <HeadingPairs>
          <vt:vector size="2" baseType="variant">
            <vt:variant><vt:lpstr>Slides</vt:lpstr></vt:variant>
            <vt:variant><vt:i4>${slides.length}</vt:i4></vt:variant>
          </vt:vector>
        </HeadingPairs>
        <TitlesOfParts>
          <vt:vector size="${slides.length}" baseType="lpstr">${titles}</vt:vector>
        </TitlesOfParts>
        <Company></Company>
        <LinksUpToDate>false</LinksUpToDate>
        <SharedDoc>false</SharedDoc>
        <HyperlinksChanged>false</HyperlinksChanged>
        <AppVersion>1.0</AppVersion>
      </Properties>
    `);
  }

  private buildPresentationXml(
    slideIds: Array<{ relIndex: number; slideId: number }>,
  ): string {
    const slideIdXml = slideIds
      .map(
        ({ relIndex, slideId }) =>
          `<p:sldId id="${slideId}" r:id="rId${relIndex}"/>`,
      )
      .join('');

    return this.xml(`
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" saveSubsetFonts="1" autoCompressPictures="0">
        <p:sldMasterIdLst>
          <p:sldMasterId id="2147483648" r:id="rId1"/>
        </p:sldMasterIdLst>
        <p:sldIdLst>${slideIdXml}</p:sldIdLst>
        <p:sldSz cx="${this.toEmu(SLIDE_WIDTH)}" cy="${this.toEmu(SLIDE_HEIGHT)}"/>
        <p:notesSz cx="6858000" cy="9144000"/>
        <p:defaultTextStyle/>
      </p:presentation>
    `);
  }

  private buildPresentationRelsXml(slideCount: number): string {
    const slideRels = Array.from({ length: slideCount }, (_, index) => {
      const slideNumber = index + 1;
      return `<Relationship Id="rId${index + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${slideNumber}.xml"/>`;
    }).join('');

    return this.xml(`
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
        ${slideRels}
      </Relationships>
    `);
  }

  private buildSlideMasterXml(): string {
    return this.xml(`
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
        <p:cSld name="Default Master">
          <p:bg>
            <p:bgPr>
              <a:solidFill><a:srgbClr val="F8FAFC"/></a:solidFill>
              <a:effectLst/>
            </p:bgPr>
          </p:bg>
          <p:spTree>
            <p:nvGrpSpPr>
              <p:cNvPr id="1" name=""/>
              <p:cNvGrpSpPr/>
              <p:nvPr/>
            </p:nvGrpSpPr>
            <p:grpSpPr>
              <a:xfrm>
                <a:off x="0" y="0"/>
                <a:ext cx="0" cy="0"/>
                <a:chOff x="0" y="0"/>
                <a:chExt cx="0" cy="0"/>
              </a:xfrm>
            </p:grpSpPr>
          </p:spTree>
        </p:cSld>
        <p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" folHlink="folHlink" hlink="hlink" tx1="dk1" tx2="dk2"/>
        <p:sldLayoutIdLst>
          <p:sldLayoutId id="1" r:id="rId1"/>
        </p:sldLayoutIdLst>
        <p:txStyles>
          <p:titleStyle/>
          <p:bodyStyle/>
          <p:otherStyle/>
        </p:txStyles>
      </p:sldMaster>
    `);
  }

  private buildSlideMasterRelsXml(): string {
    return this.xml(`
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
        <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
      </Relationships>
    `);
  }

  private buildSlideLayoutXml(): string {
    return this.xml(`
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
        <p:cSld name="Blank Layout">
          <p:spTree>
            <p:nvGrpSpPr>
              <p:cNvPr id="1" name=""/>
              <p:cNvGrpSpPr/>
              <p:nvPr/>
            </p:nvGrpSpPr>
            <p:grpSpPr>
              <a:xfrm>
                <a:off x="0" y="0"/>
                <a:ext cx="0" cy="0"/>
                <a:chOff x="0" y="0"/>
                <a:chExt cx="0" cy="0"/>
              </a:xfrm>
            </p:grpSpPr>
          </p:spTree>
        </p:cSld>
        <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
      </p:sldLayout>
    `);
  }

  private buildSlideLayoutRelsXml(): string {
    return this.xml(`
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
      </Relationships>
    `);
  }

  private buildThemeXml(): string {
    return this.xml(`
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="mid-mint Theme">
        <a:themeElements>
          <a:clrScheme name="mid-mint Colors">
            <a:dk1><a:srgbClr val="111827"/></a:dk1>
            <a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
            <a:dk2><a:srgbClr val="0F172A"/></a:dk2>
            <a:lt2><a:srgbClr val="F8FAFC"/></a:lt2>
            <a:accent1><a:srgbClr val="2563EB"/></a:accent1>
            <a:accent2><a:srgbClr val="0F766E"/></a:accent2>
            <a:accent3><a:srgbClr val="D97706"/></a:accent3>
            <a:accent4><a:srgbClr val="7C3AED"/></a:accent4>
            <a:accent5><a:srgbClr val="DC2626"/></a:accent5>
            <a:accent6><a:srgbClr val="475569"/></a:accent6>
            <a:hlink><a:srgbClr val="2563EB"/></a:hlink>
            <a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink>
          </a:clrScheme>
          <a:fontScheme name="mid-mint Fonts">
            <a:majorFont>
              <a:latin typeface="Aptos Display"/>
              <a:ea typeface=""/>
              <a:cs typeface=""/>
            </a:majorFont>
            <a:minorFont>
              <a:latin typeface="Aptos"/>
              <a:ea typeface=""/>
              <a:cs typeface=""/>
            </a:minorFont>
          </a:fontScheme>
          <a:fmtScheme name="mid-mint Format">
            <a:fillStyleLst>
              <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
            </a:fillStyleLst>
            <a:lnStyleLst>
              <a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
            </a:lnStyleLst>
            <a:effectStyleLst>
              <a:effectStyle><a:effectLst/></a:effectStyle>
            </a:effectStyleLst>
            <a:bgFillStyleLst>
              <a:solidFill><a:schemeClr val="lt1"/></a:solidFill>
            </a:bgFillStyleLst>
          </a:fmtScheme>
        </a:themeElements>
        <a:objectDefaults/>
        <a:extraClrSchemeLst/>
      </a:theme>
    `);
  }

  private buildTableStylesXml(): string {
    return this.xml(`
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <a:tblStyleLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" def="{5940675A-B579-460E-94D1-54222C63F5DA}"/>
    `);
  }

  private buildViewPropsXml(): string {
    return this.xml(`
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <p:viewPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" lastView="sldView">
        <p:normalViewPr>
          <p:restoredLeft sz="15620"/>
          <p:restoredTop sz="94660"/>
        </p:normalViewPr>
        <p:slideViewPr>
          <p:cSldViewPr snapToGrid="1"/>
        </p:slideViewPr>
      </p:viewPr>
    `);
  }

  private buildPresPropsXml(): string {
    return this.xml(`
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <p:presentationPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
        <p:showPr loop="0" useTimings="1"/>
      </p:presentationPr>
    `);
  }

  private buildSlideXml(slide: SlideSpec): string {
    const titleShape = this.buildTextShape({
      id: 2,
      name: 'Title',
      x: 0.6,
      y: 0.5,
      w: 12.1,
      h: slide.layout === 'cover' ? 1.0 : 0.7,
      fontSize: slide.layout === 'cover' ? 28 : 24,
      color: '0F172A',
      paragraphs: [slide.title],
      bold: true,
    });

    const subtitleParagraphs =
      slide.layout === 'cover'
        ? [slide.subtitle || slide.paragraph || slide.notes || '']
        : this.buildBodyParagraphs(slide);
    const bodyShape = this.buildTextShape({
      id: 3,
      name: 'Content',
      x: 0.8,
      y: slide.layout === 'cover' ? 1.8 : 1.5,
      w: 11.7,
      h: slide.layout === 'cover' ? 3.5 : 4.8,
      fontSize: slide.layout === 'cover' ? 18 : 20,
      color: '334155',
      paragraphs: subtitleParagraphs,
      bullet: slide.layout !== 'cover',
    });

    return this.xml(`
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
        <p:cSld>
          <p:bg>
            <p:bgPr>
              <a:solidFill><a:srgbClr val="F8FAFC"/></a:solidFill>
              <a:effectLst/>
            </p:bgPr>
          </p:bg>
          <p:spTree>
            <p:nvGrpSpPr>
              <p:cNvPr id="1" name=""/>
              <p:cNvGrpSpPr/>
              <p:nvPr/>
            </p:nvGrpSpPr>
            <p:grpSpPr>
              <a:xfrm>
                <a:off x="0" y="0"/>
                <a:ext cx="0" cy="0"/>
                <a:chOff x="0" y="0"/>
                <a:chExt cx="0" cy="0"/>
              </a:xfrm>
            </p:grpSpPr>
            ${titleShape}
            ${bodyShape}
          </p:spTree>
        </p:cSld>
        <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
      </p:sld>
    `);
  }

  private buildSlideRelsXml(): string {
    return this.xml(`
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
      </Relationships>
    `);
  }

  private buildBodyParagraphs(slide: SlideSpec): string[] {
    const bulletLines = slide.bullets.filter(Boolean).slice(0, 5);
    if (bulletLines.length > 0) {
      return bulletLines;
    }

    const fallback = [slide.paragraph, slide.notes].filter(Boolean) as string[];
    return fallback.length > 0 ? fallback : ['Generated by mid-mint'];
  }

  private buildTextShape(input: {
    id: number;
    name: string;
    x: number;
    y: number;
    w: number;
    h: number;
    fontSize: number;
    color: string;
    paragraphs: string[];
    bold?: boolean;
    bullet?: boolean;
  }): string {
    const paragraphs = input.paragraphs
      .filter((text) => text.trim().length > 0)
      .map((text) => {
        const bullet = input.bullet
          ? '<a:pPr marL="342900" indent="-171450"><a:buChar char="•"/></a:pPr>'
          : '<a:pPr algn="l"/>'
        ;
        return `
          <a:p>
            ${bullet}
            <a:r>
              <a:rPr lang="zh-CN" sz="${input.fontSize * 100}" b="${input.bold ? 1 : 0}" dirty="0" smtClean="0">
                <a:solidFill><a:srgbClr val="${input.color}"/></a:solidFill>
                <a:latin typeface="Aptos"/>
              </a:rPr>
              <a:t>${this.escapeXml(text)}</a:t>
            </a:r>
            <a:endParaRPr lang="zh-CN" sz="${input.fontSize * 100}" dirty="0"/>
          </a:p>
        `;
      })
      .join('');

    return `
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="${input.id}" name="${this.escapeXml(input.name)}"/>
          <p:cNvSpPr txBox="1"/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${this.toEmu(input.x)}" y="${this.toEmu(input.y)}"/>
            <a:ext cx="${this.toEmu(input.w)}" cy="${this.toEmu(input.h)}"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/>
          <a:ln><a:noFill/></a:ln>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" rtlCol="0" anchor="t"/>
          <a:lstStyle/>
          ${paragraphs}
        </p:txBody>
      </p:sp>
    `;
  }

  private toEmu(valueInches: number): number {
    return Math.round(valueInches * EMU_PER_INCH);
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private xml(content: string): string {
    return content
      .split('\n')
      .map((line) => line.trim())
      .join('');
  }
}
