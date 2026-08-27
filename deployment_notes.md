# CFP Advantage Frontend Deployment Notes

## GitHub Pages

The public frontend is static and calls the Render API. It must never contain `DATABASE_URL`, CFBD credentials or odds credentials.

1. Publish the contents of `frontend/` through GitHub Pages.
2. Keep `frontend/CNAME` set to `cfpadvantage.com`.
3. In the DNS provider, configure the apex/custom-domain records required by GitHub Pages and enable HTTPS after GitHub verifies the domain.
4. Change `frontend/config.js` for production:

```js
window.CFP_ADV_CONFIG = {
  API_BASE_URL: "https://YOUR-RENDER-SERVICE.onrender.com",
  APP_VERSION: "v4.0.28",
  USE_STATIC_FALLBACK: false,
  ENVIRONMENT: "production",
};
```

5. Set `USE_ARTIFACT_FALLBACK=false` in Render so the production API never serves local generated artifacts.
6. Set the actual GitHub Pages origin in Render's `ALLOWED_ORIGINS` when it is known.

## Data Boundary

- Matchups, Teams, Bracket Room, Recaps, Metrics, and News read CFP Advantage API responses.
- Team schedules, records, comparison stats, contextual profiles, and recaps are loaded through the API.
- Postseason is separated from regular-season display through `display_week` and `schedule_section`.
- No frontend file connects directly to Neon.

## Local Test

For local development only, use:

```js
window.CFP_ADV_CONFIG = {
  API_BASE_URL: "http://127.0.0.1:8000",
  APP_VERSION: "v4.0.28",
  USE_STATIC_FALLBACK: true,
  ENVIRONMENT: "local",
};
```

Production must keep `USE_STATIC_FALLBACK: false`.
