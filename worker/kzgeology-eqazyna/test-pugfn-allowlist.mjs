import { LAYERS, PUGFN_LAYERS } from "./src/index.js";

const PUGFN_TYPES = [
  "УВ_ПУГФН_Аукцион",
  "УВ_ПУГФН_НацКомпании",
  "Уран_ПУГФН_Добыча"
];

let failed = 0;
const licenseTypes = new Set(LAYERS.map((l) => l.type));
for (const t of PUGFN_TYPES) {
  if (licenseTypes.has(t)) {
    console.error("FAIL PUGFN type should not be in the default /layers bundle:", t);
    failed++;
  }
}
if (PUGFN_LAYERS.length !== 3) {
  console.error("FAIL expected 3 PUGFN layers, got", PUGFN_LAYERS.length);
  failed++;
}
const got = PUGFN_LAYERS.map((l) => l.type);
for (const t of PUGFN_TYPES) {
  if (!got.includes(t)) {
    console.error("FAIL missing PUGFN type", t);
    failed++;
  }
}
for (const l of PUGFN_LAYERS) {
  if (l.group !== "pugfn") {
    console.error("FAIL group should be pugfn", l);
    failed++;
  }
}
if (failed) {
  process.exit(1);
}
console.log("ok: PUGFN types are allowlisted separately from the default license bundle");
