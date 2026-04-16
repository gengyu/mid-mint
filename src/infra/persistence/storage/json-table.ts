import fs from "fs";
import path from "path";
import { ensureDir, projectPath } from "@/infra/utils/fs";

function readJsonFile<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath: string, value: unknown) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

export function createJsonTable<TRecord extends { id: string }>(tableName: string) {
  const rootDir = ensureDir(projectPath("storage", "v1"));
  const filePath = projectPath("storage", "v1", `${tableName}.json`);

  function read(): TRecord[] {
    return readJsonFile<TRecord[]>(filePath, []);
  }

  function write(rows: TRecord[]) {
    writeJsonFile(filePath, rows);
    return rows;
  }

  return {
    filePath,
    list() {
      return [...read()];
    },
    getById(id: string) {
      return read().find((row) => row.id === id) ?? null;
    },
    save(row: TRecord) {
      const rows = read();
      const nextRows = [row, ...rows.filter((current) => current.id !== row.id)];
      write(nextRows);
      return row;
    },
    update(id: string, updater: (current: TRecord) => TRecord) {
      const rows = read();
      const current = rows.find((row) => row.id === id);
      if (!current) {
        return null;
      }

      const updated = updater(current);
      const nextRows = [updated, ...rows.filter((row) => row.id !== id)];
      write(nextRows);
      return updated;
    },
    deleteById(id: string) {
      const rows = read();
      const nextRows = rows.filter((row) => row.id !== id);
      if (nextRows.length === rows.length) {
        return false;
      }

      write(nextRows);
      return true;
    },
    deleteWhere(predicate: (row: TRecord) => boolean) {
      const rows = read();
      const nextRows = rows.filter((row) => !predicate(row));
      if (nextRows.length === rows.length) {
        return 0;
      }

      write(nextRows);
      return rows.length - nextRows.length;
    },
    clear() {
      write([]);
    },
    rootDir
  };
}
