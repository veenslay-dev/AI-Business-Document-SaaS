"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { assistAction } from "@/lib/actions/ai";
import { ASSIST_COMMANDS, type AssistCommand } from "@/lib/ai/schemas";

const REWRITE: AssistCommand[] = ["improve", "professional", "shorter", "persuasive", "simplify", "detail", "us_clients", "indian_clients"];
const GENERATE: AssistCommand[] = ["executive_summary", "deliverables", "timeline", "faq"];

/**
 * Dropdown of AI commands. `onResult` receives the plain text the model returned;
 * the caller decides how to apply it (replace a block, add a block) and offers undo.
 */
export function AiMenu({ text, documentTitle, onResult, mode = "rewrite", label = "AI" }: {
  text: string; documentTitle: string; onResult: (command: AssistCommand, result: string) => void; mode?: "rewrite" | "generate" | "all"; label?: string;
}) {
  const [busy, start] = useTransition();
  const [pending, setPending] = useState<string | null>(null);

  function run(command: AssistCommand) {
    setPending(command);
    start(async () => {
      try {
        const res = await assistAction({ command, text, documentTitle });
        if (res.ok && res.data) onResult(command, res.data.content);
        else if (!res.ok) toast.error(res.error);
      } catch { toast.error("We couldn't reach the server. Check your connection and try again."); }
      setPending(null);
    });
  }

  const showRewrite = mode !== "generate";
  const showGenerate = mode !== "rewrite";
  return (
    <Dropdown>
      <DropdownTrigger disabled={busy} className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium text-brand hover:bg-brand/10 disabled:opacity-60">
        {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Sparkles className="size-3.5" aria-hidden />}{busy ? "Working" : label}
      </DropdownTrigger>
      <DropdownContent align="end" className="min-w-60">
        {showRewrite && (<><DropdownLabel>Rewrite</DropdownLabel>{REWRITE.map((c) => (
          <DropdownItem key={c} disabled={!text.trim()} onSelect={() => run(c)}>{ASSIST_COMMANDS[c]}{pending === c && <Loader2 className="ml-auto size-3.5 animate-spin" />}</DropdownItem>))}</>)}
        {showRewrite && showGenerate && <DropdownSeparator />}
        {showGenerate && (<><DropdownLabel>Generate</DropdownLabel>{GENERATE.map((c) => (
          <DropdownItem key={c} onSelect={() => run(c)}>{ASSIST_COMMANDS[c]}{pending === c && <Loader2 className="ml-auto size-3.5 animate-spin" />}</DropdownItem>))}</>)}
      </DropdownContent>
    </Dropdown>
  );
}
