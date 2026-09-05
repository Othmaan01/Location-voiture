import type { Metadata } from "next";

import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Politique de confidentialite",
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Politique de confidentialite"
      intro="Modele a faire relire avant la mise en production. RGPD : responsable de traitement, base legale et duree de conservation doivent refleter votre situation reelle."
      sections={[
        {
          heading: "Donnees collectees",
          body: "Comptes : nom, e-mail, telephone, role (particulier ou professionnel).\nAgences : raison sociale, adresse, coordonnees, description, horaires, services.\nDemandes de contact : prenom, nom, e-mail, telephone, dates souhaitees, message.\nDonnees techniques : journaux de connexion et cookies de session strictement necessaires.",
        },
        {
          heading: "Finalites et bases legales",
          body: "Gestion des comptes et de l'abonnement : execution du contrat.\nTransmission des demandes de location a l'agence concernee : execution de mesures precontractuelles a la demande de la personne.\nMesure d'audience et amelioration du service : interet legitime.",
        },
        {
          heading: "Destinataires",
          body: "Les demandes de contact sont transmises exclusivement a l'agence destinataire. Les sous-traitants techniques sont Supabase (hebergement de la base et authentification), Netlify (hebergement du site) et Stripe (paiement des abonnements professionnels).",
        },
        {
          heading: "Duree de conservation",
          body: "Comptes : pendant toute la duree d'utilisation, puis 3 ans apres le dernier contact.\nDemandes de contact : 3 ans a compter de leur reception.\nDonnees de facturation : 10 ans (obligation comptable).",
        },
        {
          heading: "Vos droits",
          body: "Vous disposez d'un droit d'acces, de rectification, d'effacement, de limitation, d'opposition et de portabilite. Pour l'exercer : [e-mail de contact]. Vous pouvez introduire une reclamation aupres de la CNIL.",
        },
      ]}
    />
  );
}
