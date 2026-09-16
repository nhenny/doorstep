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

  // Default map center — Dubuque, IA. Swap for wherever you're canvassing.
  MAP_CENTER: { lat: 42.5006, lng: -90.6648 },
  MAP_ZOOM: 15,

  // Optional. A Google Maps "Map ID" (Cloud Console -> Maps Management ->
  // Map IDs) turns on vector rendering, which lets the map itself rotate
  // to face the direction the user is walking during live location
  // tracking. Leave blank and everything still works — the map just stays
  // north-up, with a rotating arrow marker showing facing direction instead.
  MAP_ID: ""
};
