import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { SHOWCASE } from "@/lib/showcase";

/**
 * Version telephone de la maquette : un carrousel de vehicules qui defile au doigt, avec le
 * loueur et le prix, comme dans l'application. Loueurs fictifs, photos reelles.
 */
export function MobileShowcase() {
  const cards = SHOWCASE.flatMap((l) =>
    l.cars.map((c) => ({ ...c, loueur: l.name, city: l.city, rating: l.rating })),
  );
  return (
    <div className="md:hidden">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-brand-tint">
        Aperçu de l&apos;application
      </p>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cards.map((c) => (
          <Link
            key={c.slug}
            href="/application"
            className="glass relative w-[76%] shrink-0 snap-center overflow-hidden rounded-card"
          >
            <div className="relative h-40">
              <Image
                src={`/cars/${c.slug}.jpg`}
                alt={c.name}
                fill
                sizes="80vw"
                className="object-cover"
              />
              <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-ink-900 backdrop-blur">
                ★ {c.rating}
              </span>
            </div>
            <div className="p-4">
              <p className="text-base font-bold text-ink-900">{c.name}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500">
                <ShieldCheck className="size-3.5 text-brand-tint" /> {c.loueur} · {c.city}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm text-ink-600">
                  <span className="text-lg font-extrabold text-ink-900">
                    {c.price.replace(" €/j", "")} €
                  </span>{" "}
                  / jour
                </p>
                <span className="rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-white">
                  Réserver
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
