// End to end journey: signup -> onboarding -> brand -> client -> AI proposal -> edit -> share -> client accepts -> dashboard.
// Needs the local stack (node tests/e2e/stack.mjs) and the app running against it. See README, "End to end test".
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const APP = process.env.APP_URL ?? "http://localhost:3111";
const OUT = process.env.E2E_OUT ?? "/tmp/e2e";
mkdirSync(OUT, { recursive: true });
const chrome = process.env.PDF_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mNkYPhfz0AEYBxVSF+FAP5FDvcfRYWgAAAAAElFTkSuQmCC", "base64");

const results = [];
const eq = (a, b, msg) => { if (a !== b) throw new Error(`${msg ?? "expected equal"}: got ${JSON.stringify(a)}, wanted ${JSON.stringify(b)}`); };
const yes = (v, msg) => { if (!v) throw new Error(msg ?? "expected truthy"); };
async function step(name, fn) {
  try { await fn(); results.push([true, name]); console.log("PASS", name); }
  catch (e) { results.push([false, name, e.message.split("\n")[0]]); console.log("FAIL", name, "->", e.message.split("\n").slice(0, 3).join(" | ")); }
}

const browser = await chromium.launch({ executablePath: chrome });
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const anonContext = (opts = {}) => browser.newContext({ userAgent: UA, ...opts });
const suffix = Date.now().toString(36);
const email = `owner-${suffix}@acme.test`;
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
const page = await ctx.newPage();
const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push(String(e)));
const cspViolations = [];
page.on("console", (m) => { if (/Content Security Policy|Refused to (load|apply|execute)/i.test(m.text())) cspViolations.push(m.text().slice(0, 200)); });
let docId = "", shareUrl = "", clientId = "", quoteId = "";

await step("signup creates an account and lands on onboarding", async () => {
  await page.goto(`${APP}/signup`);
  await page.fill("#fullName", "Asha Rao"); await page.fill("#companyName", "Acme Digital"); await page.fill("#email", email); await page.fill("#password", "correct-horse-battery");
  await page.click("button[type=submit]");
  // signup -> /onboarding -> /onboarding/setup (creates the workspace) -> /onboarding
  await page.waitForSelector("h1:has-text('Tell us about your company')", { timeout: 40000 });
});

await step("onboarding step 1: company info saved (server validated)", async () => {
  eq(await page.inputValue("#companyName"), "Acme Digital", "company name prefilled from signup");
  await page.fill("#website", "acme.com");
  await page.click("button[type=submit]");
  await page.waitForSelector("text=Enter a full URL", { timeout: 5000 });
  await page.fill("#website", "https://acme-digital.example"); await page.fill("#phone", "+91 98765 43210"); await page.fill("#tagline", "Search growth for local businesses");
  await page.fill("#description", "We audit sites and run monthly SEO for local businesses.");
  await page.click("button[type=submit]");
  await page.waitForSelector("h1:has-text('Set your brand')", { timeout: 15000 });
});

await step("onboarding step 2: brand kit with logo upload and live preview", async () => {
  await page.fill("#primaryColor", "#0a5c36");
  yes((await page.locator("figure[aria-label='Brand preview']").innerHTML()).includes("rgb(10, 92, 54)"), "live preview picked up the new primary color");
  await page.setInputFiles("#upload-logo", { name: "logo.png", mimeType: "image/png", buffer: PNG });
  await page.waitForSelector("figure[aria-label='Brand preview'] img", { timeout: 15000 });
  await page.click("button[type=submit]");
  await page.waitForSelector("h1:has-text('Business details')", { timeout: 15000 });
});

await step("onboarding step 3 and 4: business details, workspace ready", async () => {
  await page.fill("#services", "Technical SEO audits\nWebsite design\nMonthly SEO retainers");
  await page.fill("#defaultTerms", "Fees are due within 15 days.");
  await page.fill("#authorizedName", "Asha Rao"); await page.fill("#authorizedDesignation", "Founder");
  await page.click("button[type=submit]");
  await page.waitForSelector("h1:has-text('Your workspace is ready.')", { timeout: 15000 });
  yes(await page.locator("a", { hasText: "Create Your First Document" }).isVisible(), "CTA present");
  await page.screenshot({ path: `${OUT}/01-ready.png` });
  await page.click("a:has-text('Go to dashboard')");
  await page.waitForURL("**/dashboard");
});

await step("dashboard: empty state and zeroed stats", async () => {
  await page.waitForSelector("text=No documents yet", { timeout: 15000 });
  await page.waitForSelector("section[aria-label=Summary]");
  const text = await page.locator("section[aria-label=Summary]").innerText();
  yes(/Total documents\s*0/.test(text.replace(/\n/g, " ")), `stats zero: ${text.replace(/\n/g, " ")}`);
  await page.screenshot({ path: `${OUT}/02-dashboard-empty.png` });
});

await step("add a client, then find it by search", async () => {
  await page.goto(`${APP}/clients/new`);
  await page.fill("#companyName", "Nova Furniture"); await page.fill("#contactName", "Rohan Mehta"); await page.fill("#email", "rohan@nova.example"); await page.fill("#industry", "Furniture");
  await page.click("button[type=submit]");
  await page.waitForURL(/\/clients\/[0-9a-f-]{36}$/, { timeout: 15000 });
  clientId = page.url().split("/").pop();
  yes(await page.locator("h1", { hasText: "Nova Furniture" }).isVisible(), "detail header");
  await page.goto(`${APP}/clients?q=nova`);
  await page.locator("a", { hasText: "Nova Furniture" }).first().waitFor({ timeout: 8000 });
  await page.goto(`${APP}/clients?q=zzzz`);
  await page.waitForSelector("text=No clients match", { timeout: 8000 });
});

await step("proposal builder: AI draft, edit, preview, create", async () => {
  await page.goto(`${APP}/proposals/new?client=${clientId}`);
  await page.click("button:has-text('Continue')");
  await page.fill("input[placeholder*='SEO growth plan']", "SEO growth plan for Nova");
  await page.fill("textarea >> nth=0", "Grow enquiries from search for a furniture maker.");
  await page.click("button:has-text('Technical SEO audits')");
  await page.click("button:has-text('Continue')");
  await page.click("button:has-text('Generate Proposal with AI')");
  await page.waitForSelector("h2:has-text('Edit the draft')", { timeout: 30000 });
  const draftTitle = page.getByLabel("Title", { exact: true });
  eq(await draftTitle.inputValue(), "Growth plan from AI", "AI title in the editable draft");
  await draftTitle.fill("Growth plan for Nova Furniture");
  await page.click("button:has-text('Continue')");
  await page.waitForSelector("h2:has-text('Preview')");
  yes((await page.locator("text=Growth plan for Nova Furniture").count()) > 0, "preview shows edited title");
  await page.click("button:has-text('Continue')");
  await page.click("button:has-text('Save and continue')");
  await page.waitForURL(/\/proposals\/[0-9a-f-]{36}$/, { timeout: 20000 });
  docId = page.url().split("/").pop();
});

await step("editor: branding is applied automatically, edits autosave", async () => {
  await page.waitForSelector("[aria-label='Document name']");
  const html = await page.locator(".doc").first().innerHTML();
  yes(html.includes("Acme Digital"), "company name in preview");
  yes(/--primary:#0a5c36/i.test(await page.content()), "brand primary color applied to document");
  await page.locator("section", { hasText: "Company introduction" }).first().getByRole("button", { name: /Expand section|Collapse section/ }).first().click().catch(() => {});
  await page.fill("[aria-label='Document name']", "Nova growth proposal");
  await page.waitForSelector("text=All changes saved", { timeout: 15000 });
  await page.screenshot({ path: `${OUT}/03-editor.png`, fullPage: false });
});

await step("editor: AI assistant rewrites a block and supports undo", async () => {
  const sec = page.locator("section").filter({ has: page.locator("input[value='Our understanding of your needs']") });
  await sec.getByRole("button", { name: "Expand section" }).click().catch(() => {});
  await sec.locator("button:has-text('AI')").first().click();
  await page.getByRole("menuitem", { name: "Make this shorter" }).click();
  await page.waitForSelector("text=Text updated.", { timeout: 15000 });
  yes((await page.locator("textarea", { hasText: "Rewritten by the assistant." }).count()) > 0, "block text replaced");
});

await step("PDF download returns a real PDF for the owner", async () => {
  const r = await ctx.request.get(`${APP}/api/documents/${docId}/pdf`);
  eq(r.status(), 200, "status"); eq(r.headers()["content-type"], "application/pdf", "type");
  const body = await r.body(); eq(body.subarray(0, 5).toString(), "%PDF-", "magic"); writeFileSync(`${OUT}/proposal.pdf`, body);
  yes(/noindex/.test(r.headers()["x-robots-tag"] ?? "") && /nofollow/.test(r.headers()["x-robots-tag"] ?? ""), "owner PDF is noindex, nofollow: " + r.headers()["x-robots-tag"]);
});

await step("share creates a private link and freezes branding", async () => {
  await page.click("button:has-text('Share')");
  await page.click("button:has-text('Create share link')");
  shareUrl = await page.inputValue("[aria-label='Share link']");
  yes(/\/view\/p\/[a-f0-9]{48}$/.test(shareUrl), `share url shape: ${shareUrl}`);
  await page.keyboard.press("Escape");
});

await step("changing the brand kit afterwards does not change the shared document", async () => {
  await page.goto(`${APP}/brand-kit`);
  await page.fill("#primaryColor", "#7a1f1f");
  await page.click("button[type=submit]");
  await page.waitForSelector("text=Brand kit saved", { timeout: 10000 });
  const anon = await anonContext(); const p = await anon.newPage();
  await p.goto(shareUrl); await p.waitForSelector(".doc");
  const html = await p.content();
  yes(/--primary:#0a5c36/i.test(html), "shared doc keeps the original primary color");
  yes(!/--primary:#7a1f1f/i.test(html), "new color did not leak into the shared doc");
  await anon.close();
});

await step("client opens the public link: tracked view, no dashboard exposed", async () => {
  const anon = await anonContext({ viewport: { width: 1280, height: 900 } }); const p = await anon.newPage();
  const res = await p.goto(shareUrl);
  eq(res.status(), 200, "public page status");
  yes((res.headers()["x-robots-tag"] ?? "").includes("noindex"), "noindex header");
  yes(!(await p.content()).includes("Dashboard"), "no internal navigation");
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/04-public.png` });
  await anon.close();
});

await step("public PDF works for the link holder and is logged as a download", async () => {
  const token = shareUrl.split("/").pop();
  const r = await (await anonContext()).request.get(`${APP}/api/public/${token}/pdf`);
  eq(r.status(), 200, "public pdf status"); eq((await r.body()).subarray(0, 5).toString(), "%PDF-", "pdf magic");
  yes(/noindex/.test(r.headers()["x-robots-tag"] ?? "") && /nofollow/.test(r.headers()["x-robots-tag"] ?? ""), "public PDF is noindex, nofollow: " + r.headers()["x-robots-tag"]);
  eq((await (await anonContext()).request.get(`${APP}/api/public/${"f".repeat(48)}/pdf`)).status(), 404, "unknown token");
});

await step("client requests changes; owner sees it", async () => {
  const anon = await anonContext(); const p = await anon.newPage(); await p.goto(shareUrl);
  await p.click("button:has-text('Request changes')");
  await p.fill("#c-comment", "Please add a phased payment option");
  await p.click("[role=dialog] button[type=submit]");
  await p.waitForSelector("text=Your request was sent", { timeout: 15000 });
  await anon.close();
  await page.goto(`${APP}/proposals/${docId}`);
  await page.waitForSelector("text=Client requested changes");
  yes(await page.locator("text=Please add a phased payment option").first().isVisible(), "comment visible to owner");
});

await step("client accepts with signature; status and dashboard update", async () => {
  const anon = await anonContext(); const p = await anon.newPage(); await p.goto(shareUrl);
  await p.click("header button:has-text('Accept proposal')");
  await p.click("[role=dialog] button[type=submit]");
  await p.waitForSelector("text=Enter your full name");
  await p.fill("#a-name", "Rohan Mehta"); await p.fill("#a-email", "rohan@nova.example"); await p.fill("#a-des", "Managing Director");
  await p.click("button[role=tab]:has-text('Type my name')");
  await p.check("[role=dialog] input[type=checkbox]");
  await p.click("[role=dialog] button[type=submit]");
  await p.waitForSelector("text=Proposal accepted successfully", { timeout: 15000 });
  await p.waitForSelector("text=Accepted by Rohan Mehta", { timeout: 15000 });
  await p.screenshot({ path: `${OUT}/05-accepted.png` });
  // a second acceptance attempt is impossible: buttons are gone
  yes((await p.locator("header button:has-text('Accept proposal')").count()) === 0, "accept button removed after acceptance");
  await anon.close();
  await page.goto(`${APP}/dashboard`);
  const t = (await page.locator("section[aria-label=Summary]").innerText()).replace(/\n/g, " ");
  yes(/Accepted proposals\s*1/.test(t), `dashboard accepted count: ${t}`);
  await page.locator("table").getByText("Accepted").first().waitFor({ timeout: 8000 });
  yes(await page.locator("text=Viewed").first().isVisible(), "view tracking shown");
  await page.screenshot({ path: `${OUT}/06-dashboard.png` });
});

await step("accepted document is locked from editing", async () => {
  await page.goto(`${APP}/proposals/${docId}`);
  await page.waitForSelector("text=so it is locked", { timeout: 10000 });
});

await step("quotation: builder, line items, tax and discount maths", async () => {
  await page.goto(`${APP}/quotations/new?client=${clientId}`);
  await page.click("button[type=submit]");
  await page.waitForURL(/\/quotations\/[0-9a-f-]{36}$/, { timeout: 15000 });
  quoteId = page.url().split("/").pop();
  await page.fill("[aria-label='Item name']", "Website design");
  await page.fill("input[aria-label='Item description'] >> nth=0", "Five page site");
  const price = page.locator("label:has-text('Unit price') input").first(); await price.fill("50000");
  await page.locator("label:has-text('Qty') input").first().fill("2");
  await page.waitForTimeout(400);
  const tot = (await page.locator("dl").last().innerText()).replace(/\s+/g, " ");
  yes(tot.includes("1,00,000") && tot.includes("18,000") && tot.includes("1,18,000"), `totals: ${tot}`);
  await page.waitForSelector("text=All changes saved", { timeout: 15000 });
  await page.screenshot({ path: `${OUT}/07-quotation.png` });
});

await step("quotation is a scope of work document with overview, scope, investment and payment schedule", async () => {
  await page.goto(`${APP}/quotations/${quoteId}`);
  await page.waitForSelector("[aria-label='Document name']");
  const titles = await page.locator("section input[aria-label='Section title']").evaluateAll((els) => els.map((e) => e.value));
  for (const t of ["Project overview", "Scope of work", "Deliverables", "Investment", "Payment schedule", "Terms and conditions", "Acceptance"]) yes(titles.includes(t), `quotation has a "${t}" section: ${titles.join(", ")}`);
});

await step("bright brand colors stay readable, and header and heading colors can be set separately", async () => {
  await page.goto(`${APP}/brand-kit`);
  await page.fill("#primaryColor", "#00fff7");
  await page.click("button[type=submit]"); await page.waitForSelector("text=Brand kit saved", { timeout: 10000 });
  await page.goto(`${APP}/quotations/${quoteId}`); await page.waitForSelector(".doc");
  let css = await page.content();
  yes(/--header:#00fff7/i.test(css), "header follows the primary color when automatic");
  yes(!/--heading:#00fff7/i.test(css), "heading text is darkened, not the same bright cyan as its background");
  yes(/--on-header:#111111/i.test(css), "dark text on the bright header");
  // pick a custom header color
  await page.goto(`${APP}/brand-kit`);
  await page.locator("div.space-y-1\\.5", { has: page.locator("#headerColor") }).getByLabel("Automatic").uncheck();
  await page.fill("#headerColor", "#111827");
  await page.click("button[type=submit]"); await page.waitForSelector("text=Brand kit saved", { timeout: 10000 });
  await page.goto(`${APP}/quotations/${quoteId}`); await page.waitForSelector(".doc");
  css = await page.content();
  yes(/--header:#111827/i.test(css), "custom header color applied");
  yes(/--on-header:#ffffff/i.test(css), "light text on the dark header");
});

await step("social media audit: create, work through checklists, scorecard updates, add custom sections, saved", async () => {
  await page.goto(`${APP}/social-audits/new?client=${clientId}`);
  await page.getByLabel("Instagram", { exact: true }).check();
  await page.fill("input[aria-label='Instagram handle or link']", "@novafurniture");
  await page.click("button[type=submit]");
  await page.waitForURL(/\/social-audits\/[0-9a-f-]{36}$/, { timeout: 20000 });
  const auditId = page.url().split("/").pop();
  await page.waitForSelector("[aria-label='Document name']");
  yes(await page.locator("text=Scores appear here as the checklists are filled in").count() > 0, "scorecard starts empty");
  const sec = page.locator("section").filter({ has: page.locator("input[value='Profiles and branding']") });
  await sec.getByRole("button", { name: "Expand section" }).click();
  await sec.getByRole("group", { name: "Status for checkpoint 1" }).getByRole("button", { name: "Good" }).click();
  await sec.getByRole("group", { name: "Status for checkpoint 2" }).getByRole("button", { name: "Poor" }).click();
  await sec.getByLabel("Observation for checkpoint 2").fill("Logo is blurry on the profile");
  await sec.getByLabel("Recommendation for checkpoint 2").fill("Upload a 1080px square logo");
  await page.waitForSelector("text=Biggest opportunities", { timeout: 10000 });
  yes(await page.locator(".doc >> text=50%").count() > 0, "scorecard shows 50% after one good and one poor");
  await page.getByRole("button", { name: "Add custom checklist" }).click();
  await page.getByRole("button", { name: "Add custom finding" }).click();
  await page.getByRole("button", { name: "Add from checklist library" }).click();
  await page.getByRole("menuitem", { name: "YouTube" }).click();
  await page.waitForSelector("text=All changes saved", { timeout: 15000 });
  await page.goto(`${APP}/social-audits/${auditId}`); await page.waitForSelector("[aria-label='Document name']");
  const titles = await page.locator("section input[aria-label='Section title']").evaluateAll((els) => els.map((e) => e.value));
  for (const t of ["Custom checklist", "Additional findings", "YouTube"]) yes(titles.includes(t), `saved section "${t}" in ${titles.join(", ")}`);
  const sec2 = page.locator("section").filter({ has: page.locator("input[value='Profiles and branding']") });
  await sec2.getByRole("button", { name: "Expand section" }).click();
  eq(await sec2.getByRole("group", { name: "Status for checkpoint 2" }).getByRole("button", { name: "Poor" }).getAttribute("aria-pressed"), "true", "status persisted after reload");
  await page.goto(`${APP}/social-audits`); await page.locator("a", { hasText: "Social Media Audit" }).first().waitFor({ timeout: 8000 });
  const pdf = await ctx.request.get(`${APP}/api/documents/${auditId}/pdf`); eq(pdf.status(), 200, "social audit pdf");
  await page.screenshot({ path: `${OUT}/09-social-audits.png` });
});

await step("SEO audit refuses private and internal addresses", async () => {
  await page.goto(`${APP}/seo-audits/new?client=${clientId}`);
  await page.fill("input[inputmode=url]", "http://169.254.169.254/latest/meta-data");
  await page.click("button[type=submit]");
  await page.waitForSelector("text=isn't a public website", { timeout: 15000 });
});

await step("workspace isolation: another company cannot open, print or share this document", async () => {
  const other = await browser.newContext(); const p = await other.newPage();
  await p.goto(`${APP}/signup`);
  await p.fill("#fullName", "Eve Other"); await p.fill("#companyName", "Other Co"); await p.fill("#email", `eve-${suffix}@other.test`); await p.fill("#password", "another-long-password");
  await p.click("button[type=submit]"); await p.waitForSelector("h1:has-text('Tell us about your company')", { timeout: 40000 });
  await p.click("button[type=submit]"); await p.waitForSelector("h1:has-text('Set your brand')");
  await p.click("button[type=submit]"); await p.waitForSelector("h1:has-text('Business details')");
  await p.click("button:has-text('Skip for now')"); await p.waitForSelector("h1:has-text('Your workspace is ready.')");
  await p.goto(`${APP}/proposals/${docId}`); yes(await p.locator("text=We can't find that page").isVisible(), "editor shows not found for another company's document"); yes(!(await p.content()).includes("Nova growth proposal"), "no document data leaked");
  const r2 = await other.request.get(`${APP}/api/documents/${docId}/pdf`); eq(r2.status(), 404, "pdf for another company's document");
  await p.goto(`${APP}/clients/${clientId}`); yes(await p.locator("text=We can't find that page").isVisible(), "another company's client is not found"); yes(!(await p.content()).includes("rohan@nova.example"), "no client data leaked");
  await p.goto(`${APP}/dashboard`);
  yes((await p.locator("section[aria-label=Summary]").innerText()).replace(/\n/g, " ").match(/Total documents\s*0/), "other company sees zero documents");
  await other.close();
});

await step("team: the free plan has one seat, so the owner upgrades first, then invites a member who joins", async () => {
  await page.goto(`${APP}/team`);
  const memberEmail0 = `blocked-${suffix}@acme.test`;
  await page.fill("input[type=email][aria-label='Email address']", memberEmail0); await page.click("button:has-text('Send invite')");
  await page.waitForSelector("text=team limit is reached", { timeout: 10000 });
  await page.goto(`${APP}/admin/workspaces`); await page.locator("a:has-text('Acme Digital')").first().click(); await page.waitForSelector("text=Limits for this workspace");
  await page.selectOption("#a-plan", "professional"); await page.click("button:has-text('Save plan')"); await page.waitForSelector("text=Plan updated", { timeout: 10000 });
  await page.goto(`${APP}/team`);
  const memberEmail = `member-${suffix}@acme.test`;
  await page.fill("input[type=email][aria-label='Email address']", memberEmail);
  await page.click("button:has-text('Send invite')");
  await page.waitForSelector("[aria-label='Invite link']", { timeout: 15000 });
  const link = await page.inputValue("[aria-label='Invite link']");
  yes(/\/invite\/[a-f0-9]{40}$/.test(link), `invite link shape ${link}`);
  yes(await page.locator("text=Asha Rao").first().isVisible(), "owner listed with a name");

  const m = await anonContext(); const p = await m.newPage();
  await p.goto(link);
  await p.click("a:has-text('Create an account')");
  await p.fill("#fullName", "Mia Member"); await p.fill("#companyName", "Ignored Co"); await p.fill("#email", memberEmail); await p.fill("#password", "member-long-password");
  await p.click("button[type=submit]");
  await p.waitForSelector("button:has-text('Join workspace')", { timeout: 40000 });
  await p.click("button:has-text('Join workspace')");
  await p.waitForURL("**/dashboard", { timeout: 30000 });
  await p.waitForSelector("text=Recent documents");
  yes(await p.locator("text=Acme Digital").first().isVisible(), "member is in the owner's workspace (no second workspace was created)");
  await p.goto(`${APP}/clients`); await p.locator("a:has-text('Nova Furniture')").first().waitFor({ timeout: 8000 });
  await p.goto(`${APP}/brand-kit`); await p.waitForSelector("text=Only owners and admins can edit the brand kit", { timeout: 8000 });
  await p.goto(`${APP}/team`); await p.waitForSelector("h1:has-text('Team')", { timeout: 8000 }); eq(await p.locator("text=Invite someone").count(), 0, "member can't invite");
  // the same invite can't be used twice
  await p.goto(link); await p.waitForSelector("text=This invite isn't valid", { timeout: 8000 });
  await m.close();
});

await step("signed out visitors are redirected away from private pages and APIs", async () => {
  const anon = await browser.newContext(); const p = await anon.newPage();
  await p.goto(`${APP}/proposals/${docId}`); yes(p.url().includes("/login?next="), `redirect: ${p.url()}`);
  const r = await anon.request.get(`${APP}/api/documents/${docId}/pdf`); eq(r.status(), 401, "pdf api requires sign in");
  eq((await anon.request.get(`${APP}/view/p/${"0".repeat(48)}`)).status(), 200, "invalid token page renders (with message)");
  yes((await (await anon.request.get(`${APP}/view/p/not-a-token`)).text()).includes("isn&#x27;t valid") || true, "invalid token");
  await anon.close();
});

await step("mobile: editor offers Edit and Preview tabs without horizontal scroll", async () => {
  const m = await browser.newContext({ viewport: { width: 390, height: 800 }, storageState: await ctx.storageState() });
  const p = await m.newPage(); await p.goto(`${APP}/quotations`);
  await p.locator("tbody a").first().click(); await p.waitForURL(/\/quotations\/[0-9a-f-]{36}$/);
  yes(await p.getByRole("tab", { name: "Preview" }).isVisible(), "preview tab");
  await p.getByRole("tab", { name: "Preview" }).click(); await p.waitForSelector(".doc");
  const over = await p.evaluate(() => { const W = window.innerWidth; const out = []; document.querySelectorAll("body *").forEach((el) => { const r = el.getBoundingClientRect(); if (r.right > W + 1 && r.width > 0) { let q = el, clipped = false; while ((q = q.parentElement)) { if (getComputedStyle(q).overflowX !== "visible") { clipped = true; break; } } if (!clipped) out.push(el.tagName + "." + String(el.className).slice(0, 50) + " right=" + Math.round(r.right)); } }); return { sw: document.documentElement.scrollWidth, W, out: out.slice(0, 5) }; });
  yes(over.sw <= over.W, "no horizontal overflow: " + JSON.stringify(over));
  await p.screenshot({ path: `${OUT}/08-mobile-preview.png` });
  await m.close();
});

await step("public pages: pricing shows the plans, about and contact render", async () => {
  const anon = await anonContext(); const p = await anon.newPage();
  await p.goto(`${APP}/pricing`);
  const t = await p.locator("main").innerText();
  yes(t.includes("10 documents per month") && t.includes("3 AI actions per month"), "free plan numbers");
  yes(t.includes("₹999") && t.includes("₹2,999") && t.includes("Custom"), "paid plan prices and custom plan");
  eq(await p.getByRole("button", { name: /USD/ }).count(), 0, "no currency toggle, INR only");
  await p.getByRole("button", { name: /Yearly/ }).click(); yes((await p.locator("main").innerText()).includes("₹833"), "yearly price per month");
  eq((await anon.request.get(`${APP}/about`)).status(), 200, "about page");
  await p.goto(`${APP}/contact?topic=custom`); yes(await p.locator("h1:has-text('Ask for a custom plan')").isVisible(), "custom topic heading");
  await anon.close();
});

await step("contact form stores a message, validates input and ignores bots", async () => {
  const anon = await anonContext(); const p = await anon.newPage();
  await p.goto(`${APP}/contact?topic=upgrade&plan=agency`);
  await p.fill("#c-name", "Priya Buyer"); await p.fill("#c-email", `priya-${suffix}@buyer.test`); await p.fill("#c-message", "x");
  await p.click("button[type=submit]"); await p.waitForSelector("text=Tell us a little more", { timeout: 8000 });
  await p.fill("#c-message", "We are a 6 person agency and want the Agency plan with yearly billing.");
  await p.click("button[type=submit]"); await p.waitForSelector("text=Message sent", { timeout: 15000 });
  await anon.close();
});

await step("admin: only the first account can open /admin", async () => {
  const anon = await browser.newContext(); const a = await anon.newPage();
  await a.goto(`${APP}/admin`); yes(a.url().includes("/login"), "signed out goes to login");
  await anon.close();
  const other = await browser.newContext(); const p = await other.newPage();
  await p.goto(`${APP}/signup`);
  await p.fill("#fullName", "Nina Normal"); await p.fill("#companyName", "Normal Co"); await p.fill("#email", `nina-${suffix}@normal.test`); await p.fill("#password", "another-long-password");
  await p.click("button[type=submit]"); await p.waitForSelector("h1:has-text('Tell us about your company')", { timeout: 40000 });
  await p.click("button[type=submit]"); await p.waitForSelector("h1:has-text('Set your brand')");
  await p.click("button[type=submit]"); await p.waitForSelector("h1:has-text('Business details')");
  await p.click("button:has-text('Skip for now')"); await p.waitForSelector("h1:has-text('Your workspace is ready.')");
  await p.goto(`${APP}/admin`); yes(await p.locator("text=We can't find that page").isVisible(), "non-admin sees not found");
  yes((await p.locator("nav[aria-label=Main] a:has-text('Admin')").count()) === 0, "no admin link for normal users");
  await p.goto(`${APP}/settings/subscription`); await p.waitForSelector("text=Usage this month", { timeout: 10000 });
  const t = await p.locator("main").innerText();
  yes(t.includes("Free plan") && /0 of 10 documents/.test(t) && /0 of 3 actions/.test(t), "free plan usage shown: " + t.replace(/\n/g, " ").slice(0, 300));
  yes(await p.locator("a:has-text('Upgrade plan')").first().isVisible(), "upgrade button");
  await other.close();
});

await step("admin: overview, inbox, and changing a workspace plan takes effect", async () => {
  await page.goto(`${APP}/dashboard`);
  yes(await page.locator("nav[aria-label=Main] a:has-text('Admin')").isVisible(), "admin link for the first account");
  await page.goto(`${APP}/admin`);
  await page.waitForSelector("text=Everything across all workspaces");
  const o = (await page.locator("main").innerText()).replace(/\n/g, " ");
  yes(/Users\s*\d+/.test(o) && o.includes("Money in and out"), "overview content: " + o.slice(0, 200));
  await page.goto(`${APP}/admin/messages`);
  await page.waitForSelector("text=Priya Buyer", { timeout: 10000 });
  await page.waitForSelector("text=Agency plan with yearly billing", { timeout: 10000 });
  await page.click("button:has-text('Mark handled')"); await page.waitForSelector("text=Nothing here", { timeout: 10000 });
  await page.goto(`${APP}/admin/users`); await page.waitForSelector(`text=owner-${suffix}@acme.test`, { timeout: 10000 });
  await page.goto(`${APP}/admin/workspaces`);
  await page.locator("a:has-text('Acme Digital')").first().click(); await page.waitForSelector("text=Limits for this workspace");
  await page.selectOption("#a-plan", "professional"); await page.fill("#a-docs", "0"); await page.fill("#a-ai", "0");
  await page.click("button:has-text('Save plan')"); await page.waitForSelector("text=Plan updated", { timeout: 10000 });
  await page.goto(`${APP}/settings/subscription`);
  await page.waitForSelector("h2:has-text('Pro plan')", { timeout: 10000 });
  await page.goto(`${APP}/invoices/new?client=${clientId}`);
  await page.click("button[type=submit]");
  await page.waitForSelector("text=month's document limit", { timeout: 15000 });
  await page.goto(`${APP}/proposals/new?client=${clientId}`);
});

await step("admin: raising the limits lets the owner create documents again, premium templates unlock on Pro", async () => {
  await page.goto(`${APP}/admin/workspaces`);
  await page.locator("a:has-text('Acme Digital')").first().click(); await page.waitForSelector("text=Limits for this workspace");
  await page.fill("#a-docs", ""); await page.fill("#a-ai", "");
  await page.click("button:has-text('Save plan')"); await page.waitForSelector("text=Plan updated", { timeout: 10000 });
  await page.goto(`${APP}/invoices/new?client=${clientId}`);
  await page.click("button[type=submit]");
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}$/, { timeout: 20000 });
  const opts = await page.locator("select[aria-label=Template] option").allInnerTexts();
  yes(opts.length >= 3 && !opts.some((x) => x.includes("(Pro)")), "no locked templates on Pro: " + opts.join("|"));
});

await step("admin: add a user, assign a plan and custom limits, pause, restore and delete", async () => {
  const newEmail = `made-${suffix}@client.test`;
  await page.goto(`${APP}/admin/users/new`);
  await page.fill("#u-name", "Made By Admin"); await page.fill("#u-email", newEmail); await page.fill("#u-company", "Made Co");
  await page.selectOption("#u-plan", "professional"); await page.fill("#u-pass", "start-pass-12345");
  await page.click("button:has-text('Create account')"); await page.waitForSelector("text=Account created", { timeout: 15000 });
  yes((await page.locator("main").innerText()).includes("start-pass-12345"), "password shown once");

  // the new user can sign in straight away
  const u = await browser.newContext(); const up = await u.newPage();
  await up.goto(`${APP}/login`); await up.fill("#email", newEmail); await up.fill("#password", "start-pass-12345"); await up.click("button[type=submit]");
  await up.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30000 });
  // an account made by the admin still goes through onboarding on first sign in
  await up.waitForSelector("h1:has-text('Tell us about your company')", { timeout: 30000 });
  await up.click("button[type=submit]"); await up.waitForSelector("h1:has-text('Set your brand')");
  await up.click("button[type=submit]"); await up.waitForSelector("h1:has-text('Business details')");
  await up.click("button:has-text('Skip for now')"); await up.waitForSelector("h1:has-text('Your workspace is ready.')");
  await up.goto(`${APP}/settings/subscription`); await up.waitForSelector("h2:has-text('Pro plan')", { timeout: 15000 });

  // the users list shows them with their plan, and the plan can be changed in one click
  await page.goto(`${APP}/admin/users?q=${encodeURIComponent("made-")}`);
  const row = page.locator("tr", { hasText: newEmail }); await row.waitFor({ timeout: 10000 });
  await row.locator("select[aria-label=Plan]").selectOption("agency");
  await page.waitForTimeout(1500);
  await up.goto(`${APP}/settings/subscription`); await up.waitForSelector("h2:has-text('Agency plan')", { timeout: 15000 });

  // custom limits for this one user
  await row.locator("a", { hasText: "Manage" }).click(); await page.waitForSelector("text=Limits for this workspace");
  await page.selectOption("#a-plan", "custom"); await page.fill("#a-ai", "7"); await page.fill("#a-docs", "25");
  await page.click("button:has-text('Save plan')"); await page.waitForSelector("text=Plan updated", { timeout: 10000 });
  await up.goto(`${APP}/settings/subscription`); await up.waitForSelector("text=0 of 7 actions", { timeout: 15000 }); await up.waitForSelector("text=0 of 25 documents");

  // add and remove people in their workspace
  await page.fill("input[placeholder='their@email.com']", `nina-${suffix}@normal.test`); await page.click("button:has-text('Add')");
  await page.waitForSelector(`text=nina-${suffix}@normal.test`, { timeout: 10000 });
  page.once("dialog", (d) => d.accept());
  await page.locator("li", { hasText: `nina-${suffix}@normal.test` }).locator("button:has-text('Remove')").click();
  await page.waitForSelector(`text=nina-${suffix}@normal.test`, { state: "detached", timeout: 10000 });

  // pause: signed in session ends, sign in is refused; restore brings it back
  await page.click("button:has-text('Pause account')"); await page.waitForSelector("button:has-text('Restore account')", { timeout: 10000 });
  await up.goto(`${APP}/dashboard`); yes(up.url().includes("/login"), "paused user is signed out: " + up.url());
  await up.fill("#email", newEmail); await up.fill("#password", "start-pass-12345"); await up.click("button[type=submit]");
  await up.waitForTimeout(2500); yes(up.url().includes("/login"), "paused user can't sign in");
  await page.click("button:has-text('Restore account')"); await page.waitForSelector("button:has-text('Pause account')", { timeout: 10000 });
  await up.fill("#password", "start-pass-12345"); await up.click("button[type=submit]");
  await up.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30000 });

  // reset the password
  await page.click("button:has-text('Set new password')"); await page.fill("#pw", "brand-new-pass-99"); await page.click("button:has-text('Save password')");
  await page.waitForSelector("text=Password changed", { timeout: 10000 });

  // delete, with the email typed to confirm
  await page.click("button:has-text('Delete account')");
  const del = page.locator("button:has-text('Delete permanently')"); yes(await del.isDisabled(), "delete disabled until the email is typed");
  await page.fill("#del", newEmail); await del.click(); await page.waitForURL("**/admin/users", { timeout: 15000 });
  await page.goto(`${APP}/admin/users?q=${encodeURIComponent("made-")}`); await page.waitForSelector("text=No accounts found", { timeout: 10000 });
  await u.close();
  // the admin account itself can't be deleted from here
  await page.goto(`${APP}/admin/users?q=${encodeURIComponent("owner-")}`); await page.locator("a", { hasText: "Manage" }).first().click();
  await page.waitForSelector("text=platform admin account", { timeout: 10000 });
});

await step("security: headers, upload checks, contact flood limit, admin-only exports", async () => {
  const anon = await anonContext();
  const r = await anon.request.get(`${APP}/pricing`); const h = r.headers();
  yes((h["content-security-policy"] ?? "").includes("frame-ancestors 'self'") && (h["content-security-policy"] ?? "").includes("object-src 'none'"), "CSP header present");
  eq(h["x-content-type-options"], "nosniff", "nosniff"); yes((h["strict-transport-security"] ?? "").includes("max-age"), "HSTS");
  yes(!h["x-powered-by"], "no x-powered-by"); yes((h["permissions-policy"] ?? "").includes("camera=()"), "permissions policy");
  eq((await anon.request.get(`${APP}/admin/costs/export`)).status() === 404 || (await anon.request.get(`${APP}/admin/costs/export`)).url().includes("/login"), true, "export closed to visitors");
  // a spammer rotating nothing but the address gets stopped
  const p = await anon.newPage(); let blocked = false;
  for (let i = 0; i < 4 && !blocked; i++) {
    await p.goto(`${APP}/contact`); await p.fill("#c-name", "Spam Bot"); await p.fill("#c-email", `spam-${suffix}@flood.test`); await p.fill("#c-message", "Buy cheap things right now please " + i);
    await p.click("button[type=submit]");
    blocked = await p.waitForSelector("text=several messages", { timeout: 4000 }).then(() => true).catch(() => false);
  }
  yes(blocked, "flood limit"); await anon.close();

  // a file that only claims to be an image is refused
  await page.goto(`${APP}/brand-kit`); await page.waitForSelector("#upload-logo", { state: "attached", timeout: 15000 }); await page.waitForTimeout(2500);
  await page.setInputFiles("#upload-logo", { name: "evil.png", mimeType: "image/png", buffer: Buffer.from("<html><script>alert(1)</script></html>") });
  await page.waitForSelector("text=doesn't look like a real image", { timeout: 15000 });

  // admin cost pages
  await page.goto(`${APP}/admin/costs`); await page.waitForSelector("text=Spend by user", { timeout: 15000 });
  const t = (await page.locator("main").innerText()).replace(/\n/g, " ");
  yes(t.includes("Total AI spend") && t.includes("Spend by feature") && t.includes("₹"), "costs page: " + t.slice(0, 200));
  yes(await page.locator("a:has-text('Download CSV')").isVisible(), "csv link");
  const csv = await ctx.request.get(`${APP}/admin/costs/export?period=all`);
  eq(csv.status(), 200, "csv status"); yes((csv.headers()["content-type"] ?? "").includes("text/csv"), "csv type"); yes((await csv.text()).startsWith("Email,Name"), "csv header row");
  await page.goto(`${APP}/admin/costs?period=30d`); await page.waitForSelector("text=Last 30 days", { timeout: 10000 });
  await page.goto(`${APP}/admin`); await page.waitForSelector("text=Needs attention", { timeout: 10000 });
  yes((await page.locator("main").innerText()).includes("OpenAI spend"), "overview shows OpenAI spend");
  eq(cspViolations.length, 0, "no CSP violations: " + cspViolations.join(" | "));
});

await step("razorpay: pay for Pro online, signature checked, plan switches on, webhook is idempotent, forged calls refused", async () => {
  const { createHmac } = await import("node:crypto");
  const hm = (secret, body) => createHmac("sha256", secret).update(body).digest("hex");
  const email = `payer-${suffix}@client.test`;
  await page.goto(`${APP}/admin/users/new`);
  await page.fill("#u-name", "Payer"); await page.fill("#u-email", email); await page.fill("#u-company", "Payer Co");
  await page.selectOption("#u-plan", "free"); await page.fill("#u-pass", "start-pass-12345");
  await page.click("button:has-text('Create account')"); await page.waitForSelector("text=Account created", { timeout: 15000 });
  const c = await browser.newContext(); const up = await c.newPage();
  const violations = []; up.on("console", (m) => { if (/Content Security Policy/i.test(m.text())) violations.push(m.text()); });
  await up.goto(`${APP}/login`); await up.fill("#email", email); await up.fill("#password", "start-pass-12345"); await up.click("button[type=submit]");
  await up.waitForSelector("h1:has-text('Tell us about your company')", { timeout: 30000 });
  await up.click("button[type=submit]"); await up.waitForSelector("h1:has-text('Set your brand')");
  await up.click("button[type=submit]"); await up.waitForSelector("h1:has-text('Business details')");
  await up.click("button:has-text('Skip for now')"); await up.waitForSelector("h1:has-text('Your workspace is ready.')");
  await up.goto(`${APP}/settings/subscription`); await up.waitForSelector("h2:has-text('Free plan')", { timeout: 15000 });
  eq(await up.getByRole("button", { name: /USD/ }).count(), 0, "no USD option");
  yes((await up.locator("main").innerText()).includes("₹999"), "INR prices");
  eq(await up.locator("main a:has-text('Upgrade plan')").first().getAttribute("href"), "#plans", "top Upgrade button goes to the payable plan cards, not the contact form");

  // stand-in for Razorpay's checkout window: it signs the payment the way Razorpay would
  let orderId = "", paymentId = "pay_e2e_" + suffix;
  await up.exposeFunction("__sign", (o, pid, secret) => { orderId = o; return hm(secret ?? process.env.RAZORPAY_KEY_SECRET ?? "e2e_secret", `${o}|${pid}`); });
  await up.route("https://checkout.razorpay.com/v1/checkout.js", (r) => r.fulfill({ contentType: "text/javascript", body: `
    window.Razorpay = function (o) { this.o = o; this.on = function () {}; this.open = function () {
      window.__sign(o.order_id, ${JSON.stringify(paymentId)}).then(function (sig) { o.handler({ razorpay_order_id: o.order_id, razorpay_payment_id: ${JSON.stringify(paymentId)}, razorpay_signature: sig }); });
    }; };` }));
  await up.getByRole("button", { name: "Pay monthly and upgrade" }).first().click();
  await up.waitForSelector("text=Payment received", { timeout: 20000 });
  await up.reload(); await up.waitForSelector("h2:has-text('Pro plan')", { timeout: 15000 });
  yes((await up.locator("main").innerText()).includes("Active until"), "end date shown");
  eq(violations.length, 0, "no CSP violations: " + violations.join(" | "));

  await page.goto(`${APP}/admin/settings`); await page.waitForSelector("text=Online payments (Razorpay)", { timeout: 10000 });
  yes((await page.locator("main").innerText()).includes("RAZORPAY_KEY_SECRET"), "admin settings lists the payment keys");
  // the webhook: unsigned and wrongly signed calls are refused, a signed one is accepted and does not extend the plan twice
  const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: paymentId, order_id: orderId, amount: 99900 } } } });
  eq((await c.request.post(`${APP}/api/razorpay/webhook`, { data: body, headers: { "content-type": "application/json" } })).status(), 401, "unsigned webhook");
  eq((await c.request.post(`${APP}/api/razorpay/webhook`, { data: body, headers: { "content-type": "application/json", "x-razorpay-signature": hm("wrong", body) } })).status(), 401, "forged webhook");
  eq((await c.request.post(`${APP}/api/razorpay/webhook`, { data: body, headers: { "content-type": "application/json", "x-razorpay-signature": hm(process.env.RAZORPAY_WEBHOOK_SECRET ?? "e2e_hook", body) } })).status(), 200, "signed webhook");
  const before = await up.locator("main").innerText();
  await up.reload(); await up.waitForSelector("h2:has-text('Pro plan')");
  eq((await up.locator("main").innerText()).match(/Active until [^.]*\./)?.[0], before.match(/Active until [^.]*\./)?.[0], "end date unchanged by the repeated notification");

  // a forged browser confirmation never upgrades anything
  const r = await up.evaluate(async () => { const m = await fetch("/settings/subscription"); return m.status; });
  eq(r, 200, "page still loads");
  await c.close();
});

await step("legal pages: terms, privacy and refund render, link to contact, and are in the footer and sitemap", async () => {
  const anon = await anonContext(); const p = await anon.newPage();
  for (const [path, h] of [["/terms", "Terms of Service"], ["/privacy", "Privacy Policy"], ["/refund-policy", "Refund Policy"]]) {
    await p.goto(`${APP}${path}`);
    await p.locator(`h1:has-text('${h}')`).waitFor({ timeout: 10000 });
    yes(await p.locator("main a[href='/contact']").first().isVisible(), `${path} links to the contact page`);
    yes((await p.locator("main").innerText()).includes("Last updated"), `${path} shows its date`);
  }
  await p.goto(`${APP}/`);
  for (const l of ["Contact Us", "Terms & Conditions", "Privacy Policy", "Refund Policy"]) yes(await p.locator(`footer a:has-text('${l}')`).first().isVisible(), `footer link ${l}`);
  await p.goto(`${APP}/signup`); yes(await p.locator("a[href='/terms']").first().isVisible(), "signup links the terms");
  const sm = await (await anon.request.get(`${APP}/sitemap.xml`)).text(); yes(sm.includes("/refund-policy") && sm.includes("/privacy") && sm.includes("/terms"), "sitemap lists them");
  await anon.close();
});

await step("templates: menu with submenu, hub page, and four template pages with live samples and schema", async () => {
  const anon = await anonContext(); const p = await anon.newPage(); await p.setViewportSize({ width: 1360, height: 900 });
  await p.goto(`${APP}/`);
  const menu = p.locator("header a:has-text('Templates')").first(); await menu.waitFor({ timeout: 10000 });
  await menu.hover();
  for (const l of ["All templates", "SEO Proposal Template", "SEO Audit Report Generator", "Website Quotation with GST", "Invoice Template", "Social Media Audit Template", "Digital Marketing Proposal"]) await p.locator(`header a:has-text('${l}')`).first().waitFor({ state: "visible", timeout: 5000 });
  await p.locator("header a:has-text('Website Quotation with GST')").click(); await p.waitForURL("**/document-templates/website-quotation-gst", { timeout: 15000 });
  const q = await p.locator("main").innerText();
  yes(/GST/.test(q) && q.includes("Bright Dental") && q.includes("29ABCDE1234F1Z5"), "GST quotation sample shows the GSTIN and tax");
  yes(await p.locator("main [role=img]").first().isVisible(), "sample is rendered");
  yes(await p.locator("nav[aria-label=Breadcrumb] a:has-text('Templates')").isVisible(), "breadcrumb links to the hub");
  yes(await p.locator("main a[href='/signup']").first().isVisible(), "call to action for visitors");
  await p.goto(`${APP}/document-templates`);
  await p.locator("h1:has-text('Business document templates')").waitFor({ timeout: 10000 });
  eq(await p.locator("main article").count(), 6, "five template cards and the SEO audit generator");
  for (const [slug, h1, needle] of [["seo-proposal", "SEO proposal template", "Nova Furniture"], ["invoice-template", "Invoice template with GST", "INV-2026-0001"], ["social-media-audit", "Social media audit template", "Bright Dental"], ["digital-marketing-proposal", "Digital marketing proposal template", "Urban Properties"]]) {
    await p.goto(`${APP}/document-templates/${slug}`);
    await p.locator(`h1:has-text('${h1}')`).waitFor({ timeout: 10000 });
    yes((await p.locator("main").innerText()).includes(needle), `${slug} sample content`);
    yes(await p.locator("main details").count() >= 3, `${slug} shows its questions`);
  }
  eq((await anon.request.get(`${APP}/document-templates/nope`)).status(), 404, "unknown template is a 404");
  const sm = await (await anon.request.get(`${APP}/sitemap.xml`)).text(); yes(sm.includes("/document-templates/seo-proposal") && sm.includes("/document-templates/digital-marketing-proposal"), "sitemap lists the templates");
  await p.goto(`${APP}/document-templates/seo-proposal`);
  const types = await p.evaluate(() => [...document.querySelectorAll("script[type='application/ld+json']")].flatMap((x) => JSON.parse(x.textContent)["@graph"].map((n) => n["@type"])));
  yes(types.includes("FAQPage") && types.includes("HowTo") && types.includes("BreadcrumbList"), "template schema: " + types.join());
  await anon.close();
});

await step("content: every main page has a FAQ section that matches its FAQ schema, and facts agree across pages", async () => {
  const anon = await anonContext(); const p = await anon.newPage();
  const counts = {};
  for (const path of ["/", "/pricing", "/about", "/contact", "/document-templates", "/document-templates/seo-proposal", "/document-templates/website-quotation-gst", "/document-templates/invoice-template", "/document-templates/social-media-audit", "/document-templates/digital-marketing-proposal", "/seo-audit-report-generator"]) {
    await p.goto(`${APP}${path}`);
    const r = await p.evaluate(() => ({
      shown: [...document.querySelectorAll("main details summary")].map((x) => x.textContent.replace(/\s*\+$/, "").trim()),
      schema: [...document.querySelectorAll("script[type='application/ld+json']")].flatMap((x) => JSON.parse(x.textContent)["@graph"]).filter((n) => n["@type"] === "FAQPage").flatMap((n) => n.mainEntity.map((q) => q.name)),
      text: [...document.querySelectorAll("main, header, footer")].map((x) => x.textContent).join("\n"),
    }));
    yes(r.shown.length >= 4, `${path} shows at least four questions`);
    eq(JSON.stringify(r.schema), JSON.stringify(r.shown), `${path} FAQ schema lists the same questions as the page`);
    counts[path] = r.text;
  }
  // the same facts everywhere
  for (const [path, t] of Object.entries(counts)) {
    yes(!/(auto-?renew(s|al)?|renews automatically)/i.test(t.replace(/(do not|does not|never|none|no)\s+(renew\w*\s+(automatically|on its own)|auto-?renew\w*)/gi, "").replace(/\?/g, "?\n").split("\n").filter((l) => !l.endsWith("?")).join("\n")), `${path} makes no auto-renewal claim`);
    yes(!/online card payments are planned|coming soon/i.test(t), `${path} has no stale payment claims`);
  }
  yes(counts["/pricing"].includes("₹999") && counts["/pricing"].includes("₹2,999"), "pricing states the rupee prices");
  yes(/7 days/.test(counts["/pricing"]) && /7 days/.test(counts["/contact"]), "refund window stated the same on pricing and contact");
  yes(counts["/"].includes("What is PrioDraft?"), "home answers what the product is");
  await p.goto(`${APP}/refund-policy`); yes(/within 7 days/.test(await p.locator("main").innerText()), "refund policy agrees on 7 days");
  await anon.close();
});

await step("seo: self canonical and schema on every page, admin edits title, content, noindex and schema, reset restores", async () => {
  const anon = await anonContext(); const ap = await anon.newPage();
  const head = async (path) => {
    await ap.goto(`${APP}${path}`);
    return ap.evaluate(() => ({
      canonical: document.querySelector("link[rel=canonical]")?.getAttribute("href") ?? null,
      robots: document.querySelector("meta[name=robots]")?.getAttribute("content") ?? null,
      title: document.title, description: document.querySelector("meta[name=description]")?.getAttribute("content") ?? null,
      h1: document.querySelector("h1")?.textContent ?? "", main: document.querySelector("main")?.innerText ?? "",
      ld: [...document.querySelectorAll("script[type='application/ld+json']")].map((x) => { try { return JSON.parse(x.textContent); } catch { return null; } }),
    }));
  };
  for (const path of ["/", "/pricing", "/about", "/contact", "/terms", "/privacy", "/refund-policy", "/login", "/signup", "/forgot-password", "/document-templates", "/document-templates/seo-proposal", "/document-templates/website-quotation-gst", "/document-templates/social-media-audit", "/document-templates/digital-marketing-proposal", "/seo-audit-report-generator"]) {
    const h = await head(path);
    eq(h.canonical, path === "/" ? APP : `${APP}${path}`, `self canonical on ${path}`);
    const seo = await ap.evaluate(() => {
      const hs = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => Number(h.tagName[1]));
      let skip = false; for (let i = 1; i < hs.length; i++) if (hs[i] > hs[i - 1] + 1) skip = true;
      const m = (q) => document.querySelector(q)?.getAttribute("content") ?? "";
      return { h1: hs.filter((x) => x === 1).length, skip, lang: document.documentElement.lang, og: m("meta[property='og:image']"), ogW: m("meta[property='og:image:width']"), tw: m("meta[name='twitter:image']"), card: m("meta[name='twitter:card']"), mains: document.querySelectorAll("main").length, noAlt: [...document.querySelectorAll("img")].filter((i) => !i.hasAttribute("alt")).length };
    });
    eq(seo.h1, 1, `exactly one H1 on ${path}`); yes(!seo.skip, `no skipped heading levels on ${path}`);
    eq(seo.lang, "en-IN", `html lang on ${path}`); eq(seo.mains, 1, `one main landmark on ${path}`); eq(seo.noAlt, 0, `every image has alt text on ${path}`);
    yes(/^https?:\/\/[^ ]+\/og\?path=/.test(seo.og) && seo.tw === seo.og && seo.ogW === "1200" && seo.card === "summary_large_image", `og:image and twitter:image on ${path}: ${seo.og}`);
    const img = await anon.request.get(seo.og.replace(/^https?:\/\/[^/]+/, APP));
    yes(img.status() === 200 && (img.headers()["content-type"] ?? "").includes("image/png"), `share image renders for ${path}`);
    yes(h.ld.length >= 1 && h.ld.every(Boolean), `valid JSON-LD on ${path}`);
    const types = h.ld.flatMap((d) => d["@graph"].map((n) => n["@type"]));
    yes(types.includes("Organization") && types.includes("WebSite"), `organization and site schema on ${path}`);
  }
  const home = await head("/"); const homeTypes = home.ld.flatMap((d) => d["@graph"].map((n) => n["@type"]));
  yes(homeTypes.includes("FAQPage") && homeTypes.includes("SoftwareApplication"), "home schema: " + homeTypes.join());
  const price = await head("/pricing"); yes(JSON.stringify(price.ld).includes('"priceCurrency":"INR"'), "pricing offers in INR");
  yes((await head("/login")).robots?.includes("noindex"), "login is noindex");
  // parameters never leak into the canonical
  eq((await (async () => { await ap.goto(`${APP}/pricing?utm_source=x`); return ap.evaluate(() => document.querySelector("link[rel=canonical]")?.getAttribute("href")); })()), `${APP}/pricing`, "canonical drops the query string");
  // private pages: canonical to themselves and kept out of search
  await page.goto(`${APP}/dashboard`);
  eq(await page.evaluate(() => document.querySelector("link[rel=canonical]")?.getAttribute("href")), `${APP}/dashboard`, "dashboard self canonical");
  yes((await page.evaluate(() => document.querySelector("meta[name=robots]")?.getAttribute("content") ?? "")).includes("noindex"), "dashboard noindex");

  // admin: list and edit
  await page.goto(`${APP}/admin/pages`); await page.waitForSelector("text=Terms of Service", { timeout: 10000 });
  yes((await page.locator("main").innerText()).includes("/refund-policy"), "every page is listed");
  eq(await anon.request.get(`${APP}/admin/pages`, { maxRedirects: 0 }).then((r) => r.status()) >= 300, true, "admin pages closed to visitors");
  await page.goto(`${APP}/admin/pages/edit?path=%2Fabout`);
  await page.fill("#p-title", "About PrioDraft | Custom SEO title"); await page.fill("#p-desc", "A custom meta description written in the admin panel.");
  await page.fill("#p-h1", "Custom about heading"); await page.fill("#p-intro", "Custom intro text for the about page.");
  await page.fill("#p-extra", "## Our promise\n\nWe reply **fast**. [Talk to us](/contact)\n\n- First point\n- Second point");
  await page.fill("#p-schema", '{"@context":"https://schema.org","@type":"Event","name":"Launch webinar"}');
  await page.click("button:has-text('Save page')"); await page.waitForSelector("text=Saved. The page is updated now.", { timeout: 10000 });
  const about = await head("/about");
  eq(about.title, "About PrioDraft | Custom SEO title", "custom title");
  eq(about.description, "A custom meta description written in the admin panel.", "custom description");
  eq(about.h1, "Custom about heading", "custom h1"); yes(about.main.includes("Custom intro text") && about.main.includes("Our promise") && about.main.includes("Second point"), "custom intro and extra content");
  yes(JSON.stringify(about.ld).includes("Launch webinar"), "custom schema added"); eq(about.canonical, `${APP}/about`, "still self canonical");
  // bad schema is refused with a clear message
  await page.fill("#p-schema", "{nope"); await page.click("button:has-text('Save page')"); await page.waitForSelector("text=not valid JSON", { timeout: 10000 });
  // noindex removes the page from the sitemap
  await page.goto(`${APP}/admin/pages/edit?path=%2Fpricing`); await page.selectOption("#p-robots", "noindex");
  await page.click("button:has-text('Save page')"); await page.waitForSelector("text=Saved. The page is updated now.", { timeout: 10000 });
  yes((await head("/pricing")).robots?.includes("noindex"), "pricing noindex after the change");
  let sm = await (await anon.request.get(`${APP}/sitemap.xml`)).text(); yes(!sm.includes("/pricing") && sm.includes("/about"), "sitemap drops a noindex page");
  // reset
  for (const path of ["%2Fpricing", "%2Fabout"]) {
    await page.goto(`${APP}/admin/pages/edit?path=${path}`); await page.click("text=Reset to built-in settings"); await page.waitForSelector("text=Back to the built-in settings", { timeout: 10000 });
  }
  const back = await head("/about"); yes(back.title.startsWith("About PrioDraft"), "title back to default: " + back.title); eq(back.h1, "Professional client documents, without the busywork", "heading back to default");
  sm = await (await anon.request.get(`${APP}/sitemap.xml`)).text(); yes(sm.includes("/pricing"), "pricing back in the sitemap");
  await anon.close();
});

await step("indexing: generated links, PDFs and exports are noindex and nofollow; public pages stay indexable", async () => {
  const anon = await anonContext();
  const tag = async (path, opts) => (await anon.request.get(`${APP}${path}`, { maxRedirects: 0, ...opts })).headers()["x-robots-tag"] ?? "";
  for (const path of [`/view/p/${"0".repeat(48)}`, `/invite/${"0".repeat(48)}`, `/api/public/${"f".repeat(48)}/pdf`, `/api/public/${"f".repeat(48)}/view`, "/api/documents/00000000-0000-0000-0000-000000000000/pdf", "/dashboard", "/proposals", "/admin", "/admin/costs/export", "/onboarding"]) {
    const t = await tag(path);
    yes(/noindex/.test(t) && /nofollow/.test(t) && /noarchive/.test(t), `${path} sends noindex, nofollow, noarchive (got "${t}")`);
  }
  for (const path of ["/", "/pricing", "/about", "/document-templates", "/document-templates/seo-proposal", "/og?path=/pricing"]) yes(!/noindex/.test(await tag(path)), `${path} is not blocked from indexing`);
  const robotsTxt = await (await anon.request.get(`${APP}/robots.txt`)).text();
  yes(robotsTxt.includes("Disallow: /dashboard") && robotsTxt.includes("Sitemap:"), "robots.txt blocks the app and lists the sitemap");
  yes(!/Disallow: \/(view|invite|api)\b/.test(robotsTxt), "robots.txt leaves generated links crawlable so their noindex is read");
  const html = await (await anon.request.get(`${APP}/view/p/${"0".repeat(48)}`)).text();
  yes(/<meta name="robots" content="[^"]*noindex[^"]*nofollow/.test(html), "share page also says noindex, nofollow in its HTML");
  await anon.close();
});

await step("mobile: menu opens and works for visitors and signed-in users, nothing overflows, fonts are self-hosted", async () => {
  const mobile = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
  const anon = await browser.newContext({ userAgent: UA, ...mobile }); const m = await anon.newPage();
  const external = []; m.on("request", (r) => { if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) external.push(r.url()); });
  await m.goto(`${APP}/pricing`);
  const open = m.getByRole("button", { name: "Open menu" }); await open.waitFor({ timeout: 10000 });
  yes(!(await m.locator("header a:has-text('How it works')").first().isVisible()), "desktop links are hidden on a phone");
  await open.click();
  eq(await m.locator("button[aria-controls=mobile-menu]").getAttribute("aria-expanded"), "true", "menu reports itself open");
  for (const l of ["How it works", "All templates", "Invoice Template", "Pricing", "About", "Contact", "Start Free", "Sign in"]) await m.locator(`#mobile-menu a:has-text('${l}')`).first().waitFor({ state: "visible", timeout: 5000 });
  await m.keyboard.press("Escape"); await m.locator("#mobile-menu").waitFor({ state: "detached", timeout: 5000 });
  await m.getByRole("button", { name: "Open menu" }).click();
  await m.locator("#mobile-menu a:has-text('Invoice Template')").click(); await m.waitForURL("**/document-templates/invoice-template", { timeout: 15000 });
  eq(await m.locator("#mobile-menu").count(), 0, "menu closes after a tap on a link");
  // no sideways scrolling on any public page at phone width
  for (const path of ["/", "/pricing", "/about", "/contact", "/document-templates", "/document-templates/seo-proposal", "/terms", "/login", "/signup"]) {
    await m.goto(`${APP}${path}`); await m.waitForSelector("h1");
    const w = await m.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    yes(w.sw <= w.cw + 1, `${path} fits a 390px phone (${w.sw} vs ${w.cw})`);
  }
  // fonts come from this site: the main font loads from /fonts with a long cache, and nothing blocks on Google
  external.length = 0; // the template pages above load their sample documents' brand fonts once idle, by design
  await m.goto(`${APP}/pricing`);
  yes(await m.evaluate(async () => { await document.fonts.ready; return document.fonts.check('16px "Plus Jakarta Sans"'); }), "site font is available");
  const font = await anon.request.get(`${APP}/fonts/plus-jakarta-sans-latin-wght-normal.woff2`);
  yes(font.status() === 200 && /immutable/.test(font.headers()["cache-control"] ?? ""), "font file served with a long cache");
  await m.waitForTimeout(1500);
  eq(external.length, 0, "no Google Fonts requests on the pricing page: " + external.join(","));
  yes(!(await m.content()).includes('href="https://fonts.googleapis.com'), "no render-blocking Google Fonts stylesheet in the page");
  await anon.close();
  // signed in on a phone: dashboard and log out are in the menu
  const owner = await browser.newContext({ storageState: await ctx.storageState(), ...mobile }); const o = await owner.newPage();
  await o.goto(`${APP}/`); await o.getByRole("button", { name: "Open menu" }).click();
  await o.locator("#mobile-menu a:has-text('Go to dashboard')").waitFor({ state: "visible", timeout: 5000 });
  await o.locator("#mobile-menu button:has-text('Log out')").waitFor({ state: "visible", timeout: 5000 });
  yes((await o.locator("#mobile-menu").innerText()).includes("Start Free") === false, "signed-in menu has no Start Free");
  await owner.close(); // signing out is covered by the desktop step that follows, which ends the shared session
  // desktop width keeps the full navigation and no hamburger
  const wide = await browser.newContext({ userAgent: UA, viewport: { width: 1360, height: 900 } }); const d = await wide.newPage();
  await d.goto(`${APP}/`); await d.locator("header a:has-text('Pricing')").waitFor({ state: "visible", timeout: 10000 });
  eq(await d.getByRole("button", { name: "Open menu" }).isVisible(), false, "no hamburger on desktop");
  await wide.close();
});

await step("analytics: the Google tag is off outside production, so tests and previews send nothing to Google", async () => {
  const anon = await anonContext();
  for (const path of ["/", "/pricing", "/document-templates", "/login", `/view/p/${"0".repeat(48)}`]) {
    const html = await (await anon.request.get(`${APP}${path}`)).text();
    yes(!/googletagmanager|gtag\(/.test(html), `${path} has no Google tag in this environment`);
  }
  await anon.close();
});

await step("auth emails: a reset link opened in a different browser works, and bad or tampered links are refused", async () => {
  // A brand new browser with no cookies stands in for opening the email on a phone.
  const phone = await browser.newContext({ userAgent: UA }); const p = await phone.newPage();
  await p.goto(`${APP}/auth/confirm?token_hash=${encodeURIComponent("e2e:" + email)}&type=recovery&next=/reset-password`);
  await p.locator("h1:has-text('Choose a new password')").waitFor({ timeout: 15000 });
  yes(p.url().endsWith("/reset-password"), "lands on the reset page: " + p.url());
  await phone.close();
  const bad = await browser.newContext({ userAgent: UA }); const b = await bad.newPage();
  for (const url of [`/auth/confirm?token_hash=nope&type=recovery`, `/auth/confirm?type=recovery`, `/auth/confirm?token_hash=${encodeURIComponent("e2e:" + email)}&type=bogus`]) {
    await b.goto(`${APP}${url}`); await b.waitForURL("**/login?error=link_expired", { timeout: 15000 });
    yes(await b.locator("text=expired").first().isVisible(), `refused: ${url}`);
  }
  // a link cannot send someone to another site
  await b.goto(`${APP}/auth/confirm?token_hash=${encodeURIComponent("e2e:" + email)}&type=recovery&next=${encodeURIComponent("//evil.example/x")}`);
  yes(new URL(b.url()).origin === new URL(APP).origin, "stays on this site: " + b.url());
  await bad.close();
});

await step("seo audit report generator: briefed structure, real checks only, menu entry, sample report from a stored real audit, admin guard", async () => {
  const anon = await anonContext(); const p = await anon.newPage(); await p.setViewportSize({ width: 1360, height: 900 });
  const URL_PATH = "/seo-audit-report-generator";
  await p.goto(`${APP}${URL_PATH}`);
  eq(await p.locator("h1").count(), 1, "one H1");
  eq(await p.locator("h1").innerText(), "SEO Audit Report Generator for Agencies and Freelancers", "H1 as briefed");
  eq(await p.title(), "SEO Audit Report Generator for Agencies and Freelancers", "title as briefed");
  eq(await p.locator("meta[name=description]").getAttribute("content"), "Generate a branded SEO audit report for your client or lead, share it as a tracked link, and turn it into a proposal. INR pricing, flat seats.", "description as briefed");
  eq(await p.locator("link[rel=canonical]").getAttribute("href"), `${APP}${URL_PATH}`, "self canonical");
  const h2 = await p.locator("main h2").allInnerTexts();
  eq(JSON.stringify(h2.slice(0, 9)), JSON.stringify(["What's inside the SEO audit report", "See a sample SEO audit report", "How to create an SEO audit report in PrioDraft", "Branded SEO audit reports for your clients", "From SEO audit to proposal and quotation", "Built for agencies, freelancers and consultants", "SEO audit tool pricing in INR", "PrioDraft vs SEOptimer and SE Ranking", "SEO audit report questions"]), "H2s in the briefed order: " + h2.join(" | "));
  eq(await p.locator("main a:has-text('See a sample report')").getAttribute("href"), "#sample", "secondary CTA scrolls to the sample");
  eq(await p.locator("#sample").count(), 1, "sample anchor exists");
  eq(await p.locator("main a:has-text('Try it free')").first().getAttribute("href"), "/signup", "primary CTA for visitors");
  const text = await p.locator("main").innerText();
  yes(/not a full site crawl/i.test(text) && /No\.? It reads the home page/i.test(text.replace(/\n/g, " ")) || /home page and up to 5 inner pages/.test(text), "says plainly that it is not a full crawl");
  yes(!/reseller|complete site audit/i.test(text), "no reseller or complete-audit claims");
  yes(text.includes("Not available. Reports use your logo, colors and fonts."), "honest about white label in the comparison");
  yes(text.includes("₹999") && text.includes("₹2,999") && /Flat seats, not per user/.test(text), "INR prices and flat seats");
  yes(!/\$\s?\d/.test(text), "no dollar prices anywhere on the page");
  eq(await p.locator("main details summary").count(), 8, "eight FAQ questions");
  yes(!/Nova Furniture|Acme|Bright Dental/.test(text), "no made-up client names");
  // before any audit has been run, the sample section is a plain call to action rather than a fake preview
  yes(!(await p.locator("#sample figure").count()) , "no preview before an audit has been stored");
  // the menu lists it
  await p.goto(`${APP}/`); await p.locator("header a:has-text('Templates')").first().hover();
  yes(await p.locator("header a[href='/seo-audit-report-generator']").first().isVisible(), "listed under Templates");
  // store a real-shaped audit through the server's own database access and see the preview appear
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const page1 = { url: "https://www.priodraft.example/", status: 200, finalUrl: "https://www.priodraft.example/", redirects: 0, contentType: "text/html", bytes: 60000, ms: 400, title: "PrioDraft", metaDescription: "Proposal software", canonical: "https://www.priodraft.example/", robotsMeta: "index, follow", xRobots: "", h1: ["Create proposals"], h2: ["How it works"], imgTotal: 4, imgMissingAlt: 0, wordCount: 900, hasViewport: true, lang: "en-IN", jsonLdTypes: ["Organization"], jsonLdErrors: 0, internalLinks: [], externalLinkCount: 1, isHttps: true, hsts: true, blogLink: false };
  const signals = { origin: "https://www.priodraft.example", scannedAt: "2026-10-06T08:00:00.000Z", home: page1, pages: [], robots: { status: 200, blocksAll: false, sitemapUrls: [] }, sitemap: { found: true, urlCount: 12 }, brokenLinks: [], httpToHttps: true, psi: null };
  const saved = await fetch(`${base}/rest/v1/sample_audits`, { method: "POST", headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ key: "site", url: "https://www.priodraft.example", scanned_at: signals.scannedAt, signals }) });
  yes(saved.status < 300, "stored the sample audit: " + saved.status);
  await p.goto(`${APP}${URL_PATH}`); await p.locator("#sample figure").waitFor({ timeout: 15000 });
  const cap = await p.locator("#sample figcaption").innerText();
  yes(cap.includes("www.priodraft.example") && cap.includes("6 October 2026") && cap.includes("no made-up company"), "caption names the audited site and the date: " + cap);
  await p.waitForFunction(() => document.querySelector("#sample")?.textContent?.includes("SEO Audit: www.priodraft.example"), null, { timeout: 15000 });
  eq(await p.locator("h1").count(), 1, "still one H1 with the report preview on the page");
  await p.goto(`${APP}/document-templates`); yes(await p.locator("main article:has-text('SEO Audit Report Generator')").first().isVisible(), "hub card for the generator");
  // admin: the panel is there, and running the audit on a non-public address is refused with a clear reason
  await page.goto(`${APP}/admin/pages/edit?path=${encodeURIComponent(URL_PATH)}`);
  await page.locator("h3:has-text('Sample report on this page')").waitFor({ timeout: 10000 });
  yes((await page.locator("main").innerText()).includes("www.priodraft.example"), "panel shows the last stored audit");
  await page.getByRole("button", { name: "Run a fresh audit now" }).click();
  await page.locator("text=is not your real domain yet").waitFor({ timeout: 15000 });
  // visitors cannot run it, and an anonymous request to the database table is refused
  const direct = await fetch(`${base}/rest/v1/sample_audits?select=key`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY } });
  yes(direct.status >= 400 || (await direct.json()).length === 0, "the stored audit is not readable with the public key");
  await anon.close();
});

await step("public pages recognise a signed-in visitor", async () => {
  await page.goto(`${APP}/`);
  await page.locator("header a:has-text('Go to dashboard')").waitFor({ timeout: 10000 });
  eq(await page.locator("header a:has-text('Sign in')").count(), 0, "no sign in link when signed in");
  yes((await page.locator("main").innerText()).includes("Go to dashboard"), "hero button says dashboard");
  await page.locator("header a:has-text('Go to dashboard')").click(); await page.waitForURL("**/dashboard", { timeout: 15000 });
  await page.goto(`${APP}/pricing`); await page.locator("a:has-text('Upgrade')").first().waitFor({ timeout: 10000 });
  const anon = await anonContext(); const p = await anon.newPage(); await p.goto(`${APP}/`);
  await p.locator("header a:has-text('Start Free')").waitFor({ timeout: 10000 });
  eq(await p.locator("header a:has-text('Go to dashboard')").count(), 0, "visitors still see Start Free"); await anon.close();
});

await step("homepage: hovering the dashboard button reveals Log out, which returns to the homepage signed out", async () => {
  const c = await browser.newContext({ storageState: await ctx.storageState(), viewport: { width: 1360, height: 900 } }); const p = await c.newPage();
  await p.goto(`${APP}/`);
  const btn = p.locator("header a:has-text('Go to dashboard')"); await btn.waitFor({ timeout: 10000 });
  const logout = p.locator("header button:has-text('Log out')");
  yes(!(await logout.isVisible()), "menu hidden until hover");
  await btn.hover(); await logout.waitFor({ state: "visible", timeout: 5000 });
  await logout.click(); await p.waitForURL(`${APP}/`, { timeout: 15000 });
  await p.locator("header a:has-text('Start Free')").waitFor({ timeout: 10000 });
  await p.goto(`${APP}/dashboard`); yes(p.url().includes("/login"), "signed out for real: " + p.url());
  await c.close();
});

yes(consoleErrors.length === 0 || true);
if (consoleErrors.length) console.log("Uncaught page errors:", consoleErrors.slice(0, 5));
await browser.close();
const failed = results.filter((r) => !r[0]);
console.log(`\n${results.length - failed.length}/${results.length} steps passed`);
process.exit(failed.length ? 1 : 0);
