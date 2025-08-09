# CarySkill — Borrow-a-Skill (Login + Autofill, Pages-ready)

- Skill Swap–style UI
- US/Canada city→coords + seeded data
- **Local login (no backend)**: gates Add/Requests; autofills from Profile
- GitHub Pages deploy via Actions (with index.html entry guard)
- Uses `npm install` in CI (no lockfile required)

## Run
```bash
npm install
npm run dev
```

## Deploy (GitHub Pages)
Push to `main`. Workflow at `.github/workflows/deploy.yml` builds and deploys.
Live URL: `https://chreid1973.github.io/caryskill/`
