declare module 'html-to-text' {
  export function compile(options?: Record<string, unknown>): (html: string) => string;
}
