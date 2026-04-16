export const DEFAULT_CLIENT_PORT = 5173;
export const DEFAULT_API_PORT = 3101;

export function resolveApiPort(env: NodeJS.ProcessEnv): number {
  const value = env.MID_MINT_API_PORT || env.PORT;
  const port = Number(value || DEFAULT_API_PORT);
  return Number.isFinite(port) ? port : DEFAULT_API_PORT;
}
