import type { Metadata } from "next";

import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contactez l'équipe KARSON.",
};

export default function ContactPage() {
  return (
    <LegalPage
      title="Nous contacter"
      sections={[
        {
          heading: "Vous êtes une agence de location",
          body: "Pour référencer votre agence, créez directement votre compte depuis l'espace pro de l'application. Pour toute question sur les forfaits ou la facturation, écrivez à sav@karson.fr.",
        },
        {
          heading: "Vous cherchez à louer un véhicule",
          body: "Les demandes de location se font directement auprès des agences, depuis l'application. Nous n'intervenons pas dans la réservation.",
        },
        {
          heading: "Presse et partenariats",
          body: "sav@karson.fr",
        },
      ]}
    />
  );
}
