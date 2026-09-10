export type TemplateId =
  | "dynamic-reel"
  | "dynamic-marina"
  | "dynamic-warm"
  | "appartement-premium"
  | "paris-haussmann"
  | "villa-luxe";

export type TemplateCategory = "dynamic" | "classic";

export type Template = {
  id: TemplateId;
  title: string;
  badge: string;
  category: TemplateCategory;
  /** Fallback gradient behind the cover */
  preview: string;
  cover: string;
  /** Mute 9:16 preview video (optional) */
  demo?: string;
  accent: string;
};

export const TEMPLATE_CATEGORIES: TemplateCategory[] = ["dynamic", "classic"];

export const TEMPLATES: Template[] = [
  {
    id: "dynamic-reel",
    title: "Editorial Cine",
    badge: "CINÉ",
    category: "dynamic",
    preview:
      "linear-gradient(155deg, #0e1014 0%, #1a2030 38%, #2a3548 70%, #c4a57433 100%)",
    cover: "/templates/dynamic.jpg?v=8",
    demo: "/templates/demos/dynamic-reel.mp4?v=8",
    accent: "#8aa0c0",
  },
  {
    id: "dynamic-marina",
    title: "Marina Lifestyle",
    badge: "GLIDE",
    category: "dynamic",
    preview:
      "linear-gradient(158deg, #0c1418 0%, #1a2830 40%, #2a4050 72%, #c4a57428 100%)",
    cover: "/templates/dynamic-marina-v9.jpg",
    demo: "/templates/demos/dynamic-marina-v9.mp4",
    accent: "#7a9ab0",
  },
  {
    id: "dynamic-warm",
    title: "Ambre Soft",
    badge: "DOUX",
    category: "dynamic",
    preview:
      "linear-gradient(155deg, #1a120c 0%, #3a2818 40%, #6a4830 72%, #f0c09033 100%)",
    cover: "/templates/dynamic-warm-v10.jpg",
    demo: "/templates/demos/dynamic-warm-v10.mp4",
    accent: "#e0b070",
  },
  {
    id: "appartement-premium",
    title: "Appartement Premium",
    badge: "LENT",
    category: "classic",
    preview:
      "linear-gradient(160deg, #1c1e24 0%, #2a2f3a 35%, #3d4554 70%, #c4a57433 100%)",
    cover: "/templates/appartement.jpg?v=8",
    demo: "/templates/demos/appartement-premium.mp4?v=8",
    accent: "#8a93a3",
  },
  {
    id: "paris-haussmann",
    title: "Paris Haussmann",
    badge: "RAPIDE",
    category: "classic",
    preview:
      "linear-gradient(156deg, #161410 0%, #2c2820 40%, #4a4438 72%, #c4a57428 100%)",
    cover: "/templates/paris.jpg?v=10",
    demo: "/templates/demos/paris-haussmann.mp4?v=10",
    accent: "#a89878",
  },
  {
    id: "villa-luxe",
    title: "Villa de Luxe",
    badge: "GLIDE",
    category: "classic",
    preview:
      "linear-gradient(158deg, #141414 0%, #2a2624 40%, #4a4038 72%, #8a868033 100%)",
    cover: "/templates/villa.jpg?v=8",
    demo: "/templates/demos/villa-luxe.mp4?v=8",
    accent: "#9a9088",
  },
];

export function getTemplateById(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function templatesByCategory(category: TemplateCategory): Template[] {
  return TEMPLATES.filter((t) => t.category === category);
}
