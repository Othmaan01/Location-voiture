import type { Metadata } from "next";

import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contactez l'equipe RentMap.",
};

export default function ContactPage() {
  return (
    <LegalPage
      title="Nous contacter"
      sections={[
        {
          heading: "Vous etes loueur professionnel",
          body: "Pour referencer votre agence, creez directement votre compte depuis l'espace pro. Pour toute question sur les paliers ou la facturation, ecrivez a pro@rentmap.fr (adresse a remplacer par la votre).",
        },
        {
          heading: "Vous cherchez a louer un vehicule",
          body: "Les demandes de location se font directement aupres des agences, via le formulaire present sur chaque fiche. Nous n'intervenons pas dans la reservation.",
        },
        {
          heading: "Presse et partenariats",
          body: "sav@karson.fr",
        },
      ]}
    />
  );
}
