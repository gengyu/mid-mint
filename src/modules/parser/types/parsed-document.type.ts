import { DocumentSection } from './document-section.type';

export interface ParsedDocument {
  title: string;
  sourceType: 'markdown' | 'txt';
  rawText: string;
  sections: DocumentSection[];
  paragraphs: string[];
}
