# Feature flags

Build-time toggles for incomplete or experimental UI live in `PUBLIC_FEATURE_FLAGS` — a single JSON-string env var. Flags are parsed in `src/lib/stores/app.js` and read via `isFeatureEnabled('flag_name')`. Flip a value and restart the dev server to apply.

Current flags:

| Flag             | Default | Effect                                                                                                                                     |
| ---------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `tracker2_nav`   | `false` | Surfaces the in-progress **Tracker2** (Explorer dashboard) link in the main nav.                                                           |
| `facility_loads` | `false` | Enables the loads (data centres) UI on `/facilities`. Can also be enabled per browser session via the `?facility_loads=true` URL override. |
| `tracker_nav`    | `false` | Surfaces the in-progress **Tracker** map page (`/tracker`) in the fullscreen logo dropdown only — never in the main header nav.            |

Toggle locally via `.env`:

```bash
# .env
PUBLIC_FEATURE_FLAGS='{
  "tracker2_nav": true,
  "facility_loads": false
}'
```

Toggle in Doppler (maintainers — apply per environment):

```bash
doppler secrets set PUBLIC_FEATURE_FLAGS='{"tracker2_nav": true}' --config dev
doppler secrets set PUBLIC_FEATURE_FLAGS='{"tracker2_nav": true}' --config stg
doppler secrets set PUBLIC_FEATURE_FLAGS='{"tracker2_nav": true}' --config prd
```

The full JSON object replaces the previous value, so include every flag you want to keep — run `doppler secrets get PUBLIC_FEATURE_FLAGS --plain --config <name>` first to see the current value.
