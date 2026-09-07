import { Car, Heart, Home, MessageCircle, ShieldCheck, User } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Maquette de telephone en pur HTML : l'accueil de l'application (feed des loueurs, capsule
 * de navigation). Legere, nette a toutes les tailles, sans capture d'ecran a maintenir.
 */
export function PhoneMockup({ className }: { className?: string }) {
  const loueurs = [
    {
      name: "Prestige Motors Paris",
      city: "Paris 8e · 2,1 km",
      price: "dès 390 €/j",
      count: 9,
      rating: "4,9",
      cars: ["Audi RS3", "Lamborghini Urus", "Mercedes G63"],
      tone: ["#3a1016", "#2a1216", "#1e1e24"],
    },
    {
      name: "Citadines Lyon Part-Dieu",
      city: "Lyon 3e · 1,4 km",
      price: "dès 39 €/j",
      count: 24,
      rating: "4,8",
      cars: ["Renault Clio V", "Mercedes Classe A", "Renault Captur"],
      tone: ["#1e1e24", "#26262d", "#1a1a20"],
    },
    {
      name: "Atlantique Loc Bordeaux",
      city: "Bordeaux · 3,6 km",
      price: "dès 59 €/j",
      count: 15,
      rating: "4,7",
      cars: ["Peugeot 3008", "Tesla Model 3", "Volkswagen Tiguan"],
      tone: ["#222228", "#2a1216", "#1e1e24"],
    },
  ];
  return (
    <div className={cn("relative mx-auto w-[280px]", className)}>
      <div className="absolute -inset-10 -z-10 rounded-[64px] bg-brand/25 blur-3xl" />
      <div className="rounded-[44px] border border-ink-300 bg-ink-50 p-2 shadow-lift">
        <div className="relative overflow-hidden rounded-[36px] bg-[#0e0e11]">
          <div className="absolute left-1/2 top-2 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
          <div className="px-4 pb-24 pt-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-tint">
              France
            </p>
            <p className="text-xl font-extrabold text-ink-900">Loueurs</p>
            <div className="mt-3 flex gap-3 text-[11px] font-semibold">
              <span className="border-b-2 border-brand pb-1 text-ink-900">Tous</span>
              <span className="pb-1 text-ink-500">Près de moi</span>
              <span className="pb-1 text-ink-500">Premium</span>
              <span className="pb-1 text-ink-500">Nouveaux</span>
            </div>
            <div className="mt-3 space-y-2.5">
              {loueurs.map((l) => (
                <div key={l.name} className="rounded-2xl border border-ink-200 bg-[#16161a] p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-[#1e1e24] text-[10px] font-bold text-ink-900">
                      {l.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-[12px] font-bold text-ink-900">{l.name}</p>
                        <ShieldCheck className="size-3 text-brand-tint" />
                      </div>
                      <p className="text-[10px] text-ink-500">{l.city}</p>
                    </div>
                    <span className="text-[11px] font-bold text-ink-900">★ {l.rating}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {l.cars.map((car, k) => (
                      <div
                        key={car}
                        className="flex h-12 items-end rounded-lg px-1.5 pb-1"
                        style={{
                          background: `linear-gradient(135deg, ${l.tone[k]}, #16161a)`,
                        }}
                      >
                        <span className="truncate text-[8px] font-semibold text-ink-700">
                          {car}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    <span className="text-ink-500">
                      {l.count} véhicules ·{" "}
                      <span className="font-bold text-ink-900">{l.price}</span>
                    </span>
                    <span className="font-bold text-brand-tint">Voir ›</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute inset-x-5 bottom-4 flex h-14 items-center justify-between rounded-full border border-white/10 bg-white/5 px-3 backdrop-blur-md">
            {[Home, MessageCircle, Car, Heart, User].map((Icon, i) => (
              <span
                key={i}
                className={cn(
                  "flex size-10 items-center justify-center rounded-full",
                  i === 0 ? "bg-brand text-white" : "text-ink-500",
                )}
              >
                <Icon className="size-4" />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
