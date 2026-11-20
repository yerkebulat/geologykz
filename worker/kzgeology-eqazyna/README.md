# kzgeology-eqazyna

Cloudflare Worker that relays the public solid-mineral (TPI) license and contract layers from the Unified Subsoil Use Platform (minerals.e-qazyna.kz) to [kzgeology.com](https://kzgeology.com).

- No secrets. Only allowlisted layer types and the public click API are proxied.
- Coordinates are reprojected from EPSG:4284 (Pulkovo 1942) to EPSG:4326 (WGS 84) with EPSG:15865, the Kazakhstan geocentric translation. This is a real datum shift of tens of metres, not a copy of lon/lat.
- Layer GeoJSON is cached for 12 hours. CORS is limited to kzgeology.com, www, the GitHub Pages origin yerkebulat.github.io, atlas.kzgeology.com, and localhost.
- Official hydrocarbon and uranium PUGFN layers are available at `/layers?group=pugfn` or `/layers?type=…`. They are not included in the default `/layers` bundle, and they are not open for solid-mineral (TPI) exploration licenses.

```
npx wrangler deploy
```

Public URL: `https://kzgeology-eqazyna.yerkebulantazabek.workers.dev`
