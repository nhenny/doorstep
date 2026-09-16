# Doorstep

Early dashboard prototype for a canvassing app: a walk-list / area-list
picker over a turf map. Plain HTML/CSS/JS, no build step.

## Deploy to Netlify (fastest way to get a live URL)

**Option A — drag and drop (no account needed to try it):**
1. Go to https://app.netlify.com/drop
2. Drag this whole `doorstep-app` folder onto the page.
3. Netlify gives you a live `*.netlify.app` URL immediately.
   (Create a free Netlify account and "claim" the site if you want to keep
   it, manage it later, or use a custom domain.)

**Option B — connect it to a Git repo (better for ongoing work):**
1. Push this folder to a new GitHub repo.
2. In Netlify: Add new site -> Import an existing project -> pick the repo.
3. Build command: none. Publish directory: `.` (already set in
   `netlify.toml`). Every push to the repo auto-deploys from then on.

## Add the real map

The map falls back to a placeholder preview until you add a Google Maps
API key. See the comments at the top of `config.js` for the exact steps
(Google Cloud Console -> enable "Maps JavaScript API" -> create + restrict
an API key -> paste it into `config.js`). Restrict the key to your
Netlify URL so it can't be used elsewhere if it leaks.

## What's real vs. placeholder right now

- Real: the walk list -> area list drop-down structure and its behavior.
- Placeholder: the list names, house counts, and pin locations — all
  example data until this connects to an actual voter-file backend.
- Placeholder until a key is added: the live map (falls back to a
  stylized preview).

## Files

- `index.html` — page structure
- `style.css` — all styling and the light/dark theme tokens
- `config.js` — your Google Maps API key and map center/zoom
- `app.js` — dropdown logic, example data, and the map integration
