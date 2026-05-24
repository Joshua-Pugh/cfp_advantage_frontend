# Product A Frontend Deployment Notes

## GitHub Pages

The public frontend is static and calls the Render API. It must never contain `DATABASE_URL`, CFBD credentials or odds credentials.

1. Publish the contents of `frontend/` through GitHub Pages.
2. Keep `frontend/CNAME` set to `cfpadvantage.com`.
3. In the DNS provider, configure the apex/custom-domain records required by GitHub Pages and enable HTTPS after GitHub verifies the domain.
4. Change `frontend/config.js` for production:

```js
window.CFP_ADV_CONFIG = {
  API_BASE_URL: "https://YOUR-RENDER-SERVICE.onrender.com",
  APP_VERSION: "v3.6",
};
```

5. Set the actual GitHub Pages origin in Render's `ALLOWED_ORIGINS` when it is known.

## Data Boundary

- Matchup Preview and Team Board read Product A API responses.
- Football Intelligence Explorer reads schedule, record and recap API responses.
- Postseason is separated from regular-season display through `display_week` and `schedule_section`.
- No frontend file connects directly to Neon.

## Local Test

Leave `API_BASE_URL` as `http://127.0.0.1:8000` while using VS Code Live Server locally.
