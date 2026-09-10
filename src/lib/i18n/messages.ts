import type { Locale } from "./config";

export type Messages = {
  meta: {
    title: string;
    description: string;
  };
  common: {
    back: string;
    account: string;
    continue: string;
    loading: string;
    close: string;
  };
  lang: {
    fr: string;
    en: string;
    switchTo: string;
  };
  home: {
    tagline: string;
    taglineStrong: string;
    cta: string;
    signIn: string;
    signUp: string;
    myAccount: string;
    copyright: string;
    legalNav: string;
    pricing: string;
    terms: string;
    sales: string;
    mentions: string;
    privacy: string;
  };
  auth: {
    email: string;
    password: string;
    signInTitle: string;
    signUpTitle: string;
    signInHint: string;
    signUpHint: string;
    signIn: string;
    signingIn: string;
    createAccount: string;
    creating: string;
    noAccount: string;
    hasAccount: string;
    nameOptional: string;
    name: string;
  };
  templates: {
    step: string;
    title: string;
    hint: string;
    hint2: string;
    continue: string;
    useModel: string;
    previewSoon: string;
    categoryDynamic: string;
    categoryClassic: string;
    names: Record<string, string>;
  };
  writing: {
    step: string;
    title: string;
    hint: string;
    continue: string;
    pacingCascade: string;
    pacingSequential: string;
    pacingSimultaneous: string;
    names: Record<string, string>;
  };
  media: {
    step: string;
    title: string;
    hint: string;
    dropTitle: string;
    dropHint: string;
    browse: string;
    addMore: string;
    continueEdit: string;
    preparing: string;
    uploading: string;
    openingEditor: string;
    reorder: string;
    moveEarlier: string;
    moveLater: string;
    coverStar: string;
    coverHint: string;
  };
  compte: {
    createVideo: string;
    yourVideos: string;
    empty: string;
    remainingShort: string;
    remainingShortOne: string;
    cancel: string;
    cancelSoon: string;
  };
  pricing: {
    title: string;
    monthly: string;
    videos: string;
    photos: string;
    format: string;
    cta: string;
    starterCta: string;
    current: string;
    recommended: string;
    starter: string;
    starterBadge: string;
    starterPitch: string;
    pro: string;
    proPitch: string;
    agence: string;
    agencePitch: string;
  };
  editor: {
    play: string;
    pause: string;
    undo: string;
    cut: string;
    export: string;
    exporting: string;
    upToDate: string;
    generate: string;
    exportEdit: string;
    downloadReady: string;
    tooLong: string;
    text: string;
    audio: string;
    style: string;
    fontColor: string;
    transition: string;
    yourText: string;
    audioSoon: string;
  };
  accountMenu: {
    theme: string;
    light: string;
    dark: string;
    signOut: string;
  };
};

export const fr: Messages = {
  meta: {
    title: "ARÉO — Vidéos immobilières en 1 minute",
    description:
      "Déposez vos photos. Votre vidéo pro est prête en 1 minute. Générateur automatique de vidéos immobilières haut de gamme.",
  },
  common: {
    back: "Retour",
    account: "Compte",
    continue: "Continuer",
    loading: "Chargement…",
    close: "Fermer",
  },
  lang: {
    fr: "FR",
    en: "EN",
    switchTo: "Langue",
  },
  home: {
    tagline: "Déposez vos photos.",
    taglineStrong: "Votre vidéo pro est prête en 1 minute.",
    cta: "Créer ma vidéo",
    signIn: "Se connecter",
    signUp: "Créer un compte",
    myAccount: "Mon compte",
    copyright: "© 2026 ARÉO — Tous droits réservés",
    legalNav: "Mentions légales",
    pricing: "Tarifs",
    terms: "CGU",
    sales: "CGV",
    mentions: "Mentions",
    privacy: "Confidentialité",
  },
  auth: {
    email: "Email",
    password: "Mot de passe",
    signInTitle: "Connexion",
    signUpTitle: "Inscription",
    signInHint: "Starter 10 € : 2 vidéos / mois, reel vertical HD 8–15 s.",
    signUpHint:
      "Commencez à 10 € : 2 vidéos / mois, 4 à 12 photos, 8–15 s.",
    signIn: "Se connecter",
    signingIn: "Connexion…",
    createAccount: "Créer un compte",
    creating: "Création…",
    noAccount: "Pas encore de compte ?",
    hasAccount: "Déjà un compte ?",
    nameOptional: "Prénom (optionnel)",
    name: "Nom",
  },
  templates: {
    step: "Étape 1",
    title: "Modèle",
    hint: "Touchez un modèle pour voir l’aperçu.",
    hint2: "Puis utilisez-le pour ajouter vos photos ou vidéos.",
    continue: "Continuer",
    useModel: "Utiliser ce modèle",
    previewSoon: "Aperçu bientôt — ce modèle utilise la même recette ARÉO.",
    categoryDynamic: "DYNAMIC",
    categoryClassic: "CLASSIC",
    names: {
      "dynamic-reel": "Editorial Ciné",
      "dynamic-pulse": "Pulse TikTok",
      "dynamic-marina": "Marina Lifestyle",
      "dynamic-noir": "Noir Prestige",
      "dynamic-bold": "Bold Impact",
      "dynamic-warm": "Ambre Soft",
      "appartement-premium": "Appartement Premium",
      "paris-haussmann": "Paris Haussmann",
      "villa-luxe": "Villa de Luxe",
      "salle-fitness": "Salle de Sport",
      "restaurant-chic": "Restaurant Chic",
    },
  },
  writing: {
    step: "Étape 2",
    title: "Textes",
    hint: "Style, aperçu et ordre — en même temps.",
    continue: "Générer",
    pacingCascade: "Cascade",
    pacingSequential: "Un après l’autre",
    pacingSimultaneous: "Tout ensemble",
    names: {
      editorial: "Éditorial",
      italic: "Italique",
      snap: "Snap",
      prestige: "Prestige",
      impact: "Impact",
      warm: "Chaleureux",
      punch: "Punch",
      slim: "Condensé",
      amber: "Ambre",
      clean: "Clean",
    },
  },
  media: {
    step: "Étape 1",
    title: "Photos",
    hint: "4 à 12 photos — reel vertical HD, 8 à 15 s",
    dropTitle: "Ajoutez vos photos",
    dropHint: "Touchez pour choisir, ou déposez-les (PC)",
    browse: "Parcourir",
    addMore: "Ajouter",
    continueEdit: "Continuer",
    preparing: "Préparation…",
    uploading: "Envoi des photos…",
    openingEditor: "Ouverture…",
    reorder: "Réordonner",
    moveEarlier: "Monter",
    moveLater: "Descendre",
    coverStar: "Couverture",
    coverHint: "Touchez ★ pour choisir la couverture",
  },
  compte: {
    createVideo: "Créer une vidéo",
    yourVideos: "Vos vidéos",
    empty: "Aucune vidéo pour l’instant.",
    remainingShort: "restantes",
    remainingShortOne: "restante",
    cancel: "Résilier",
    cancelSoon: "Bientôt",
  },
  pricing: {
    title: "Tarifs",
    monthly: "/ mois",
    videos: "vidéos / mois",
    photos: "4 à 12 photos par vidéo",
    format: "Reel vertical HD · 8 à 15 s",
    cta: "Choisir",
    starterCta: "Commencer",
    current: "Offre actuelle",
    recommended: "Le plus choisi",
    starter: "Starter",
    starterBadge: "Pour commencer",
    starterPitch: "2 films pour tester — simple, sans prise de tête",
    pro: "Pro",
    proPitch: "Quand un bien par semaine ne suffit plus",
    agence: "Agence",
    agencePitch: "Le volume d’une équipe",
  },
  editor: {
    play: "Lecture",
    pause: "Pause",
    undo: "Annuler",
    cut: "Couper",
    export: "Exporter le montage",
    exporting: "Export…",
    upToDate: "À jour",
    generate: "Générer la vidéo",
    exportEdit: "Exporter le montage",
    downloadReady: "Télécharger mon Reel",
    tooLong: "Trop long (60 s max)",
    text: "texte",
    audio: "audio",
    style: "Style",
    fontColor: "Police · couleur",
    transition: "Transition",
    yourText: "Votre texte",
    audioSoon: "Bientôt — voix off",
  },
  accountMenu: {
    theme: "Thème",
    light: "Clair",
    dark: "Sombre",
    signOut: "Se déconnecter",
  },
};

export const en: Messages = {
  meta: {
    title: "ARÉO — Pro property videos in 1 minute",
    description:
      "Drop your photos. Your pro video is ready in 1 minute. Automatic high-end real-estate video generator.",
  },
  common: {
    back: "Back",
    account: "Account",
    continue: "Continue",
    loading: "Loading…",
    close: "Close",
  },
  lang: {
    fr: "FR",
    en: "EN",
    switchTo: "Language",
  },
  home: {
    tagline: "Drop your photos.",
    taglineStrong: "Your pro video is ready in 1 minute.",
    cta: "Create my video",
    signIn: "Sign in",
    signUp: "Create an account",
    myAccount: "My account",
    copyright: "© 2026 ARÉO — All rights reserved",
    legalNav: "Legal",
    pricing: "Pricing",
    terms: "Terms",
    sales: "Sales terms",
    mentions: "Legal notice",
    privacy: "Privacy",
  },
  auth: {
    email: "Email",
    password: "Password",
    signInTitle: "Sign in",
    signUpTitle: "Sign up",
    signInHint: "Starter €10: 2 videos / month, vertical HD reel 8–15 s.",
    signUpHint:
      "Start at €10: 2 videos / month, 4 to 12 photos, 8–15 s.",
    signIn: "Sign in",
    signingIn: "Signing in…",
    createAccount: "Create account",
    creating: "Creating…",
    noAccount: "No account yet?",
    hasAccount: "Already have an account?",
    nameOptional: "First name (optional)",
    name: "Name",
  },
  templates: {
    step: "Step 1",
    title: "Template",
    hint: "Tap a template to preview it.",
    hint2: "Then use it to add your photos or videos.",
    continue: "Continue",
    useModel: "Use this template",
    previewSoon: "Preview coming soon — same ARÉO recipe.",
    categoryDynamic: "DYNAMIC",
    categoryClassic: "CLASSIC",
    names: {
      "dynamic-reel": "Editorial Ciné",
      "dynamic-pulse": "Pulse TikTok",
      "dynamic-marina": "Marina Lifestyle",
      "dynamic-noir": "Noir Prestige",
      "dynamic-bold": "Bold Impact",
      "dynamic-warm": "Ambre Soft",
      "appartement-premium": "Premium Apartment",
      "paris-haussmann": "Paris Haussmann",
      "villa-luxe": "Luxury Villa",
      "salle-fitness": "Gym",
      "restaurant-chic": "Chic Restaurant",
    },
  },
  writing: {
    step: "Step 2",
    title: "Text",
    hint: "Style, live preview and order — together.",
    continue: "Generate",
    pacingCascade: "Cascade",
    pacingSequential: "One after another",
    pacingSimultaneous: "All together",
    names: {
      editorial: "Editorial",
      italic: "Italic",
      snap: "Snap",
      prestige: "Prestige",
      impact: "Impact",
      warm: "Warm",
      punch: "Punch",
      slim: "Condensed",
      amber: "Amber",
      clean: "Clean",
    },
  },
  media: {
    step: "Step 1",
    title: "Photos",
    hint: "4 to 12 photos — vertical HD reel, 8 to 15 s",
    dropTitle: "Add your photos",
    dropHint: "Tap to choose, or drop them (desktop)",
    browse: "Browse",
    addMore: "Add",
    continueEdit: "Continue",
    preparing: "Preparing…",
    uploading: "Uploading photos…",
    openingEditor: "Opening…",
    reorder: "Reorder",
    moveEarlier: "Move up",
    moveLater: "Move down",
    coverStar: "Cover",
    coverHint: "Tap ★ to pick the cover",
  },
  compte: {
    createVideo: "Create a video",
    yourVideos: "Your videos",
    empty: "No videos yet.",
    remainingShort: "left",
    remainingShortOne: "left",
    cancel: "Cancel plan",
    cancelSoon: "Soon",
  },
  pricing: {
    title: "Pricing",
    monthly: "/ month",
    videos: "videos / month",
    photos: "4 to 12 photos per video",
    format: "Vertical HD reel · 8 to 15 s",
    cta: "Choose",
    starterCta: "Get started",
    current: "Current plan",
    recommended: "Most popular",
    starter: "Starter",
    starterBadge: "Start here",
    starterPitch: "2 films to try — simple, no fuss",
    pro: "Pro",
    proPitch: "When one listing a week isn’t enough",
    agence: "Agency",
    agencePitch: "Volume for a team",
  },
  editor: {
    play: "Play",
    pause: "Pause",
    undo: "Undo",
    cut: "Split",
    export: "Export edit",
    exporting: "Exporting…",
    upToDate: "Up to date",
    generate: "Generate video",
    exportEdit: "Export edit",
    downloadReady: "Download my Reel",
    tooLong: "Too long (60 s max)",
    text: "text",
    audio: "audio",
    style: "Style",
    fontColor: "Font · color",
    transition: "Transition",
    yourText: "Your text",
    audioSoon: "Coming soon — voice-over",
  },
  accountMenu: {
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    signOut: "Sign out",
  },
};

const ALL: Record<Locale, Messages> = { fr, en };

export function getMessages(locale: Locale): Messages {
  return ALL[locale] ?? fr;
}
