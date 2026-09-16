// Runs during the Netlify build only (see netlify.toml). Rewrites the
// GOOGLE_MAPS_API_KEY line in config.js using the GOOGLE_MAPS_API_KEY
// environment variable set in Netlify's Site configuration ->
// Environment variables. The key never has to be committed to git —
// this just stamps it into the built output for that one deploy.
//
// Locally (no env var set) this is a harmless no-op: config.js keeps
// its blank key and the app falls back to the placeholder preview map.

const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "..", "config.js");
const key = process.env.GOOGLE_MAPS_API_KEY || "";

let content = fs.readFileSync(configPath, "utf8");

const pattern = /GOOGLE_MAPS_API_KEY:\s*".*?"/;
if (!pattern.test(content)) {
    console.error("inject-config: couldn't find GOOGLE_MAPS_API_KEY line in config.js — leaving it untouched.");
    process.exit(0);
}

content = content.replace(pattern, 'GOOGLE_MAPS_API_KEY: "' + key + '"');
fs.writeFileSync(configPath, content);

console.log(
    key
      ? "inject-config: GOOGLE_MAPS_API_KEY set from Netlify environment variable."
      : "inject-config: no GOOGLE_MAPS_API_KEY environment variable set — deploying with the placeholder preview map."
  );
