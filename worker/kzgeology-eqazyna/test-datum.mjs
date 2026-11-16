import { pulkovoToWgs84, wgs84ToPulkovo } from "./src/datum.js";

// Reference values from PROJ (EPSG:15865 pipeline), checked 16 Nov 2026.
const cases = [
  [58.518, 50.419, 58.51667585, 50.41940762],
  [67.6, 45.45, 67.59906112, 45.45038156],
  [76.9, 43.2, 76.89938008, 43.20038882],
  [51.2, 51.2, 51.19843964, 51.20033379],
  [87.0, 49.0, 86.99967392, 49.00057935]
];

let failed = 0;
for (const [lon, lat, elon, elat] of cases) {
  const [x, y] = pulkovoToWgs84(lon, lat);
  const dlon = (x - elon) * 111000 * Math.cos((lat * Math.PI) / 180);
  const dlat = (y - elat) * 111000;
  const dist = Math.hypot(dlon, dlat);
  const [bLon, bLat] = wgs84ToPulkovo(x, y);
  const back = Math.hypot((bLon - lon) * 111000 * Math.cos((lat * Math.PI) / 180), (bLat - lat) * 111000);
  const ok = dist < 0.15 && back < 0.05;
  if (!ok) failed++;
  console.log(
    `${ok ? "ok" : "FAIL"} ${lon},${lat} -> ${x.toFixed(8)},${y.toFixed(8)}  err=${dist.toFixed(3)}m  back=${back.toFixed(3)}m`
  );
}
if (failed) {
  console.error(failed + " datum checks failed");
  process.exit(1);
}
console.log("all datum checks passed");
