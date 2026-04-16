import fs from "fs";
import path from "path";

export function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function projectPath(...segments: string[]) {
  return path.join(process.cwd(), ...segments);
}
