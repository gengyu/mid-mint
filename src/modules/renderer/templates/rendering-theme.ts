export const THEME = {
  navy: '0B1F33',
  slate: '334155',
  ink: '102033',
  text: '1E293B',
  muted: '5B6B7F',
  light: 'F6F8FC',
  white: 'FFFFFF',
  cyan: '2FB6C4',
  teal: '0F766E',
  gold: 'F59E0B',
  sky: 'D9F2F5',
  pale: 'E8EEF5',
};

export function splitBullets(bullets: string[]): [string[], string[]] {
  const midpoint = Math.max(1, Math.ceil(bullets.length / 2));
  return [bullets.slice(0, midpoint), bullets.slice(midpoint)];
}
