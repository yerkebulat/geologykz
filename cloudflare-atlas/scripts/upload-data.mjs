#!/usr/bin/env node
// Upload processed layers to the private R2 bucket with these prefixes:
//   public/maps.json and public/data/*  (public catalog and layers)
//   atlas/maps.json                     (full atlas catalog)
//   paleo/data/*                        (atlas-only paleo layers)
// Tiles stay under 200k/ and are not uploaded by this script.
// Never uploads PDF/TIFF/KMZ originals. Never prints secrets.
//
// Usage:
//   PUBLIC_ROOT=/path/to/public-assets ATLAS_ROOT=/path/to/atlas-assets node scripts/upload-data.mjs
// Optional: R2_BUCKET=kzgeology-atlas-tiles
import { spawnSync } from "node:child_process";
import { readdirSync, statSync, existsSync } from "node:fs";
import { relative, join, resolve } from "node:path";

const bucket = process.env.R2_BUCKET || "kzgeology-atlas-tiles";
const skipRaw = /\.(tiff?|kmz|kml|pdf)$/i;
const paleoFile = /(?:^|\/)paleo-maps-/i;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function addDataFiles(root, prefix, opts, files) {
  const { paleoOnly = false, skipPaleo = false } = opts || {};
  const dataDir = join(root, "data");
  if (!existsSync(dataDir)) return;
  for (const p of walk(dataDir)) {
    if (skipRaw.test(p)) continue;
    const rel = relative(root, p).replaceAll("\\", "/");
    const isPaleo = paleoFile.test(rel);
    if (paleoOnly && !isPaleo) continue;
    if (skipPaleo && isPaleo) continue;
    files.push({ key: `${prefix}/${rel}`, path: p });
  }
}

const files = [];
const publicRoot = process.env.PUBLIC_ROOT ? resolve(process.env.PUBLIC_ROOT) : "";
const atlasRoot = process.env.ATLAS_ROOT ? resolve(process.env.ATLAS_ROOT) : "";
if (!publicRoot && !atlasRoot) {
  console.error("Set PUBLIC_ROOT and/or ATLAS_ROOT to local asset folders (not committed to git).");
  process.exit(1);
}
if (publicRoot) {
  if (!existsSync(publicRoot)) {
    console.error("PUBLIC_ROOT does not exist.");
    process.exit(1);
  }
  const maps = process.env.PUBLIC_MAPS_JSON ? resolve(process.env.PUBLIC_MAPS_JSON) : join(publicRoot, "maps.json");
  if (existsSync(maps)) files.push({ key: "public/maps.json", path: maps });
  addDataFiles(publicRoot, "public", { skipPaleo: true }, files);
}
if (atlasRoot) {
  if (!existsSync(atlasRoot)) {
    console.error("ATLAS_ROOT does not exist.");
    process.exit(1);
  }
  const maps = process.env.ATLAS_MAPS_JSON ? resolve(process.env.ATLAS_MAPS_JSON) : join(atlasRoot, "maps.json");
  if (existsSync(maps)) files.push({ key: "atlas/maps.json", path: maps });
  addDataFiles(atlasRoot, "paleo", { paleoOnly: true }, files);
}

if (!files.length) {
  console.error("No files to upload.");
  process.exit(1);
}

console.log(`Uploading ${files.length} objects to ${bucket} (processed layers only).`);
for (const f of files) {
  const r = spawnSync(
    "npx",
    ["wrangler", "r2", "object", "put", `${bucket}/${f.key}`, "--file", f.path, "--remote"],
    { stdio: "inherit" }
  );
  if (r.status !== 0) process.exit(r.status || 1);
}
console.log("Done.");
