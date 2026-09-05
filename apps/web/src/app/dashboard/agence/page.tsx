import { AgencyForm } from "@/components/dashboard/agency-form";
import { requirePro } from "@/lib/auth";
import { listCities } from "@/lib/queries";

export default async function AgencySettingsPage() {
  const { agency } = await requirePro();
  const cities = await listCities(400);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-ink-900">Mon agence</h2>
        <p className="text-sm text-muted-foreground">
          Ces informations composent votre fiche publique et votre position sur la carte.
        </p>
      </div>

      <AgencyForm
        agency={agency}
        cities={cities.map((city) => ({
          id: city.id,
          name: city.name,
          slug: city.slug,
          latitude: city.latitude,
          longitude: city.longitude,
          department_code: city.department_code,
        }))}
      />
    </div>
  );
}
