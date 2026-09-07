export type TemplateId =
  | "appartement-premium"
  | "maison-moderne"
  | "villa-luxe"
  | "hotel-boutique"
  | "salle-fitness"
  | "restaurant-chic";

export type Template = {
  id: TemplateId;
  title: string;
  badge: string;
  /** Fallback gradient behind the cover */
  preview: string;
  cover: string;
  /** Aperçu vidéo muet (9:16), optionnel */
  demo?: string;
  accent: string;
};

export const TEMPLATES: Template[] = [
  {
    id: "appartement-premium",
    title: "Appartement Premium",
    badge: "DYNAMIC",
    preview:
      "linear-gradient(160deg, #1c1e24 0%, #2a2f3a 35%, #3d4554 70%, #c4a57433 100%)",
    cover: "/templates/appartement.jpg",
    demo: "/templates/demos/appartement-premium.mp4",
    accent: "#8a93a3",
  },
  {
    id: "maison-moderne",
    title: "Maison Moderne",
    badge: "CLASSIC",
    preview:
      "linear-gradient(155deg, #181614 0%, #2c2620 40%, #4a3f32 75%, #c4a57444 100%)",
    cover: "/templates/maison.jpg",
    demo: "/templates/demos/maison-moderne.mp4",
    accent: "#a89070",
  },
  {
    id: "villa-luxe",
    title: "Villa de Luxe",
    badge: "TREND",
    preview:
      "linear-gradient(158deg, #141414 0%, #2a2624 40%, #4a4038 72%, #8a868033 100%)",
    cover: "/templates/hotel.jpg",
    demo: "/templates/demos/hotel-boutique.mp4",
    accent: "#9a9088",
  },
  {
    id: "salle-fitness",
    title: "Salle de Sport",
    badge: "DYNAMIC",
    preview:
      "linear-gradient(150deg, #101218 0%, #1c2430 38%, #2e3a4a 70%, #c4a57428 100%)",
    cover: "/templates/fitness.jpg",
    demo: "/templates/demos/salle-fitness.mp4",
    accent: "#7a8aa0",
  },
  {
    id: "restaurant-chic",
    title: "Restaurant Chic",
    badge: "CLASSIC",
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
