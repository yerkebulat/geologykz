/**
 * EPSG:4284 (Pulkovo 1942, Krassovsky 1940) -> EPSG:4326 (WGS 84)
 * using EPSG:15865, the Kazakhstan geocentric translation
 * TOWGS84[15.8, -154.4, -82.3, 0, 0, 0, 0]. This is a real datum shift,
 * not a copy of lon/lat.
 */

const KRASS = { a: 6378245, f: 1 / 298.3 };
const WGS84 = { a: 6378137, f: 1 / 298.257223563563 };
const DX = 15.8, DY = -154.4, DZ = -82.3;

function ellip(e) {
  const f = e.f, a = e.a;
  const e2 = f * (2 - f);
  const b = a * (1 - f);
  const ep2 = e2 / (1 - e2);
  return { a, b, e2, ep2 };
}

const KR = ellip(KRASS);
const WG = ellip(WGS84);

function geodeticToEcef(lonDeg, latDeg, el) {
  const lon = (lonDeg * Math.PI) / 180;
  const lat = (latDeg * Math.PI) / 180;
  const s = Math.sin(lat), c = Math.cos(lat);
  const N = el.a / Math.sqrt(1 - el.e2 * s * s);
  return [(N) * c * Math.cos(lon), (N) * c * Math.sin(lon), (N * (1 - el.e2)) * s];
}

function ecefToGeodetic(x, y, z, el) {
  const p = Math.hypot(x, y);
  const lon = Math.atan2(y, x);
  const theta = Math.atan2(z * el.a, p * el.b);
  const st = Math.sin(theta), ct = Math.cos(theta);
  const lat = Math.atan2(z + el.ep2 * el.b * st * st * st, p - el.e2 * el.a * ct * ct * ct);
  return [(lon * 180) / Math.PI, (lat * 180) / Math.PI];
}

export function pulkovoToWgs84(lon, lat) {
  const [x, y, z] = geodeticToEcef(lon, lat, KR);
  return ecefToGeodetic(x + DX, y + DY, z + DZ, WG);
}

export function wgs84ToPulkovo(lon, lat) {
  const [x, y, z] = geodeticToEcef(lon, lat, WG);
  return ecefToGeodetic(x - DX, y - DY, z - DZ, KR);
}

function walkCoords(coords, fn) {
  if (typeof coords[0] === "number") {
    const [lon, lat, ...rest] = coords;
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return coords;
    const [x, y] = fn(lon, lat);
    return rest.length ? [x, y, ...rest] : [x, y];
  }
  return coords.map((c) => walkCoords(c, fn));
}

export function transformGeometry(geom, fn) {
  if (!geom) return geom;
  if (geom.type === "GeometryCollection") {
    return { type: "GeometryCollection", geometries: (geom.geometries || []).map((g) => transformGeometry(g, fn)) };
  }
  if (!geom.coordinates) return geom;
  return { type: geom.type, coordinates: walkCoords(geom.coordinates, fn) };
}

export function transformFeatureCollection(fc, fn) {
  const features = (fc.features || []).map((f) => ({
    type: "Feature",
    id: f.id,
    properties: f.properties || {},
    geometry: transformGeometry(f.geometry, fn)
  }));
  return { type: "FeatureCollection", features };
}
