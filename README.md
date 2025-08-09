# CarySkill — Borrow-a-Skill (Pages-ready)

Skill Swap–style app with US/Canada geocoding and seeded data.  
Auto-deploys to **GitHub Pages** on push to `main`.

## Run locally
```bash
npm install
npm run dev
```

## Open in StackBlitz
[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/chreid1973/caryskill)

## Deploy (GitHub Pages)
- `vite.config.js` already sets `base: '/caryskill/'`
- Workflow is at `.github/workflows/deploy.yml`
- After first push, go to **Settings → Pages** and set Source: **GitHub Actions**

Live URL (after deploy):  
`https://chreid1973.github.io/caryskill/`
