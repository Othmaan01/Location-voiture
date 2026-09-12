import type { Metadata } from "next";

import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  robots: { index: false, follow: true },
};

/** Politique de confidentialite : reflete les traitements reels de l'application (ADR-0017 pour les durees). */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      intro="KARSON met en relation des particuliers et des agences de location de voitures. Voici, en clair, les données que nous traitons, pourquoi, combien de temps, et vos droits. Mise à jour le 12 septembre 2026."
      sections={[
        {
          heading: "Responsable du traitement",
          body: "KARSON, éditeur du site karson.fr et de l'application KARSON. Contact pour toute question relative à vos données : sav@karson.fr.",
        },
        {
          heading: "Données collectées",
          body: "Compte : nom, prénom, e-mail, téléphone, photo de profil (facultative), type de compte (client ou professionnel).\nAgences : raison sociale, SIRET, adresse, coordonnées, description, logo, documents de vérification (Kbis, assurance), transmis par l'agence.\nVéhicules : caractéristiques, photos, tarifs, immatriculation (jamais montrée aux clients).\nRéservations : dates, véhicule, prix affiché, messages échangés, états des lieux signés (croquis, photos, signature), avis.\nAppareil : jeton de notification si vous les activez, position uniquement lorsque vous cherchez des agences autour de vous.",
        },
        {
          heading: "Finalités et bases légales",
          body: "Créer et gérer votre compte, transmettre vos demandes de réservation à l'agence, permettre les échanges et les états des lieux : exécution du contrat.\nVérifier les agences professionnelles : intérêt légitime (sécurité de la plateforme).\nEnvoyer les notifications que vous avez activées : consentement, retirable à tout moment dans les réglages.\nAbonnement des agences : exécution du contrat et obligations comptables.",
        },
        {
          heading: "Destinataires",
          body: "Vos demandes, messages et coordonnées sont transmis uniquement à l'agence concernée, et seulement après confirmation pour le téléphone. Nos sous-traitants techniques : Supabase (base de données et authentification, hébergée dans l'Union européenne), Fly.io (serveur applicatif, Paris), Netlify (site web), Resend (envoi des e-mails), Apple (notifications). Stripe interviendra pour le paiement des abonnements professionnels lorsqu'il sera activé. Aucune donnée n'est vendue ni cédée à des fins publicitaires.",
        },
        {
          heading: "Durées de conservation",
          body: "Compte : pendant son utilisation, puis suppression à votre demande depuis l'application (les données sont anonymisées).\nRéservations et états des lieux : 5 ans, durée de prescription des contrats de location.\nMessages : durée de la relation, puis suppression avec le compte.\nNotifications : 90 jours. Journal de sécurité : 24 mois.\nDonnées de facturation des agences : 10 ans (obligation comptable).",
        },
        {
          heading: "Vos droits",
          body: "Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité. Depuis l'application : Profil → Confidentialité et données (export et suppression du compte). Par e-mail : sav@karson.fr. Vous pouvez également introduire une réclamation auprès de la CNIL (cnil.fr).",
        },
        {
          heading: "Sécurité",
          body: "Connexions chiffrées (HTTPS), données hébergées dans l'Union européenne, accès aux documents d'identité restreint et journalisé, double authentification obligatoire pour l'administration de la plateforme.",
        },
      ]}
    />
  );
}
