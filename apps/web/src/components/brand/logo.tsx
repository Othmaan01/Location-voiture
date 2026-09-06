import { cn } from "@/lib/utils";

import { publicEnv } from "@/lib/env";

/** Marque provisoire (nom definitif a venir) : pastille rouge, geometrique, nette a toutes les tailles. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label={publicEnv.siteName}
      className={cn("size-8", className)}
    >
      <rect width="32" height="32" rx="9" fill="#e3243b" />
      <path
        d="M8 19.5h16M10 19.5l2.2-5.2A2 2 0 0 1 14 13h4a2 2 0 0 1 1.8 1.3L22 19.5"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="12" cy="21.5" r="1.6" fill="#fff" />
      <circle cx="20" cy="21.5" r="1.6" fill="#fff" />
    </svg>
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
