import { randomUUID } from 'node:crypto';

export function createProjectId(title?: string): string {
  const prefix = (title ?? 'project')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = randomUUID().slice(0, 6);

  return `${prefix || 'project'}-${date}-${suffix}`;
}
