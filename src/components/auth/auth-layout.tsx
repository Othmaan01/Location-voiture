import Link from "next/link";

import { Logo } from "@/components/brand/logo";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="container-page flex min-h-[calc(100dvh-4rem)] items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <Logo />
          </Link>
          <h1 className="mt-6 text-2xl font-semibold text-ink-900">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-soft sm:p-8">
          {children}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
      </div>
    </div>
  );
}
