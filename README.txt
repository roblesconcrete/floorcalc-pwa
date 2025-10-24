# FloorCalc PWA (starter pack)

## How to use
1) Put your existing calculator HTML **inside `<main id="app">...</main>`** in `index.html`.
   - Keep the `<head>` as-is so PWA works.
   - If you have your own JS/CSS files, add `<script src="..."></script>` and `<link rel="stylesheet" href="...">`.
   - Add those file names to the `ASSETS` array in `service-worker.js` for offline caching.

2) Serve locally for testing (any static server) or host on **GitHub Pages / Netlify** (free).
   - GitHub Pages: create a repo, upload these files, Settings → Pages → Deploy from main `/`.
   - Netlify: drag-and-drop this folder into app.netlify.com.

3) On your phone:
   - **Android (Chrome):** Menu → Install app (or the 'Install' button appears).
   - **iPhone (Safari):** Share → Add to Home Screen.

4) Icons
   - Replace `icons/icon-*.png` with your logo versions when ready (keep the same sizes).

Enjoy! If you add more files, add them to the ASSETS list for offline capability.
