#!/usr/bin/env node
// Upload processed layers to R2. Never uploads PDF/TIFF/KMZ originals.
// Usage: DATA_ROOT=/path/to/site/public node scripts/upload-data.mjs
// Optional: MAPS_JSON=/path/to/maps.json (already patched with cites)
import { spawnSync } from "node:child_process";
import { readdirSync, statSync, existsSync } from "node:fs";
import { relative, join, resolve } from "node:path";

const root = resolve(process.env.DATA_ROOT || "");
if (!root || !existsSync(root)) {
  console.error("Set DATA_ROOT to the local public data folder.");
  process.exit(1);
}
const bucket = process.env.R2_BUCKET || "kzgeology-atlas-tiles";
const skip = /\.(tiff?|kmz|kml|pdf)$/i;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = [];
const mapsJson = process.env.MAPS_JSON ? resolve(process.env.MAPS_JSON) : join(root, "maps.json");
if (existsSync(mapsJson)) files.push({ key: "maps.json", path: mapsJson });
const dataDir = join(root, "data");
if (existsSync(dataDir)) {
  for (const p of walk(dataDir)) {
    if (skip.test(p)) continue;
    const key = relative(root, p).replaceAll("\\", "/");
    files.push({ key, path: p });
  }
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
