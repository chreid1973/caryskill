# CarySkill — rollback baseline WITH white-page guard

This matches your last working version (login + autofill, browse, inbox, profile) and adds CI guards to avoid the white-page issue.

- Vite base: `/caryskill/`
- GitHub Actions: builds `dist/`, verifies `assets/index-*.js` is referenced, adds `.nojekyll`, deploys artifact
- Console prints `[boot] App mounting` on load

## Run locally
npm install
npm run dev

## Deploy
Commit to `main` — workflow will build & publish to Pages. Check the "Verify bundle path" step output to confirm.
