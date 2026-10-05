// Local stand-in for Supabase, for end to end tests without a Supabase project.
//   Postgres (real schema + RLS)  <- PostgREST (real)  <- this file's HTTP server
// The server also fakes the small parts of GoTrue (auth) and Storage that the app uses.
// Not for production. Start with:  node tests/e2e/stack.mjs
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { spawn } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = Number(process.env.STACK_PORT ?? 54321);
const REST_PORT = 54330;
const ADMIN_URL = process.env.PGURL ?? "postgresql://postgres:pg@localhost:5432/postgres";
const DB = "docupro_e2e";
const SECRET = "e2e-jwt-secret-that-is-long-enough-for-hs256-ok";
const POSTGREST = process.env.POSTGREST_BIN ?? "postgrest";

const b64 = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
const sign = (claims) => { const h = b64({ alg: "HS256", typ: "JWT" }), p = b64(claims), s = createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url"); return `${h}.${p}.${s}`; };
const verify = (t) => { const [h, p, s] = String(t).split("."); if (!s) return null; const ok = createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url"); if (ok !== s) return null; const c = JSON.parse(Buffer.from(p, "base64url")); return c.exp && c.exp < Date.now() / 1000 ? null : c; };
export const keys = { anon: sign({ role: "anon", iss: "e2e", exp: 4102444800 }), service: sign({ role: "service_role", iss: "e2e", exp: 4102444800 }) };

const hashPw = (pw) => { const salt = randomBytes(8).toString("hex"); return `${salt}:${scryptSync(pw, salt, 32).toString("hex")}`; };
const checkPw = (pw, stored) => { const [salt, h] = stored.split(":"); return timingSafeEqual(scryptSync(pw, salt, 32), Buffer.from(h, "hex")); };

export async function start() {
  const admin = new pg.Client({ connectionString: ADMIN_URL }); await admin.connect();
  await admin.query(`drop database if exists ${DB} with (force)`); await admin.query(`create database ${DB}`); await admin.end();
  const dbUrl = ADMIN_URL.replace(/\/[^/]*$/, `/${DB}`);
  const db = new pg.Client({ connectionString: dbUrl }); await db.connect();
  await db.query(readFileSync(path.join(root, "supabase/tests/00_supabase_stub.sql"), "utf8"));
  for (const f of readdirSync(path.join(root, "supabase/migrations")).sort()) await db.query(readFileSync(path.join(root, "supabase/migrations", f), "utf8"));

  const authenticatorUrl = dbUrl.replace(/\/\/[^@]*@/, "//authenticator:pgrst@");
  const rest = spawn(POSTGREST, [], { env: { ...process.env, PGRST_DB_URI: authenticatorUrl, PGRST_DB_SCHEMAS: "public", PGRST_DB_ANON_ROLE: "anon", PGRST_JWT_SECRET: SECRET, PGRST_SERVER_PORT: String(REST_PORT), PGRST_LOG_LEVEL: "warn" }, stdio: ["ignore", "inherit", "inherit"] });

  const files = new Map();
  const userJson = (u) => ({ id: u.id, aud: "authenticated", role: "authenticated", email: u.email, email_confirmed_at: new Date().toISOString(), phone: "", confirmed_at: new Date().toISOString(), app_metadata: { provider: "email" }, user_metadata: u.raw_user_meta_data ?? {}, identities: [{ id: u.id, user_id: u.id, identity_data: { email: u.email }, provider: "email" }], created_at: new Date().toISOString(), updated_at: new Date().toISOString(), banned_until: u.banned_until ?? null });
  const session = (u) => { const now = Math.floor(Date.now() / 1000); return { access_token: sign({ aud: "authenticated", sub: u.id, role: "authenticated", email: u.email, exp: now + 3600, iat: now, session_id: randomUUID() }), token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: `rt_${u.id}`, user: userJson(u) }; };
  const byEmail = async (e) => (await db.query("select * from auth.users where lower(email)=lower($1)", [e])).rows[0];
  const byId = async (i) => (await db.query("select * from auth.users where id=$1", [i])).rows[0];
  const readBody = (req) => new Promise((r) => { const c = []; req.on("data", (d) => c.push(d)); req.on("end", () => r(Buffer.concat(c))); });
  const send = (res, code, body, type = "application/json") => { res.writeHead(code, { "content-type": type }); res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };
  const bearer = (req) => verify((req.headers.authorization ?? "").replace(/^Bearer /i, ""));

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      const p = url.pathname;
      if (p.startsWith("/rest/v1/")) {
        const body = await readBody(req);
        const up = http.request({ host: "127.0.0.1", port: REST_PORT, path: p.replace("/rest/v1", "") + url.search, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${REST_PORT}` } }, (r) => { res.writeHead(r.statusCode ?? 500, r.headers); r.pipe(res); });
        up.on("error", () => send(res, 502, { message: "postgrest unavailable" })); up.end(body); return;
      }
      if (p.startsWith("/storage/v1/object/public/")) { const f = files.get(decodeURIComponent(p.replace("/storage/v1/object/public/", ""))); return f ? send(res, 200, f.data, f.type) : send(res, 404, { error: "not found" }); }
      if (p.startsWith("/storage/v1/object/") && req.method === "POST") {
        const key = decodeURIComponent(p.replace("/storage/v1/object/", ""));
        const data = await readBody(req); const type = req.headers["content-type"] ?? "application/octet-stream";
        // supabase-js sends multipart form data: a cacheControl field and the file part. Keep the file part.
        const m = /boundary=(.+)$/.exec(type);
        let file = data, ftype = type;
        if (m) {
          const sep = Buffer.from(`--${m[1]}`);
          let pos = 0; const parts = [];
          while ((pos = data.indexOf(sep, pos)) !== -1) { const next = data.indexOf(sep, pos + sep.length); if (next === -1) break; parts.push(data.subarray(pos + sep.length + 2, next - 2)); pos = next; }
          for (const part of parts) {
            const headEnd = part.indexOf("\r\n\r\n"); const head = part.subarray(0, headEnd).toString("latin1");
            if (/filename=/i.test(head)) { ftype = /content-type: ([^\r\n]+)/i.exec(head)?.[1] ?? "application/octet-stream"; file = part.subarray(headEnd + 4); }
          }
        }
        files.set(key, { data: file, type: ftype }); return send(res, 200, { Key: key, Id: randomUUID() });
      }
      if (p === "/v1/orders" && req.method === "POST") {
        const b = JSON.parse((await readBody(req)).toString());
        if (!/^Basic /.test(req.headers.authorization ?? "") || !b.amount) return send(res, 400, { error: "bad" });
        return send(res, 200, { id: "order_" + randomUUID().replace(/-/g, "").slice(0, 14), amount: b.amount, currency: b.currency });
      }
      if (p === "/v1/messages" && req.method === "POST") {
        const b = JSON.parse((await readBody(req)).toString()); const prompt = String(b.messages?.[0]?.content ?? "");
        let out;
        if (/Write a proposal/.test(prompt)) out = { title: "Growth plan from AI", executive_summary: "AI wrote this summary for the client.", client_challenges: ["Slow site", "Weak titles"], objectives: ["More enquiries"], strategy: [{ title: "Fix basics", description: "Repair the technical issues first." }], deliverables: ["Audit", "Monthly report"], timeline: [{ phase: "Audit", duration: "Weeks 1 to 2", description: "Review" }], investment: { items: [{ name: "Retainer", description: "Monthly", amount: 45000 }], currency: "INR", notes: "Excludes GST." }, terms: "" };
        else if (/Task \(/.test(prompt)) out = { content: "Rewritten by the assistant." };
        else if (/line-item description/.test(prompt)) out = { description: "A concise description written by AI." };
        else if (/client-friendly language/.test(prompt)) { const ids = [...prompt.matchAll(/"id":"([^"]+)"/g)].map((m) => m[1]); out = { summary: "AI summary of the site health.", findings: ids.map((id) => ({ id, explanation: "AI explanation for " + id, recommendation: "AI fix for " + id })) }; }
        else out = { subject: "Following up", body: "Just checking in." };
        return send(res, 200, { content: [{ type: "text", text: JSON.stringify(out) }] });
      }
      if (p === "/auth/v1/signup" && req.method === "POST") {
        const b = JSON.parse((await readBody(req)).toString() || "{}");
        if (await byEmail(b.email)) return send(res, 200, userJson({ ...(await byEmail(b.email)), id: randomUUID() }) && { ...userJson(await byEmail(b.email)), identities: [] });
        const id = randomUUID();
        await db.query("insert into auth.users (id,email,raw_user_meta_data,encrypted_password) values ($1,$2,$3,$4)", [id, b.email, b.data ?? {}, hashPw(b.password)]);
        return send(res, 200, session(await byId(id)));
      }
      if (p === "/auth/v1/verify" && req.method === "POST") {
        const b = JSON.parse((await readBody(req)).toString() || "{}");
        const u = /^e2e:/.test(b.token_hash ?? "") ? await byEmail(String(b.token_hash).slice(4)) : null;
        return u ? send(res, 200, session(u)) : send(res, 403, { code: 403, error_code: "otp_expired", msg: "Email link is invalid or has expired" });
      }
      if (p === "/auth/v1/token" && req.method === "POST") {
        const b = JSON.parse((await readBody(req)).toString() || "{}");
        if (url.searchParams.get("grant_type") === "refresh_token") { const u = await byId(String(b.refresh_token).replace("rt_", "")); return u ? send(res, 200, session(u)) : send(res, 400, { error: "invalid_grant" }); }
        const u = await byEmail(b.email);
        if (u?.banned_until && new Date(u.banned_until) > new Date()) return send(res, 400, { error: "invalid_grant", error_description: "User is banned" });
        if (!u || !u.encrypted_password || !checkPw(b.password, u.encrypted_password)) return send(res, 400, { error: "invalid_grant", error_description: "Invalid login credentials" });
        return send(res, 200, session(u));
      }
      if (p === "/auth/v1/user") {
        const c = bearer(req);
        if (!c?.sub || c.role !== "authenticated") return send(res, 401, { message: "invalid JWT" });
        const u = await byId(c.sub); if (!u) return send(res, 401, { message: "user not found" });
        if (req.method === "PUT") { const b = JSON.parse((await readBody(req)).toString() || "{}"); if (b.password) await db.query("update auth.users set encrypted_password=$2 where id=$1", [u.id, hashPw(b.password)]); }
        return send(res, 200, userJson(await byId(c.sub)));
      }
      if (p === "/auth/v1/logout" || p === "/auth/v1/recover") { await readBody(req); return send(res, 204, ""); }
      if (p.startsWith("/auth/v1/admin/users")) {
        const c = bearer(req); if (c?.role !== "service_role") return send(res, 403, { message: "not admin" });
        if (req.method === "POST") { const b = JSON.parse((await readBody(req)).toString()); const id = randomUUID(); await db.query("insert into auth.users (id,email,raw_user_meta_data,encrypted_password) values ($1,$2,$3,$4)", [id, b.email, b.user_metadata ?? {}, hashPw(b.password ?? randomUUID())]); return send(res, 200, userJson(await byId(id))); }
        if (req.method === "GET" && !p.split("/")[5]) { const rows = (await db.query("select * from auth.users order by created_at asc")).rows; return send(res, 200, { users: rows.map(userJson), total: rows.length, nextPage: null, lastPage: 1 }); }
        const uid = p.split("/")[5];
        if (uid && req.method === "PUT") { const b = JSON.parse((await readBody(req)).toString() || "{}"); if (b.ban_duration) await db.query("update auth.users set banned_until = $2 where id=$1", [uid, b.ban_duration === "none" ? null : new Date(Date.now() + 3.15e12).toISOString()]); if (b.password) await db.query("update auth.users set encrypted_password=$2 where id=$1", [uid, hashPw(b.password)]); const uu = await byId(uid); return uu ? send(res, 200, userJson(uu)) : send(res, 404, { message: "not found" }); }
        if (uid && req.method === "DELETE") { await db.query("delete from auth.users where id=$1", [uid]); return send(res, 200, {}); }
        const id = uid; const u = id ? await byId(id) : null;
        return u ? send(res, 200, userJson(u)) : send(res, 404, { message: "not found" });
      }
      send(res, 404, { message: `stub: ${req.method} ${p} not implemented` });
    } catch (e) { console.error("[stack]", e); send(res, 500, { message: String(e) }); }
  });
  await new Promise((r) => server.listen(PORT, r));
  // wait for PostgREST
  for (let i = 0; i < 50; i++) { try { const r = await fetch(`http://127.0.0.1:${REST_PORT}/`, { headers: { apikey: keys.anon } }); if (r.status < 500) break; } catch { /* retry */ } await new Promise((r) => setTimeout(r, 200)); }
  return { url: `http://localhost:${PORT}`, db, dbUrl, stop: async () => { server.close(); rest.kill(); await db.end(); } };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const s = await start();
  console.log(JSON.stringify({ url: s.url, anon: keys.anon, service: keys.service }));
  process.on("SIGTERM", async () => { await s.stop(); process.exit(0); });
}
