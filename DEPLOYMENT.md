# Install on Android with free GitHub Pages hosting

No account, repository or deployment has been created by this preparation.

## What is ready

This is a static app: no backend, build, dependencies, Play Store listing or paid hosting is needed. Paths are relative, so it works at `https://USERNAME.github.io/workout-app/` as well as a domain root. The manifest has a stable relative ID, scope, standalone display, names, colours, 192/512 PNG icons and a maskable icon. The simple barbell uses the existing app palette. `.nojekyll` allows direct static publishing.

The existing responsive layout is unchanged: device-width viewport, 650px maximum content width, 48px minimum buttons and 160px exercise counters. Portrait and landscape are permitted. Physical Pixel 10/browser installation testing is still required.

## First publication (when you are ready)

1. Create or sign into a free GitHub account.
2. Create a **public** repository named `workout-app`. GitHub Pages is free with public repositories on GitHub Free. The app code and default routines will be public; your locally saved progress is not uploaded by the app.
3. Put the project source in that repository on `main`. Required website files:
   - `index.html`, `style.css`, `app.js`, `progression.js`, `manifest.json`, `sw.js`, `.nojekyll`
   - `icons/icon-192.png`, `icons/icon-512.png`
   - The SVG icon source, scripts, tests and documentation can also be committed.
   - Keep exported workout JSON files out of the repository. `.gitignore` excludes the app's default export filenames.
4. In the repository, open **Settings → Pages**. Under Build and deployment, choose **Deploy from a branch**, then **main** and **/ (root)**. Save.
5. Wait for GitHub's deployment to finish. Open the URL shown in Pages settings, normally `https://USERNAME.github.io/workout-app/`.
6. Make sure **Enforce HTTPS** is enabled. No custom domain is needed.

You can upload the files through GitHub's website or ask Codex to connect this local project and push it once you have authorised publication. This workspace currently has no usable Git repository metadata, so no commit or remote was prepared here.

Sources: [GitHub publishing source setup](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [GitHub Pages HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https).

## Install on your Pixel 10

1. Open the **HTTPS Pages address in Chrome** on your phone, using your normal profile rather than Incognito. Let the first online load finish.
2. If you want to move existing progress from another address/device, export there and use **Import backup** at the new address. Installing from the same Chrome site/profile uses that site's existing data.
3. Open Chrome's three-dot menu and choose **Add to Home screen → Install**, or **Install app**, depending on the Chrome menu wording. Confirm.
4. Launch **Training** from your home screen. It should open without the normal browser address bar.
5. Complete a test set, close and reopen the app, and confirm it stays completed. Undo that set afterwards.
6. Turn on airplane mode, close and reopen the app, and verify all three days, editing, counters and the manual timer work. Restore connectivity afterwards.

If Chrome does not offer installation, verify the address uses HTTPS and all icon URLs load. On a desktop, Chrome DevTools → Application → Manifest and Service Workers can expose manifest, caching or registration errors. Installation on a physical Pixel is not verified by the automated tests.

## Saved data and updates

Workout settings, progress, timer deadline, theme and exercise order remain in localStorage under the existing `clay-training-v1` key. Closing the app or changing service-worker versions does not clear it. Worker cleanup touches only this app's versioned file caches, never localStorage. The app also requests persistent storage when the browser supports it; the browser decides whether to grant that request.

Storage is local to the browser profile and site origin, not a cloud account. Normal app updates preserve it, but clearing site data, a browser reset or changing the hostname can remove/separate it. Export/import is the way to move from localhost to Pages. Keep using the same published URL; do not clear site data to install an update. Android or the browser can still evict non-persistent data, so storage cannot be guaranteed against device resets or explicit deletion.

## Future releases from Omarchy with Codex

After this project is connected to your repository, an example request is:

> Make [my requested change], keep saved workout data compatible, bump the service-worker release, run the checks, and show me the changes before publishing to my existing GitHub Pages repository.

Once you have reviewed it, ask Codex to commit and push to `main`. GitHub Pages will publish the new version automatically. No Android APK or app store update is necessary.

For every release:

1. Make the changes locally. Keep the storage key/schema compatible unless an explicit data migration is needed.
2. Change `RELEASE` in `sw.js` (currently `v11`) to a new unique value whenever shipped HTML, JS, CSS, manifest or icons change. Include any new offline assets in `ASSETS`.
3. Run `node --check app.js`, `node --check sw.js` and `node tests/pwa.test.cjs`. Also run `node tests/workout.test.cjs` and `node tests/progression.test.cjs` for workout and actual-result behaviour checks.
4. Test in the browser; commit the code, icons and worker together; push to `main` after you approve publication.
5. Wait for the Pages deployment. Open the phone app online so Chrome can check for the new worker. Returning to the app also checks for updates.
6. After the new files download, **close all windows/tabs for this app** and reopen it. On Android remove the app from Recents and close any Chrome tabs showing the same app. A new release waits until the old windows close, so it cannot swap code in the middle of a workout. Merely refreshing an open app may keep the older worker active.
7. Check your saved counts and settings, then test an offline restart.

If a new release cannot finish downloading (for example, the network drops or an icon is missing), the previous installed release continues working. Do not unregister the worker or clear storage as part of normal updates. To roll back code, publish the known-good source with another new worker release number; keep workout data intact.

The cache contains a complete release and is used both online and offline. No remote fonts, libraries, analytics or workout data service is required. [Chrome's service-worker lifecycle documentation](https://developer.chrome.com/docs/workbox/service-worker-lifecycle) explains why updates wait for existing clients to close.

## Local checks

```bash
node --check app.js
node --check progression.js
node --check sw.js
node tests/pwa.test.cjs
node tests/workout.test.cjs
node tests/progression.test.cjs
python3 -m http.server 8000 --bind 127.0.0.1
```

Visit `http://localhost:8000` on the Omarchy desktop. Phone installation needs the published HTTPS URL; an ordinary `http://192.168...` LAN address is not a substitute.

PWA tests cover manifest fields, PNG dimensions, asset existence, relative repository paths, offline launch (including `index.html` and query strings), cache isolation, interrupted installation, root-domain hosting and non-app requests. Workout checks cover persistence/migration, count/undo/reset, editing, themes, ordering, reset recovery, manual rest timers, multi-day workout completion and recovery, workout-based progression, and backup validation/import. These use a simulated DOM/worker rather than a real browser. Chrome/Pixel layout, installability, an actual update lifecycle and airplane-mode startup need the device checks above.

Icon PNGs can be rebuilt with `python3 scripts/generate-icons.py` (standard library only). Their source design is in `icons/icon.svg`; keep the generator's rectangles in sync when changing the SVG. The artwork fits within the maskable safe region so Android can crop the background to its launcher icon shape.
