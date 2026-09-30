import { readableOn } from "@/lib/documents/branding";
import type { TemplateConfig } from "@/lib/documents/templates";

/** A small CSS drawing of a template's cover and section style, coloured with the workspace's brand kit. */
export function TemplateThumb({ config, primary, secondary, accent }: { config: TemplateConfig; primary: string; secondary: string; accent: string }) {
  const bar = (w: string, c = "#d9dce2") => <span className="block h-1 rounded-full" style={{ width: w, background: c }} />;
  return (
    <div className="flex h-36 gap-1.5 overflow-hidden rounded-md bg-[#eceae4] p-2" aria-hidden>
      <div className="relative w-1/2 overflow-hidden rounded-sm bg-white shadow-soft">
        {config.cover === "band" && <div className="h-full p-2" style={{ background: primary, color: readableOn(primary) }}><span className="mb-6 block h-1 w-6 rounded bg-current opacity-70" /><span className="block h-2 w-14 rounded bg-current" /><span className="mt-1.5 block h-0.5 w-6" style={{ background: accent }} /></div>}
        {config.cover === "split" && <div className="h-full border-l-[10px] p-2 pl-3" style={{ borderColor: primary }}><span className="mt-10 block h-2 w-12 rounded" style={{ background: primary }} /><span className="mt-1.5 block h-0.5 w-6" style={{ background: accent }} /></div>}
        {config.cover === "minimal" && <div className="p-2"><span className="mt-10 block h-2 w-12 rounded" style={{ background: primary }} /><span className="mt-1.5 block h-0.5 w-6" style={{ background: accent }} /></div>}
        {config.cover === "none" && <div className="p-2"><div className="flex justify-between border-b-2 pb-1" style={{ borderColor: primary }}><span className="h-2 w-6 rounded" style={{ background: primary }} /><span className="h-2 w-8 rounded bg-black/20" /></div>{bar("70%")}<span className="mt-1.5 block">{bar("55%")}</span></div>}
      </div>
      <div className="w-1/2 space-y-1.5 rounded-sm bg-white p-2 shadow-soft">
        <span className={`block h-1.5 w-12 rounded ${config.sectionStyle === "ruled" ? "border-b" : ""}`} style={{ background: config.sectionStyle === "ruled" ? "transparent" : primary, borderColor: primary }} />
        {bar("90%")}{bar("75%")}
        <div className="mt-2 overflow-hidden rounded-sm border" style={{ borderColor: config.tableStyle === "lined" ? "transparent" : "#d9dce2" }}>
          <span className="block h-1.5" style={{ background: primary }} />
          {[0, 1, 2].map((i) => <span key={i} className="block h-1.5" style={{ background: config.tableStyle === "striped" && i % 2 ? secondary : "transparent", borderBottom: config.tableStyle === "lined" ? "1px solid #d9dce2" : "none" }} />)}
        </div>
      </div>
    </div>
  );
}
