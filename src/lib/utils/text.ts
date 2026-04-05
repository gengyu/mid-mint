export function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function smartSplit(value: string) {
  const normalized = normalizeText(value).replace(/[，。；、]/g, " ");
  const chunks = normalized.split(/\s+/).filter(Boolean);
  return chunks.length > 0 ? chunks : Array.from(normalized);
}

export function truncateText(value: string, maxLength: number) {
  const normalized = normalizeText(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1))}…`;
}
