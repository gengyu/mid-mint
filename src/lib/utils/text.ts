export function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function stripUnsupportedText(value: string) {
  return value
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      return (code <= 31 || (code >= 127 && code <= 159)) ? " " : char;
    })
    .join("")
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}]/gu, "")
    .replace(/[^\p{Script=Han}\p{Script=Latin}\p{Number}\p{Zs}\p{P}\u00B7]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function smartSplit(value: string) {
  const normalized = stripUnsupportedText(value).replace(/[，。；、]/g, " ");
  const chunks = normalized.split(/\s+/).filter(Boolean);
  return chunks.length > 0 ? chunks : Array.from(normalized);
}

export function truncateText(value: string, maxLength: number) {
  const normalized = stripUnsupportedText(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1))}…`;
}

export function truncateTextSoft(value: string, maxLength: number) {
  const normalized = stripUnsupportedText(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  const sliced = normalized.slice(0, maxLength);
  const sentenceStop = Math.max(
    sliced.lastIndexOf("。"),
    sliced.lastIndexOf("！"),
    sliced.lastIndexOf("？"),
    sliced.lastIndexOf("，"),
    sliced.lastIndexOf(","),
    sliced.lastIndexOf(" ")
  );

  if (sentenceStop >= Math.floor(maxLength * 0.55)) {
    return sliced.slice(0, sentenceStop).trim();
  }

  return `${sliced.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}
