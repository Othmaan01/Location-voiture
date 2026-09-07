import Image from "next/image";
import { Car, Heart, Home, MessageCircle, ShieldCheck, User } from "lucide-react";

import { SHOWCASE } from "@/lib/showcase";
import { cn } from "@/lib/utils";

/**
 * Maquette de telephone en pur HTML : l'accueil de l'application (feed des loueurs, capsule
 * de navigation), avec de vraies photos de vehicules. Loueurs fictifs, a titre d'illustration.
 */
export function PhoneMockup({ className }: { className?: string }) {
  return (
    <div className={cn("relative mx-auto w-[290px]", className)}>
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
              {SHOWCASE.map((l) => (
                <div key={l.name} className="rounded-2xl border border-ink-200 bg-[#16161a] p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-[#1e1e24] text-[10px] font-bold text-ink-900">
                      {l.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-[12px] font-bold text-ink-900">{l.name}</p>
                        <ShieldCheck className="size-3 shrink-0 text-brand-tint" />
                      </div>
                      <p className="text-[10px] text-ink-500">{l.city}</p>
                    </div>
                    <span className="text-[11px] font-bold text-ink-900">★ {l.rating}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {l.cars.map((car) => (
                      <div
                        key={car.slug}
                        className="relative h-14 overflow-hidden rounded-lg bg-[#1e1e24]"
                      >
                        <Image
                          src={`/cars/${car.slug}.jpg`}
                          alt={car.name}
                          fill
                          sizes="90px"
                          className="object-cover"
                        />
                        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1 pt-3 text-[8px] font-semibold text-ink-900">
                          {car.name}
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
