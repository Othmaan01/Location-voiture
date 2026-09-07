import { Lock, MapPinned, ShieldCheck, Wallet } from "lucide-react";

/** Rangee de preuves : pas de chiffres inventes, des engagements verifiables. */
export function TrustRow() {
  const items = [
    { Icon: ShieldCheck, label: "Loueurs vérifiés", sub: "Kbis, assurance, SIRET" },
    { Icon: Wallet, label: "0 % de commission", sub: "Le prix du loueur, rien de plus" },
    { Icon: Lock, label: "Données protégées", sub: "Hébergées en Europe, RGPD" },
    { Icon: MapPinned, label: "Partout en France", sub: "Des pros près de chez vous" },
  ];
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map(({ Icon, label, sub }) => (
        <li key={label} className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
          <Icon className="size-5 shrink-0 text-brand-tint" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink-900">{label}</p>
            <p className="truncate text-xs text-ink-500">{sub}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
