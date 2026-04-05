import fs from "fs";
import type { HistoryEntry } from "@/lib/templates/types";
import { ensureDir, projectPath } from "@/lib/utils/fs";

const historyDir = ensureDir(projectPath("storage"));
const historyFile = projectPath("storage", "history.json");

function readHistoryFile() {
  if (!fs.existsSync(historyFile)) {
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(historyFile, "utf8")) as HistoryEntry[];
  } catch {
    return [];
  }
}

function writeHistoryFile(entries: HistoryEntry[]) {
  ensureDir(historyDir);
  fs.writeFileSync(historyFile, JSON.stringify(entries, null, 2), "utf8");
}

export const historyStore = {
  list() {
    return readHistoryFile().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
  save(entry: HistoryEntry) {
    const entries = this.list();
    const nextEntries = [entry, ...entries].slice(0, 60);
    writeHistoryFile(nextEntries);
    return entry;
  }
};
