export type TemplateId =
  | "dynamic-reel"
  | "dynamic-pulse"
  | "dynamic-marina"
  | "dynamic-noir"
  | "dynamic-bold"
  | "dynamic-warm"
  | "appartement-premium"
  | "paris-haussmann"
  | "villa-luxe"
  | "salle-fitness"
  | "restaurant-chic";

export type TemplateCategory = "dynamic" | "classic";

export type Template = {
  id: TemplateId;
  title: string;
  badge: string;
  category: TemplateCategory;
  /** Fallback gradient behind the cover */
  preview: string;
  cover: string;
  /** Aperçu vidéo muet (9:16), optionnel */
  demo?: string;
  accent: string;
};

export const TEMPLATE_CATEGORIES: TemplateCategory[] = ["dynamic", "classic"];

export const TEMPLATES: Template[] = [
  {
    id: "dynamic-reel",
    title: "Editorial Ciné",
    badge: "SERIF",
    category: "dynamic",
    preview:
      "linear-gradient(155deg, #0e1014 0%, #1a2030 38%, #2a3548 70%, #c4a57433 100%)",
    cover: "/templates/dynamic.jpg?v=6",
    demo: "/templates/demos/dynamic-reel.mp4?v=6",
    accent: "#8aa0c0",
  },
  {
    id: "dynamic-pulse",
    title: "Pulse TikTok",
    badge: "SNAP",
    category: "dynamic",
    preview:
      "linear-gradient(150deg, #120c10 0%, #2a1820 40%, #4a2838 72%, #c4a57428 100%)",
    cover: "/templates/dynamic-pulse.jpg?v=6",
    demo: "/templates/demos/dynamic-pulse.mp4?v=6",
    accent: "#c090a0",
  },
  {
    id: "dynamic-marina",
    title: "Marina Lifestyle",
    badge: "GLIDE",
    category: "dynamic",
    preview:
      "linear-gradient(158deg, #0c1418 0%, #1a2830 40%, #2a4050 72%, #c4a57428 100%)",
    cover: "/templates/dynamic-marina.jpg?v=6",
    demo: "/templates/demos/dynamic-marina.mp4?v=6",
    accent: "#7a9ab0",
  },
  {
    id: "dynamic-noir",
    title: "Noir Prestige",
    badge: "NOIR",
    category: "dynamic",
    preview:
      "linear-gradient(160deg, #050506 0%, #121018 40%, #2a2430 72%, #d4a84b22 100%)",
    cover: "/templates/dynamic-noir.jpg?v=1",
    demo: "/templates/demos/dynamic-noir.mp4?v=1",
    accent: "#d4a84b",
  },
  {
    id: "dynamic-bold",
    title: "Bold Impact",
    badge: "BOLD",
    category: "dynamic",
    preview:
      "linear-gradient(148deg, #0a0a0c 0%, #1a1018 38%, #3a2030 70%, #ffffff18 100%)",
    cover: "/templates/dynamic-bold.jpg?v=1",
    demo: "/templates/demos/dynamic-bold.mp4?v=1",
    accent: "#e8e4dc",
  },
  {
    id: "dynamic-warm",
    title: "Ambre Soft",
    badge: "AMBRE",
    category: "dynamic",
    preview:
      "linear-gradient(155deg, #1a120c 0%, #3a2818 40%, #6a4830 72%, #f0c09033 100%)",
    cover: "/templates/dynamic-warm.jpg?v=1",
    demo: "/templates/demos/dynamic-warm.mp4?v=1",
    accent: "#e0b070",
  },
  {
    id: "appartement-premium",
    title: "Appartement Premium",
    badge: "LUXE",
    category: "classic",
    preview:
      "linear-gradient(160deg, #1c1e24 0%, #2a2f3a 35%, #3d4554 70%, #c4a57433 100%)",
    cover: "/templates/appartement.jpg",
    demo: "/templates/demos/appartement-premium.mp4",
    accent: "#8a93a3",
  },
  {
    id: "paris-haussmann",
    title: "Paris Haussmann",
    badge: "PARIS",
    category: "classic",
    preview:
      "linear-gradient(156deg, #161410 0%, #2c2820 40%, #4a4438 72%, #c4a57428 100%)",
    cover: "/templates/paris.jpg",
    demo: "/templates/demos/paris-haussmann.mp4",
    accent: "#a89878",
  },
  {
    id: "villa-luxe",
    title: "Villa de Luxe",
    badge: "ESTATE",
    category: "classic",
    preview:
      "linear-gradient(158deg, #141414 0%, #2a2624 40%, #4a4038 72%, #8a868033 100%)",
    cover: "/templates/villa.jpg",
    demo: "/templates/demos/villa-luxe.mp4",
    accent: "#9a9088",
  },
  {
    id: "salle-fitness",
    title: "Salle de Sport",
    badge: "ENERGY",
    category: "classic",
    preview:
      "linear-gradient(150deg, #101218 0%, #1c2430 38%, #2e3a4a 70%, #c4a57428 100%)",
    cover: "/templates/fitness.jpg",
    demo: "/templates/demos/salle-fitness.mp4",
    accent: "#7a8aa0",
  },
  {
    id: "restaurant-chic",
    title: "Restaurant Chic",
    badge: "BRAND",
    category: "classic",
    preview:
      "linear-gradient(152deg, #1a1210 0%, #2c1e1a 40%, #4a3028 72%, #c4a57433 100%)",
    cover: "/templates/restaurant.jpg",
    demo: "/templates/demos/restaurant-chic.mp4",
    accent: "#b89070",
  },
];

export function getTemplateById(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function templatesByCategory(category: TemplateCategory): Template[] {
  return TEMPLATES.filter((t) => t.category === category);
}
