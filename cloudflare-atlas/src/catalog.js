/* Catalog helpers shared by the Worker routes and the SEO pages.
   The public site never sees paleogeographic or palinspastic maps. */

export const PALEO_RE = /^data\/paleo-maps-/i;

export function isPaleoGroup(g) {
  const n = String((g && g.name) || "");
  return /^paleo\s*:/i.test(n) || /palinspastic|paleogeograph/i.test(n);
}

export function isPaleoPath(pathname) {
  const p = pathname.replace(/^\/+/, "");
  return PALEO_RE.test(p);
}

export function filterMaps(data) {
  if (!data || !Array.isArray(data.groups)) return data;
  return {
    ...data,
    groups: data.groups
      .filter((g) => !isPaleoGroup(g))
      .map((g) => ({
        ...g,
        maps: (g.maps || []).filter((m) => !isPaleoPath(m.file || "")),
      })),
  };
}
