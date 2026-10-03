import Image from "next/image";
import { cn } from "@/lib/utils";

/** Product name. Change it here and everywhere that shows it follows. */
export const PRODUCT_NAME = "PrioDraft";

/** The PrioDraft logo (public/logo.png). Pass a height class such as "h-8" to size it. */
export function Wordmark({ className }: { className?: string }) {
  return <Image src="/logo.png" alt={PRODUCT_NAME} width={431} height={107} priority className={cn("h-9 w-auto", className)} />;
}
