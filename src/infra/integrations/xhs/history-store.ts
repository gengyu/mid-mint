import fs from "fs";
import type { XhsDeckHistoryEntry } from "@/infra/integrations/xhs/types";
import { ensureDir, projectPath } from "@/infra/utils/fs";

const historyDir = ensureDir(projectPath("storage"));
const historyFile = projectPath("storage", "xiaohongshu-history.json");

function readHistoryFile() {
  if (!fs.existsSync(historyFile)) {
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(historyFile, "utf8")) as XhsDeckHistoryEntry[];
  } catch {
    return [];
  }
}

function writeHistoryFile(entries: XhsDeckHistoryEntry[]) {
  ensureDir(historyDir);
  fs.writeFileSync(historyFile, JSON.stringify(entries, null, 2), "utf8");
}

export const xhsHistoryStore = {
  list() {
    return readHistoryFile().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
  save(entry: XhsDeckHistoryEntry) {
    const entries = this.list();
    const nextEntries = [entry, ...entries].slice(0, 30);
    writeHistoryFile(nextEntries);
    return entry;
  }
};
