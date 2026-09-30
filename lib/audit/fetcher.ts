import "server-only";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import { isPrivateAddress, parsePublicUrl, UnsafeUrlError } from "./ssrf";

export type FetchResult = {
  url: string; finalUrl: string; status: number; headers: Record<string, string>; body: string; bytes: number;
  ms: number; redirects: { from: string; to: string; status: number }[]; truncated: boolean;
};

export type FetchOptions = { method?: "GET" | "HEAD"; timeoutMs?: number; maxBytes?: number; maxRedirects?: number; allowPrivate?: boolean };

const UA = "Mozilla/5.0 (compatible; DocuProAuditBot/1.0; +site audit requested by the site owner's agency)";

/**
 * GET/HEAD with SSRF protection. The address check happens inside the socket's DNS lookup,
 * so the IP that is validated is the IP that is connected to (no DNS rebinding gap),
 * and every redirect hop is validated again.
 */
export async function safeFetch(input: string, opts: FetchOptions = {}): Promise<FetchResult> {
  const { method = "GET", timeoutMs = 10_000, maxBytes = 2_000_000, maxRedirects = 5, allowPrivate = false } = opts;
  const started = Date.now();
  const redirects: FetchResult["redirects"] = [];
  let current = allowPrivate ? new URL(input) : parsePublicUrl(input);

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const res = await once(current, { method, timeoutMs, maxBytes, allowPrivate });
    const loc = res.headers.location;
    if (res.status >= 300 && res.status < 400 && loc) {
      let next: URL;
      try { next = new URL(loc, current); } catch { throw new UnsafeUrlError("A redirect pointed to an invalid address."); }
      if (!allowPrivate) next = parsePublicUrl(next.toString());
      redirects.push({ from: current.toString(), to: next.toString(), status: res.status });
      current = next;
      continue;
    }
    return { url: input, finalUrl: current.toString(), status: res.status, headers: res.headers, body: res.body, bytes: res.bytes, ms: Date.now() - started, redirects, truncated: res.truncated };
  }
  throw new UnsafeUrlError("Too many redirects.");
}

function once(url: URL, o: { method: string; timeoutMs: number; maxBytes: number; allowPrivate: boolean }) {
  return new Promise<{ status: number; headers: Record<string, string>; body: string; bytes: number; truncated: boolean }>((resolve, reject) => {
    const lib = url.protocol === "https:" ? https : http;
    const lookup = (hostname: string, options: unknown, cb: (err: Error | null, address?: string | LookupAddress[], family?: number) => void) => {
      const all = typeof options === "object" && options !== null && (options as { all?: boolean }).all;
      const finish = (err: Error | null, addrs?: LookupAddress[]) => {
        if (err || !addrs?.length) return cb(err ?? new Error("no address"));
        if (!o.allowPrivate && addrs.some((a) => isPrivateAddress(a.address))) return cb(new UnsafeUrlError("That address isn't a public website."));
        return all ? cb(null, addrs) : cb(null, addrs[0].address, addrs[0].family);
      };
      if (isIP(hostname)) return finish(null, [{ address: hostname, family: isIP(hostname) }]);
      dnsLookup(hostname, { all: true }, finish);
    };
    const req = lib.request(url, {
      method: o.method, lookup: lookup as never, timeout: o.timeoutMs,
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.5", "accept-encoding": "identity", "accept-language": "en" },
    }, (res) => {
      const chunks: Buffer[] = [];
      let bytes = 0; let truncated = false;
      res.on("data", (c: Buffer) => {
        bytes += c.length;
        if (bytes > o.maxBytes) { truncated = true; res.destroy(); return; }
        chunks.push(c);
      });
      const done = () => {
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(res.headers)) headers[k.toLowerCase()] = Array.isArray(v) ? v.join(", ") : String(v ?? "");
        resolve({ status: res.statusCode ?? 0, headers, body: Buffer.concat(chunks).toString("utf8"), bytes, truncated });
      };
      res.on("end", done);
      res.on("close", () => { if (truncated) done(); });
      res.on("error", (e) => { if (!truncated) reject(e); });
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
}
