export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro?: string;
  sections: { heading: string; body: string }[];
}) {
  return (
    <div className="container-page max-w-3xl py-14">
      <h1 className="text-3xl font-extrabold text-ink-900">{title}</h1>
      {intro ? <p className="mt-3 text-ink-600">{intro}</p> : null}
      <div className="mt-10 space-y-8">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-lg font-semibold text-ink-900">{section.heading}</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-600">
              {section.body}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
