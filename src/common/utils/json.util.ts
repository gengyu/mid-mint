import { writeTextFile } from './file.util';

export function toPrettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await writeTextFile(filePath, toPrettyJson(value));
}
