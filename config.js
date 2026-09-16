// Doorstep — configuration
//
// 1. Go to https://console.cloud.google.com/ , create (or pick) a project.
// 2. APIs & Services -> Library -> enable "Maps JavaScript API".
// 3. APIs & Services -> Credentials -> Create credentials -> API key.
// 4. Restrict the key: "Application restrictions" -> HTTP referrers ->
//    add your Netlify URL (e.g. https://your-site.netlify.app/*) and,
//    once you have one, your real domain.
// 5. Paste the key below and redeploy.
//
// Leaving this blank is fine for now — the app falls back to a
// placeholder preview map so the rest of the UI still works.

window.DOORSTEP_CONFIG = {
  GOOGLE_MAPS_API_KEY: "AIzaSyDp2jU9uTWfJYS5NakI6Tn2OukZgO5Tk_Q",

  // Default map center — Dubuque, IA. Swap for wherever you're canvassing.
  MAP_CENTER: { lat: 42.5006, lng: -90.6648 },
  MAP_ZOOM: 15
};
