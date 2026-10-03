/**
 * Only same-site relative paths are allowed as a post-login destination.
 * A backslash or control character can turn "/\\evil.com" into a protocol-relative address in browsers.
 */
export function safeNext(next: string | null | undefined, fallback: string): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !/[\\\u0000-\u001f]/.test(next) ? next : fallback;
}
