import { jsonLd } from "@/lib/seo";

export type FaqItem = { q: string; a: string };

/** FAQ accessible (details/summary) avec donnees structurees pour Google. */
export function Faq({
  items,
  title = "Questions fréquentes",
}: {
  items: FaqItem[];
  title?: string;
}) {
  return (
    <section className="container-page py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((i) => ({
            "@type": "Question",
            name: i.q,
            acceptedAnswer: { "@type": "Answer", text: i.a },
          })),
        })}
      />
      <h2 className="text-2xl font-bold text-ink-900 md:text-3xl">{title}</h2>
      <div className="mt-6 divide-y divide-ink-200 rounded-card border border-ink-200 bg-surface/60">
        {items.map((i) => (
          <details key={i.q} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink-900">
              {i.q}
              <span className="text-brand-tint transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">{i.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
