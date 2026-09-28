// One swatch per circle member (subscriber included). The color page offers
// all 8 up front (a 4 x 2 grid) even though a Basic circle has at most 6
// people, so there's always a choice left for everyone who joins.
// Beyond 8 members (Premium goes to 20) the colors run out — that needs an
// extended set and/or shapes (circle_members.shape) before it's supported.
// Basic/flat placeholders for now — swap hex values for real brand colors later.
export const CIRCLE_COLORS = [
  { name: "Coral", hex: "#FF6B6B" },
  { name: "Tangerine", hex: "#F4A259" },
  { name: "Marigold", hex: "#F2CC4C" },
  { name: "Sage", hex: "#6BAA75" },
  { name: "Sky", hex: "#5B9BD5" },
  { name: "Plum", hex: "#9B72AA" },
  { name: "Rose", hex: "#E58BB0" },
  { name: "Clay", hex: "#A67B5B" },
] as const;

export type CircleColor = (typeof CIRCLE_COLORS)[number];
