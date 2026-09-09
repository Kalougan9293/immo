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
  media: {
    step: string;
    title: string;
    hint: string;
    hintDynamic: string;
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
  };
  compte: {
    createVideo: string;
    yourVideos: string;
    empty: string;
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
      "Déposez vos médias. Votre vidéo pro est prête en 1 minute. Générateur automatique de vidéos immobilières haut de gamme.",
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
    tagline: "Déposez vos médias.",
    taglineStrong: "Votre vidéo pro est prête en 1 minute.",
    cta: "Créer ma vidéo",
    signIn: "Se connecter",
    signUp: "Créer un compte",
    myAccount: "Mon compte",
    copyright: "© 2026 ARÉO — Tous droits réservés",
    legalNav: "Mentions légales",
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
    signInHint: "Retrouvez jusqu’à 3 vidéos sauvegardées sur votre compte.",
    signUpHint:
      "Sauvegardez jusqu’à 3 vidéos. La plus ancienne est remplacée automatiquement.",
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
  media: {
    step: "Étape 2",
    title: "Médias",
    hint: "Ajoutez photos et vidéos de votre bien.",
    hintDynamic:
      "Conseil : ordonnez extérieur → pièces → vue (glisser ou flèches).",
    dropTitle: "Déposez vos fichiers",
    dropHint: "Photos ou vidéos — jusqu’à 12",
    browse: "Parcourir",
    addMore: "Ajouter",
    continueEdit: "Continuer vers l’édition",
    preparing: "Préparation…",
    uploading: "Envoi des médias…",
    openingEditor: "Ouverture de l’éditeur…",
    reorder: "Réordonner",
    moveEarlier: "Monter",
    moveLater: "Descendre",
  },
  compte: {
    createVideo: "Créer une vidéo",
    yourVideos: "Vos vidéos",
    empty: "Aucune vidéo pour l’instant.",
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
      "Drop your media. Your pro video is ready in 1 minute. Automatic high-end real-estate video generator.",
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
    tagline: "Drop your media.",
    taglineStrong: "Your pro video is ready in 1 minute.",
    cta: "Create my video",
    signIn: "Sign in",
    signUp: "Create an account",
    myAccount: "My account",
    copyright: "© 2026 ARÉO — All rights reserved",
    legalNav: "Legal",
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
    signInHint: "Access up to 3 videos saved on your account.",
    signUpHint:
      "Save up to 3 videos. The oldest one is replaced automatically.",
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
  media: {
    step: "Step 2",
    title: "Media",
    hint: "Add photos and videos of your property.",
    hintDynamic:
      "Tip: order exterior → rooms → view (drag or arrows).",
    dropTitle: "Drop your files",
    dropHint: "Photos or videos — up to 12",
    browse: "Browse",
    addMore: "Add",
    continueEdit: "Continue to editing",
    preparing: "Preparing…",
    uploading: "Uploading media…",
    openingEditor: "Opening editor…",
    reorder: "Reorder",
    moveEarlier: "Move up",
    moveLater: "Move down",
  },
  compte: {
    createVideo: "Create a video",
    yourVideos: "Your videos",
    empty: "No videos yet.",
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
