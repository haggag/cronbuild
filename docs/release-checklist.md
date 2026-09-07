# Release checklist

## Local artifact gates

- [x] Run `npm ci` with Node 24.20.0 and the committed lockfile.
- [x] Pass typecheck, Oxlint, Prettier, unit/component tests, production build, browser suite, Lighthouse, and npm audit.
- [ ] Review both themes at 320, 390, 768, 1024, and 1440 pixels, enlarged text/zoom, landscape, keyboard focus, and reduced motion.
- [x] Inspect the built artifact: no scaffold assets, server code, secrets, runtime third-party URLs, sourcemaps, or service worker; required static documentation and metadata exist.
- [ ] Complete a screen-reader smoke check, and a real Safari/iOS check when available. Record any unperformed checks honestly.
- [x] Update `validation-results.md` with exact evidence, environment, and remaining release limitations.

## Cloudflare Pages setup and preview

Publishing requires authorization and access to the intended Cloudflare account/project. This repository does not automatically deploy.

1. Connect the intended repository and branch to Cloudflare Pages. Root: repository root. Build: `npm run build`. Output: `dist`. Node: 24.20.0, consistent with `.nvmrc`; explicitly set `NODE_VERSION` in build settings if needed. No Functions or application runtime secrets.
2. Deploy the verified source to a preview. Record its URL and deployment/source revision.
3. Open HTTPS `/` and a fresh context at `/#0_2_*_*_1-5`. Verify restoration, real worker calculation, page refresh, Local/UTC, light/dark persistence, and each clipboard action.
4. Inspect actual response headers: CSP must permit same-origin scripts/styles/workers while blocking foreign connections, framing, objects, and form submissions. Confirm nosniff, no-referrer, permissions policy, immutable hashed assets, and revalidation for HTML/documentation. Check the console for CSP violations.
5. Request `/llms.txt`, `/cronbuild-guide.md`, `/robots.txt`, `/sitemap.xml`, `/favicon.svg`, and `/theme-init.js`. Text documentation must be actual text rather than an SPA fallback, and content types must match with nosniff enabled. Open the guide’s example links.
6. Run the short browser smoke checks on the deployed preview. Test after assets load with the network unavailable; do not promise offline reload.

## Production

1. Confirm `https://cronbuild.com/` is the intended canonical/custom origin and that DNS/TLS are ready. Confirm who can approve the public release.
2. Promote the verified preview/source in the intended Pages project. Record the production URL and deployment ID.
3. Repeat HTTPS, hash restoration, worker, clipboard, documentation, and header checks on the custom domain. Do not treat a successful local build as deployment proof.

## Rollback

Use Cloudflare Pages deployment history to roll back production to the previous known-good successful deployment. Record that deployment before release. Recheck the custom domain after rollback. HTML/documentation should revalidate; hashed assets retain immutable cache entries safely because URLs are content-addressed. Avoid deleting assets belonging to a still-active deployment. If external caching overrides the configured policy, invalidate only affected HTML/documentation and verify the rollback again.
