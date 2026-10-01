import "server-only";
import { PDFDocument } from "pdf-lib";
import puppeteer, { type Browser } from "puppeteer-core";

export class PdfError extends Error {
  constructor(public code: "busy" | "failed" | "no_browser", public detail = "") { super(code); this.name = "PdfError"; }
}

export const PDF_USER_MESSAGE = "We couldn't generate the PDF right now. Try again in a moment.";

let active = 0;
const MAX_CONCURRENT = 2;

async function launch(): Promise<Browser> {
  const local = process.env.PDF_CHROMIUM_PATH;
  if (local) return puppeteer.launch({ executablePath: local, headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"] });
  try {
    // Serverless friendly Chromium build; used when no local browser path is configured.
    const { default: chromium } = await import("@sparticuz/chromium");
    return await puppeteer.launch({ executablePath: await chromium.executablePath(), headless: true, args: chromium.args });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "unknown";
    console.error("[pdf] could not start Chromium", detail);
    throw new PdfError("no_browser", detail);
  }
}

/** Renders an HTML page to an A4 PDF with running header/footer and page numbers. */
export async function htmlToPdf(html: string, opts: { header: string; footer: string; coverPage?: boolean }): Promise<Buffer> {
  if (active >= MAX_CONCURRENT) throw new PdfError("busy");
  active += 1;
  let browser: Browser | null = null;
  try {
    browser = await launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 30_000 });
    // Give web fonts a few seconds; fall back to system fonts if the font host is unreachable.
    await Promise.race([page.evaluate(() => document.fonts.ready), new Promise((r) => setTimeout(r, 6000))]);
    const body = await page.pdf({
      format: "A4", printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
      headerTemplate: opts.header, footerTemplate: opts.footer, timeout: 60_000,
    });
    if (!opts.coverPage) return Buffer.from(body);

    // The cover is full bleed, so it must not carry the running header and footer.
    // Render it on its own without them and splice it in front of the remaining pages.
    const cover = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true, pageRanges: "1", timeout: 60_000 });
    const merged = await PDFDocument.create();
    const coverDoc = await PDFDocument.load(cover);
    const bodyDoc = await PDFDocument.load(body);
    const [coverPageCopy] = await merged.copyPages(coverDoc, [0]);
    merged.addPage(coverPageCopy);
    const rest = bodyDoc.getPageIndices().slice(1);
    for (const p of await merged.copyPages(bodyDoc, rest)) merged.addPage(p);
    return Buffer.from(await merged.save());
  } catch (e) {
    if (e instanceof PdfError) throw e;
    const detail = e instanceof Error ? e.message : "unknown";
    console.error("[pdf] generation failed", detail);
    throw new PdfError("failed", detail);
  } finally {
    active -= 1;
    await browser?.close().catch(() => undefined);
  }
}

export const pdfFileName = (title: string) => `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "document"}.pdf`;
