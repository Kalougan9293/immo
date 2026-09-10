import { LEGAL, legalField } from "@/lib/legal";
import { PLAN_LIST } from "@/lib/billing";

export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export type LegalDocData = {
  slug: "cgu" | "cgv" | "mentions" | "confidentialite";
  title: string;
  intro?: string;
  sections: LegalSection[];
};

const co = legalField(LEGAL.companyName);
const form = legalField(LEGAL.legalForm);
const capital = legalField(LEGAL.capital);
const siren = legalField(LEGAL.siren);
const rcs = legalField(LEGAL.rcs);
const tva = legalField(LEGAL.tva);
const address = legalField(LEGAL.address);
const publisher = legalField(LEGAL.publisher);
const email = legalField(LEGAL.email);

const plansList = PLAN_LIST.map(
  (p) =>
    `${p.id === "agence" ? "Agence" : p.id === "pro" ? "Pro" : "Starter"} : ${p.priceEur} € / mois, ${p.videosPerMonth} vidéo${p.videosPerMonth > 1 ? "s" : ""} par mois`,
).join(" ; ");

export const LEGAL_DOCS: Record<LegalDocData["slug"], LegalDocData> = {
  mentions: {
    slug: "mentions",
    title: "Mentions légales",
    intro:
      "Conformément à la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique.",
    sections: [
      {
        heading: "Éditeur",
        paragraphs: [
          `Le site ${LEGAL.brand} (${LEGAL.siteUrl}) est édité par ${co}, ${form}, au capital de ${capital}.`,
          `SIREN / SIRET : ${siren}. RCS : ${rcs}. N° TVA : ${tva}.`,
          `Siège social : ${address}.`,
        ],
      },
      {
        heading: "Directeur de la publication",
        paragraphs: [`${publisher}`],
      },
      {
        heading: "Contact",
        paragraphs: [`Email : ${email}.`],
      },
      {
        heading: "Hébergement",
        paragraphs: [
          `Le site est hébergé par ${LEGAL.host.name}, ${LEGAL.host.address}. Site : ${LEGAL.host.website}.`,
        ],
      },
      {
        heading: "Objet du service",
        paragraphs: [
          `${LEGAL.brand} est un service en ligne de génération de vidéos courtes à partir de photographies immobilières, destiné aux professionnels de l’immobilier.`,
        ],
      },
    ],
  },
  cgu: {
    slug: "cgu",
    title: "Conditions générales d’utilisation",
    intro: `Les présentes CGU régissent l’accès et l’usage de ${LEGAL.brand}. Toute inscription ou utilisation vaut acceptation.`,
    sections: [
      {
        heading: "1. Objet",
        paragraphs: [
          `${LEGAL.brand} permet de créer des vidéos verticales (reels) à partir de 4 à 12 photos d’un bien, pour un usage professionnel (annonce, réseaux sociaux, présentation client).`,
        ],
      },
      {
        heading: "2. Compte",
        paragraphs: [
          "L’accès aux générations suppose un compte. Vous vous engagez à fournir des informations exactes et à conserver la confidentialité de vos identifiants.",
          "Le service s’adresse à des professionnels. En vous inscrivant, vous déclarez agir dans le cadre de votre activité.",
        ],
      },
      {
        heading: "3. Photos et contenus",
        paragraphs: [
          "Vous restez propriétaire de vos photos. Vous accordez à l’éditeur une licence limitée, non exclusive, pour les héberger, les traiter et générer la vidéo commandée.",
          "Vous garantissez disposer des droits (auteur, personnes filmées ou photographiées, marques) et que les visuels ne portent pas atteinte à des tiers.",
          "Il est interdit d’importer des contenus illicites, diffamatoires, ou sans lien avec une activité immobilière légitime.",
        ],
      },
      {
        heading: "4. Génération automatique",
        paragraphs: [
          "Les vidéos sont produites de façon automatisée, avec l’aide de prestataires techniques d’intelligence artificielle. Le résultat peut présenter des artefacts, approximations ou écarts par rapport à la photo source.",
          "Vous êtes seul responsable de la vérification et de la publication de chaque vidéo avant diffusion.",
        ],
      },
      {
        heading: "5. Quotas et usage",
        paragraphs: [
          "Chaque offre comprend un nombre de vidéos par mois calendaire, non reportable. Un nouveau rendu d’une vidéo déjà générée (remplacement) n’ouvre pas forcément un crédit supplémentaire.",
          "Tout usage abusif (automatisation non autorisée, revente brute du service, contournement des quotas) peut entraîner la suspension du compte.",
        ],
      },
      {
        heading: "6. Propriété intellectuelle",
        paragraphs: [
          `La marque ${LEGAL.brand}, l’interface, les modèles visuels et les textes de l’éditeur restent sa propriété.`,
          "La vidéo générée vous est concédée pour vos communications immobilières. Vous n’acquérez pas les droits sur les outils, modèles ou infrastructures sous-jacents.",
        ],
      },
      {
        heading: "7. Disponibilité et responsabilité",
        paragraphs: [
          "Le service est fourni « en l’état ». Des interruptions (maintenance, prestataires, réseau) peuvent survenir.",
          "Sauf faute lourde, la responsabilité de l’éditeur est limitée au montant des sommes payées au cours des 12 derniers mois, et n’inclut pas les préjudices indirects (perte de mandat, d’image, de chance).",
        ],
      },
      {
        heading: "8. Droit applicable",
        paragraphs: [
          "Les présentes CGU sont régies par le droit français. En cas de litige, compétence des tribunaux du ressort du siège de l’éditeur, sous réserve des règles d’ordre public.",
        ],
      },
    ],
  },
  cgv: {
    slug: "cgv",
    title: "Conditions générales de vente",
    intro:
      "Les présentes CGV s’appliquent aux abonnements souscrits sur le site. Elles complètent les CGU.",
    sections: [
      {
        heading: "1. Prestataire et client",
        paragraphs: [
          `Prestataire : ${co}, ${form}, ${address}. Contact : ${email}.`,
          "Le client est un professionnel de l’immobilier (agent, agence, mandataire, promoteur, etc.).",
        ],
      },
      {
        heading: "2. Offres",
        paragraphs: [
          `Abonnements mensuels : ${plansList}.`,
          "Chaque vidéo accepte de 4 à 12 photos. Format vertical HD. Durée du reel : 8 à 15 secondes.",
          `Les prix sont indiqués en euros. Régime de TVA : ${tva}.`,
        ],
      },
      {
        heading: "3. Commande et paiement",
        paragraphs: [
          "L’abonnement est souscrit en ligne. Le paiement est assuré par un prestataire de paiement sécurisé.",
          "L’accès au service suppose un abonnement en cours de validité et un quota mensuel disponible.",
        ],
      },
      {
        heading: "4. Exécution",
        paragraphs: [
          "La génération d’une vidéo constitue l’exécution de la prestation numérique. Elle démarre dès la validation de la commande de rendu, sous réserve du quota restant.",
          "Les crédits non utilisés en fin de mois ne sont pas reportés, sauf mention contraire écrite.",
        ],
      },
      {
        heading: "5. Rétractation",
        paragraphs: [
          "Le service s’adressant à des professionnels, le droit de rétractation prévu pour les consommateurs (14 jours) ne s’applique en principe pas.",
          "Si un consommateur utilisait malgré tout le service, le droit de rétractation ne s’appliquerait plus une fois la génération lancée, conformément aux règles sur les contenus numériques fournis sur un support immatériel.",
        ],
      },
      {
        heading: "6. Durée, reconduction, résiliation",
        paragraphs: [
          "L’abonnement est mensuel, à reconduction tacite. La résiliation prend effet à la fin de la période en cours. Aucun remboursement au prorata n’est dû, sauf obligation légale contraire.",
        ],
      },
      {
        heading: "7. Médiation / litiges",
        paragraphs: [
          `Droit français. Litiges : tribunaux du ressort du siège, après tentative de résolution amiable à l’adresse ${email}.`,
        ],
      },
    ],
  },
  confidentialite: {
    slug: "confidentialite",
    title: "Politique de confidentialité",
    intro:
      "Cette politique décrit le traitement des données personnelles dans le cadre du service, conformément au RGPD et à la loi Informatique et Libertés.",
    sections: [
      {
        heading: "1. Responsable de traitement",
        paragraphs: [`${co}, ${address}. Contact : ${email}.`],
      },
      {
        heading: "2. Données collectées",
        paragraphs: [
          "Compte : email, mot de passe (haché par le prestataire d’authentification), prénom le cas échéant, offre d’abonnement.",
          "Usage : photos téléversées, vidéos générées, journaux techniques (date, erreurs, volume).",
          "Paiement : données de facturation via le prestataire de paiement, sans stockage complet de carte chez l’éditeur.",
        ],
      },
      {
        heading: "3. Finalités et bases légales",
        paragraphs: [
          "Exécution du contrat : création du compte, génération et stockage des vidéos, gestion des quotas.",
          "Intérêt légitime : sécurité, prévention de la fraude, amélioration du service.",
          "Obligation légale : facturation et conservation comptable, le cas échéant.",
        ],
      },
      {
        heading: "4. Destinataires et sous-traitants",
        paragraphs: [
          "Hébergement de l’application : Render Services, Inc. (États-Unis).",
          "Compte, fichiers et base : Supabase (infrastructure cloud, transferts possibles hors UE).",
          "Génération vidéo : prestataires d’intelligence artificielle qui reçoivent les photos le temps du traitement. Ces prestataires peuvent être établis hors de l’Union européenne.",
          "Paiement : prestataire de paiement sécurisé.",
        ],
      },
      {
        heading: "5. Transferts hors UE",
        paragraphs: [
          "Des transferts vers les États-Unis ou d’autres pays peuvent avoir lieu (hébergement, IA). Ils reposent sur des clauses contractuelles types ou un cadre d’adéquation lorsqu’il existe. Vous pouvez demander plus de détail à l’email de contact.",
        ],
      },
      {
        heading: "6. Durées de conservation",
        paragraphs: [
          "Compte : jusqu’à suppression ou inactivité prolongée.",
          "Vidéos et photos : selon le plafond de la bibliothèque lié à l’offre ; les fichiers évincés sont destinés à la suppression.",
          "Journaux techniques : durée limitée, nécessaire à la sécurité et au diagnostic.",
        ],
      },
      {
        heading: "7. Vos droits",
        paragraphs: [
          "Accès, rectification, effacement, limitation, portabilité, opposition, et consignes post-mortem selon le droit français.",
          `Pour les exercer : ${email}. Vous pouvez aussi saisir la CNIL (cnil.fr).`,
        ],
      },
      {
        heading: "8. Cookies",
        paragraphs: [
          "Cookies ou stockage local strictement nécessaires : session de connexion, préférence de langue, préférence de thème. Pas de publicité tierce à ce stade.",
        ],
      },
    ],
  },
};
