# Manx News Digest (Automated RSS Link Site)

This repository builds a simple automated Isle of Man link digest site.

- Ingests RSS/Atom feeds into `site/data.json`
- Publishes a static site from `site/` (GitHub Pages via `gh-pages`)
- Runs automatically on a schedule using GitHub Actions

## Local run

```bash
npm install
npm run ingest
```

Then open `site/index.html` in a browser.

## Deploy (GitHub Pages)

1. Create a new GitHub repository.
2. Upload/push all files in this repo.
3. In GitHub: Settings → Pages
   - Source: Deploy from a branch
   - Branch: `gh-pages` and `/ (root)`
4. Go to Actions, run “Build and Deploy (GitHub Pages)”.

The workflow will:
- fetch feeds
- commit updated `site/data.json`
- deploy the `site/` folder to `gh-pages`

## Add feeds

Edit `feeds.json` and add more objects:
```json
[
  { "name": "Manx Radio", "url": "https://www.manxradio.com/news/rss/" }
]
```
