export type HistoryEntry = {
  id: string;
  prompt: string;
  templateId: string;
  values: Record<string, string>;
  svg: string;
  backgroundUrl?: string;
  backgroundPrompt?: string;
  createdAt: string;
};
