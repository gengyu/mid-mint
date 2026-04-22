export interface DocumentCodeBlock {
  language?: string;
  content: string;
}

export interface DocumentTableData {
  headers?: string[];
  rows: string[][];
}

export interface DocumentSection {
  level: number;
  title: string;
  body: string;
  bullets: string[];
  codeBlocks?: DocumentCodeBlock[];
  tableData?: DocumentTableData;
  formulas?: string[];
  mermaidDefinitions?: string[];
}
