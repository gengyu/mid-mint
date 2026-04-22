import { DocumentSection } from './document-section.type';

export type DocumentSourceType = 'markdown' | 'txt' | 'html';

export interface ParsedDocument {
  title: string;
  sourceType: DocumentSourceType;
  rawText: string;
  sections: DocumentSection[];
  paragraphs: string[];
}
