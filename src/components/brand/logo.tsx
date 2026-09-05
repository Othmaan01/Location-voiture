import { cn } from "@/lib/utils";

/**
 * Marque RentMap : un reperage cartographique dont la pointe dessine
 * une route, avec deux roues stylisees. Purement geometrique, donc net
 * a toutes les tailles et facile a decliner en favicon.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="RentMap"
      className={cn("size-8", className)}
    >
      <rect width="32" height="32" rx="9" className="fill-ink-900" />
      <path
        d="M16 6.5c-3.6 0-6.5 2.85-6.5 6.37 0 4.5 5.32 10.35 6.03 11.12a.64.64 0 0 0 .94 0c.71-.77 6.03-6.62 6.03-11.12C22.5 9.35 19.6 6.5 16 6.5Z"
        className="fill-amber-brand"
      />
      <path
        d="M12.6 13.9h6.8M13.4 11.9h5.2l.9 2h-7l.9-2Z"
        className="stroke-ink-900"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="13.6" cy="15.6" r="1.15" className="fill-ink-900" />
      <circle cx="18.4" cy="15.6" r="1.15" className="fill-ink-900" />
    </svg>
  );
}

export function Logo({
  className,
  showText = true,
  tone = "dark",
}: {
  className?: string;
  showText?: boolean;
  tone?: "dark" | "light";
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {showText ? (
        <span
          className={cn(
            "text-lg font-semibold tracking-tight",
            tone === "light" ? "text-white" : "text-ink-900",
          )}
        >
          Rent<span className="text-amber-brand-dark">Map</span>
        </span>
      ) : null}
    </span>
  );
}
