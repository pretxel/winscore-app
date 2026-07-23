/**
 * Regenerate brand icon + OG image assets for the winscore.me rebrand.
 * Run with: node scripts/generate-brand-assets.mjs
 */

import { writeFileSync } from "node:fs";
import sharp from "sharp";

const TILE = "#16a34a"; // pitch green (matches existing icon brand color)
const TILE_FG = "#f8fafc";
const INK = "#0a0a0a";
const FONT = "Arial Black, Arial, sans-serif";

// ---------------------------------------------------------------- icon.svg
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${TILE}" />
  <rect width="64" height="22" rx="14" fill="#ffffff" fill-opacity="0.10" />
  <text
    x="32"
    y="45"
    text-anchor="middle"
    font-family="${FONT}"
    font-weight="900"
    font-size="36"
    fill="${TILE_FG}"
  >W</text>
</svg>
`;

writeFileSync("app/icon.svg", iconSvg);

// ------------------------------------------------- icon.png / apple-icon.png
await sharp(Buffer.from(iconSvg), { density: 384 }).resize(512, 512).png().toFile("app/icon.png");

await sharp(Buffer.from(iconSvg), { density: 384 })
  .resize(180, 180)
  .png()
  .toFile("app/apple-icon.png");

// ------------------------------------------------------------- favicon.ico
// Multi-size ICO embedding PNG payloads (16 / 32 / 48).
const sizes = [16, 32, 48];
const pngs = await Promise.all(
  sizes.map((s) => sharp(Buffer.from(iconSvg), { density: 384 }).resize(s, s).png().toBuffer()),
);

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(sizes.length, 4);

let offset = 6 + sizes.length * 16;
const entries = sizes.map((s, i) => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(s === 256 ? 0 : s, 0); // width
  entry.writeUInt8(s === 256 ? 0 : s, 1); // height
  entry.writeUInt8(0, 2); // palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // planes
  entry.writeUInt16LE(32, 6); // bpp
  entry.writeUInt32LE(pngs[i].length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return entry;
});

writeFileSync("app/favicon.ico", Buffer.concat([header, ...entries, ...pngs]));

// ------------------------------------------------------- opengraph-image.png
// 1200×630 card: wordmark top-left, headline below, year stamp bottom-right.
const stripes = Array.from({ length: 12 }, (_, i) => {
  const x = i * 100;
  const fill = i % 2 === 0 ? "#0d1f14" : "#0a0a0a";
  return `<rect x="${x}" y="0" width="100" height="630" fill="${fill}" />`;
}).join("\n  ");

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${INK}" />
  ${stripes}
  <rect width="1200" height="630" fill="#000000" fill-opacity="0.45" />

  <!-- Wordmark: W tile + WINSCORE -->
  <g>
    <rect x="64" y="64" width="96" height="96" rx="20" fill="${TILE}" />
    <rect x="64" y="64" width="96" height="32" rx="20" fill="#ffffff" fill-opacity="0.10" />
    <text x="112" y="132" text-anchor="middle" font-family="${FONT}" font-weight="900" font-size="58" fill="${TILE_FG}">W</text>
    <text x="184" y="132" font-family="${FONT}" font-weight="900" font-size="64" letter-spacing="2" fill="#f8fafc">INSCORE</text>
  </g>

  <!-- Headline -->
  <text x="64" y="340" font-family="${FONT}" font-weight="900" font-size="76" fill="#f8fafc">Call the score.</text>
  <text x="64" y="440" font-family="${FONT}" font-weight="900" font-size="76" fill="${TILE}">Climb the table.</text>

  <!-- Subline -->
  <text x="64" y="510" font-family="Arial, sans-serif" font-size="30" fill="#9ca3af">One pool per league. Exact-score picks, live leaderboard.</text>

  <!-- Year stamp -->
  <text x="1136" y="586" text-anchor="end" font-family="Courier New, monospace" font-weight="700" font-size="30" letter-spacing="4" fill="#4b5563">2026</text>
</svg>
`;

await sharp(Buffer.from(ogSvg), { density: 144 })
  .resize(1200, 630)
  .png()
  .toFile("app/opengraph-image.png");

console.log(
  "brand assets regenerated: icon.svg, icon.png, apple-icon.png, favicon.ico, opengraph-image.png",
);
