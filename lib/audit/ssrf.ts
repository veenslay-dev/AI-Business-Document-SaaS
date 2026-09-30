import { isIP } from "node:net";

/** True for addresses a public website audit must never connect to (loopback, private, link-local, metadata, etc). */
export function isPrivateAddress(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224
    );
  }
  if (v === 6) {
    const s = ip.toLowerCase();
    if (s === "::" || s === "::1") return true;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(s);
    if (mapped) return isPrivateAddress(mapped[1]);
    const hextets = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(s);
    if (hextets) {
      const n = (parseInt(hextets[1], 16) << 16) | parseInt(hextets[2], 16);
      return isPrivateAddress(`${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`);
    }
    return s.startsWith("fc") || s.startsWith("fd") || s.startsWith("fe8") || s.startsWith("fe9") || s.startsWith("fea") || s.startsWith("feb") || s.startsWith("ff") || s.startsWith("64:ff9b");
  }
  return true; // not an IP at all: refuse
}

export class UnsafeUrlError extends Error {
  constructor(message: string) { super(message); this.name = "UnsafeUrlError"; }
}

/** Parses and normalises a user supplied website address. Only public http(s) sites on standard ports are allowed. */
export function parsePublicUrl(input: string): URL {
  let raw = input.trim();
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) raw = `https://${raw}`;
  let url: URL;
  try { url = new URL(raw); } catch { throw new UnsafeUrlError("Enter a valid website address, like https://example.com"); }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new UnsafeUrlError("Only http and https websites can be audited.");
  if (url.username || url.password) throw new UnsafeUrlError("Remove the username and password from the address.");
  if (url.port && url.port !== "80" && url.port !== "443") throw new UnsafeUrlError("Only standard web ports (80 and 443) are supported.");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || !host.includes(".") && !isIP(host.replace(/^\[|\]$/g, ""))) {
    throw new UnsafeUrlError("That address isn't a public website.");
  }
  if (isIP(host.replace(/^\[|\]$/g, "")) && isPrivateAddress(host.replace(/^\[|\]$/g, ""))) throw new UnsafeUrlError("That address isn't a public website.");
  url.hash = "";
  return url;
}
