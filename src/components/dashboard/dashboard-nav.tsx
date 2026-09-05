"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CreditCard, Car, Inbox, LayoutDashboard } from "lucide-react";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/vehicules", label: "Mes vehicules", icon: Car },
  { href: "/dashboard/demandes", label: "Demandes recues", icon: Inbox },
  { href: "/dashboard/agence", label: "Mon agence", icon: Building2 },
  { href: "/dashboard/abonnement", label: "Abonnement", icon: CreditCard },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:sticky lg:top-24 lg:self-start">
      <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-ink-900 text-white"
                    : "text-ink-600 hover:bg-surface-muted hover:text-ink-900",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
