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

  // Optional. A public government address locator (an Esri "GeocodeServer")
  // for the area being canvassed. When set, every address is looked up here
  // FIRST — real, rooftop- or address-range-level address-point data —
  // before ever falling back to Google's geocoder. This is the same fix
  // used on the Alliant utility-map project: authoritative local address
  // data beats a general geocoder for addresses Google's index doesn't have.
  // Currently set to the Houston-Galveston Area Council's regional "StarMap"
  // locator — despite the URL living under Harris County's GIS server, its
  // own data (Loc_name "HGAC_StarMap_R") actually covers the whole 13-county
  // Houston-Galveston metro (Harris, Montgomery, Fort Bend, Brazoria,
  // Galveston, Liberty, Chambers, Waller, Austin, Colorado, Matagorda,
  // Walker, and Wharton counties), no API key needed. Still, some very rural
  // or unincorporated roads aren't in even this dataset and fall through to
  // Google — if you're regularly missing addresses in one particular county,
  // that county's own GIS department may publish a more complete
  // GeocodeServer worth adding ahead of (or instead of) this one. Leave
  // blank to skip this and use Google only.
  LOCATOR_URL: "https://www.gis.hctx.net/arcgis/rest/services/Locator/Harris_Co_GCS_Composite/GeocodeServer/findAddressCandidates",

  // Optional. A Google Maps "Map ID" (Cloud Console -> Maps Management ->
  // Map IDs) turns on vector rendering, which lets the map itself rotate
  // to face the direction the user is walking during live location
  // tracking. Leave blank and everything still works — the map just stays
  // north-up, with a rotating arrow marker showing facing direction instead.
  MAP_ID: ""
};
