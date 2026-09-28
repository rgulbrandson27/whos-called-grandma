// The first BASE_COLOR_COUNT entries are what the color page offers up front
// (a 4 x 2 grid) — a Basic circle only ever needs 6, so there are always a
// couple of spares to choose from. The 12 after that are shades of the same
// 8 hues; they only ever get reached once all 8 base colors are already
// taken, which can only happen on Premium (up to 20 people). Assignment code
// elsewhere just does "first color in this list not already used" — because
// the list is ordered base-then-shades, that alone produces "shades kick in
// only once the base 8 run out" with no extra branching needed anywhere.
// Basic/flat placeholders for now — swap hex values for real brand colors later.
export const BASE_COLOR_COUNT = 8;

export const CIRCLE_COLORS = [
  { name: "Coral", hex: "#FF6B6B" },
  { name: "Tangerine", hex: "#F4A259" },
  { name: "Marigold", hex: "#F2CC4C" },
  { name: "Sage", hex: "#6BAA75" },
  { name: "Sky", hex: "#5B9BD5" },
  { name: "Plum", hex: "#9B72AA" },
  { name: "Rose", hex: "#E58BB0" },
  { name: "Clay", hex: "#A67B5B" },
  // Shades of the 8 above, in the same order (darker then lighter where both exist).
  { name: "Rust", hex: "#C1443A" }, // dark Coral
  { name: "Peach", hex: "#FFAFA0" }, // light Coral
  { name: "Amber", hex: "#C97A2E" }, // dark Tangerine
  { name: "Apricot", hex: "#FAC98C" }, // light Tangerine
  { name: "Mustard", hex: "#C29A2E" }, // dark Marigold
  { name: "Butter", hex: "#F8E29B" }, // light Marigold
  { name: "Forest", hex: "#46794F" }, // dark Sage
  { name: "Mint", hex: "#A9D8AF" }, // light Sage
  { name: "Denim", hex: "#3C6E9E" }, // dark Sky
  { name: "Aubergine", hex: "#6E4C7A" }, // dark Plum
  { name: "Blush", hex: "#F4C2D8" }, // light Rose
  { name: "Umber", hex: "#7A5C43" }, // dark Clay
] as const;

export type CircleColor = (typeof CIRCLE_COLORS)[number];
