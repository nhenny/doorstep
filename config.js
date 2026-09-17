// Doorstep — configuration
//
// DO NOT put a real API key in this file. It's committed to git, and
// anything committed here is permanently visible to anyone with read
// access to the repo (GitHub's secret scanning will flag it too).
//
// The real key lives in Netlify instead:
//   Site configuration -> Environment variables -> add GOOGLE_MAPS_API_KEY
// scripts/inject-config.js reads that variable and rewrites the line
// below at deploy time, only inside Netlify's build — it never touches
// git. See README.md for the full setup, including how to get a key.
//
// Leaving this blank is fine — the app falls back to a placeholder
// preview map so the rest of the UI still works without one.

window.DOORSTEP_CONFIG = {
  GOOGLE_MAPS_API_KEY: "",

  // Default map center — Houston, TX. Swap for wherever you're canvassing.
  MAP_CENTER: { lat: 29.7604, lng: -95.3698 },
  MAP_ZOOM: 15,

  // Appended to any address that's missing a state abbreviation or ZIP code
  // before we geocode it — addresses copied from a household list often
  // come without a city or state and Google's Geocoder can't disambiguate
  // them otherwise. Swap for wherever you're canvassing.
  DEFAULT_REGION: "Houston, TX",

  // Optional. Public government address locators (Esri "GeocodeServer"s) for
  // the area being canvassed. Every URL here is queried FIRST, IN PARALLEL,
  // before ever falling back to Google's geocoder — this is the same fix
  // used on the Alliant utility-map project: authoritative local address
  // data beats a general geocoder for addresses Google's index doesn't have.
  // A second or third entry only adds coverage (the best hit across all of
  // them wins), it never slows a lookup down waiting on the ones that come
  // up empty. Leave the array empty to skip this and use Google only.
  //
  // All three entries below are free/no-key and live-tested working from
  // this app's own domain (no CORS issues). They turned out to be three
  // different mirrors of the SAME underlying Houston-Galveston Area
  // Council regional composite (13 counties: Harris, Montgomery, Fort
  // Bend, Brazoria, Galveston, Liberty, Chambers, Waller, Austin,
  // Colorado, Matagorda, Walker, Wharton) — each already returns rooftop-
  // level "PointAddress" matches where the data exists, not just
  // road-interpolated ones, so they're mostly redundant with each other
  // rather than each adding new coverage. Kept as parallel backups anyway
  // (one occasionally turns up a slightly different snapshot than another,
  // and it costs nothing but a parallel network call), with the original
  // Harris County GIS server listed first since it's the one already
  // proven in production:
  //   1. Harris County's GIS server, composite locator.
  //   2. HGAC's own 911 point-address locator (gis.h-gac.com).
  //   3. Harris County's GIS server, "StarMap" composite locator — a
  //      slightly different build of the same regional data.
  // None of these three cover every rural/unincorporated road — addresses
  // like "4951 County Road 152" return nothing from any of them, meaning
  // that specific road genuinely isn't in this dataset, not that the
  // request failed. Other TX county GIS departments were checked and
  // rejected as additional sources: Fort Bend County's GIS server is
  // CORS-blocked from a browser; Liberty, Chambers, Waller, Walker, San
  // Jacinto, Grimes, Wharton, Austin, Colorado, and Matagorda counties
  // don't appear to publish a standalone GeocodeServer of their own beyond
  // what's already folded into the HGAC composite above. If you're
  // regularly missing addresses in one particular county, check whether
  // that county's GIS/CAD department has added a public GeocodeServer
  // since, and append it here.
  LOCATOR_URLS: [
    "https://www.gis.hctx.net/arcgis/rest/services/Locator/Harris_Co_GCS_Composite/GeocodeServer/findAddressCandidates",
    "https://gis.h-gac.com/arcgis/rest/services/HGAC_911/HGAC_911_Point_Addr_Locator/GeocodeServer/findAddressCandidates",
    "https://www.gis.hctx.net/arcgis/rest/services/Locator/StarMap_composite_Locator/GeocodeServer/findAddressCandidates"
  ],

  // Optional. Montgomery County's own E-911 address-point database (not a
  // geocoder — a raw table of real addresses with exact coordinates, so
  // it's queried by house number + street rather than a text search).
  // Mainly Montgomery County, with a little edge coverage into Liberty,
  // Harris, Walker, Grimes, San Jacinto, and Waller near the county lines.
  // Free, no key, live-tested working. Leave blank to skip.
  MONTGOMERY_POINTS_URL: "https://services1.arcgis.com/PRoAPGnMSUqvTrzq/arcgis/rest/services/MCECD_Address_Points_view/FeatureServer/1/query",

  // Optional. A Google Maps "Map ID" (Cloud Console -> Maps Management ->
  // Map IDs) turns on vector rendering, which lets the map itself rotate
  // to face the direction the user is walking during live location
  // tracking. Leave blank and everything still works — the map just stays
  // north-up, with a rotating arrow marker showing facing direction instead.
  MAP_ID: ""
};
