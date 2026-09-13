import Image from "next/image";

import { cn } from "@/lib/utils";

import { publicEnv } from "@/lib/env";

/** Marque Karson : le K du logo (damier rouge), lisible en petit ; le logo complet vit dans /brand. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/karson-mark.png"
      alt={publicEnv.siteName}
      width={64}
      height={64}
      priority
      className={cn("size-8 rounded-[9px]", className)}
    />
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-lg font-extrabold tracking-tight text-ink-900">
        {publicEnv.siteName}
      </span>
    </span>
  );
}
