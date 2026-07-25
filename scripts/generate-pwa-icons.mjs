/**
 * Resize public/logo-icon.png into the PWA icon set under public/icons/.
 * Re-run after replacing the source logo:
 *   node scripts/generate-pwa-icons.mjs
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const src = join(root, "public", "logo-icon.png");
const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });

async function writeIcon(filename, size, { padded = false } = {}) {
  const pipeline = sharp(src).resize(size, size, {
    fit: padded ? "contain" : "cover",
    background: padded ? { r: 161, g: 42, b: 74, alpha: 1 } : undefined, // #A12A4A
  });
  await pipeline.png().toFile(join(outDir, filename));
  console.log(`wrote public/icons/${filename} (${size}x${size})`);
}

await writeIcon("icon-192.png", 192);
await writeIcon("icon-512.png", 512);
// Maskable icons need safe-zone padding so Android launchers don't crop the mark.
await writeIcon("maskable-512.png", 512, { padded: true });
console.log("Done.");
