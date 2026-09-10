/** Exemples affichés sur le hero (lecture seule). */

export type AccountExample = {
  id: string;
  title: string;
  video: string;
  cover: string;
};

export const ACCOUNT_EXAMPLES: AccountExample[] = [
  {
    id: "paris-haussmann",
    title: "Paris",
    video: "/examples/paris-haussmann.mp4",
    cover: "/examples/paris-haussmann.jpg",
  },
  {
    id: "luxe-clair",
    title: "Luxe clair",
    video: "/examples/luxe-clair.mp4",
    cover: "/examples/luxe-clair.jpg",
  },
  {
    id: "visite-prestige",
    title: "Prestige",
    video: "/examples/visite-prestige.mp4",
    cover: "/examples/visite-prestige.jpg",
  },
];
