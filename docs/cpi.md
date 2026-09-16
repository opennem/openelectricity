# Australian CPI for regional prices

Electricity values come from the OE API. Inflation adjustment is an explicit
exception: CPI comes directly from the Australian Bureau of Statistics (ABS).

## Source and calculation

The updater requests the official [ABS Data API](https://www.abs.gov.au/statistics/application-programming-interfaces-apis/data-api-user-guide/tutorials-links):

```text
https://data.api.abs.gov.au/rest/data/ABS,CPI,2.0.0/1.10001.10.50.Q
Accept: application/vnd.sdmx.data+json
```

This selects index numbers (`1`), All Groups CPI (`10001`), original/unadjusted
(`10`), Australia (`50`), quarterly (`Q`). The initial snapshot covers 1948 Q3
through 2026 Q2. Its index base is September 2025 = 100. The index base is distinct
from the chart's reference dollars: the chart uses the latest available quarter.
The series and publication are attributed to ABS in the chart.

Each month uses the CPI index for its calendar quarter. Multiply its nominal
market value by `latest CPI / that quarter's CPI`, sum the adjusted dollar values
across the selected period, then divide by summed energy. National comparisons
use the same Australian CPI for each region. Ratios are not averaged. Months
without published CPI remain blank; no extrapolation or nominal substitution.

The Prices picker has one volume-weighted price entry. The existing Toggle
component selects inflation adjustment, enabled for newly selected charts.
Nominal selections retain `price` in the URL; adjusted ones use `price_real`.
Tables, CSV, workbook and PNG exports follow the chosen presentation and label
the reference month. Fuel-specific market values remain nominal.

## Refresh and storage

`.github/workflows/cpi.yml` checks daily at 1 am in `Australia/Melbourne`, following
daylight saving automatically, and supports manual dispatch.
Daily checks catch monthly releases, publication delays and historical revisions;
quarterly observations are added when ABS publishes a completed quarter. GitHub
schedules may be delayed, so the chart always displays the actual reference date.

The script validates the selected SDMX dimensions, unit, base-period metadata,
positive index numbers, chronological uniqueness, uninterrupted quarterly history
and complete-quarter dates. Updates cannot shorten the bundled or stored history.
Full revised or rebased series replace the previous series together. No splice
between differently based series is permitted. Responses are size-limited and
requests time out. Validation, upstream and KV-read failures stop publication.

Cloudflare KV stores one complete JSON snapshot under `abs-cpi-quarterly-v1`,
without expiry. Unchanged observations/base do not cause a write; `fetchedAt`
records when the stored dataset was fetched, not every unchanged daily check.
The workflow has read-only repository permissions: it neither commits data nor
redeploys the website. KV updates are eventually consistent; the server uses a
one-hour KV read cache.

The website reads KV through `platform.env.CPI_DATA` in the Tracker server loader.
It never calls ABS on page loads. A missing binding, missing key, invalid dataset
or KV outage falls back to `src/lib/server/data/abs-cpi.json`, the bundled ABS
snapshot. The displayed reference month makes an older fallback explicit. The
fallback can lack newer quarters already stored in KV, but never substitutes
nominal prices or fabricates CPI.

## Cloudflare and GitHub setup

The app's Cloudflare configuration is managed in the dashboard, as documented in
[development](development.md). The CPI namespace is dedicated to this public data:

- OpenNEM account: `17399e149aeaa08c0c7bbb15382fa5c3`
- Namespace: `openelectricity-cpi` (`9841ab0627c74d9c873d5960e8d73b74`)
- Pages project: `openelectricity`
- Binding name: `CPI_DATA`, for production and preview

The namespace was created and seeded during implementation. Binding changes take
effect with a subsequent deployment; this setup does not itself deploy the site.

Set repository variables `CLOUDFLARE_ACCOUNT_ID` and `CPI_KV_NAMESPACE_ID` to the
IDs above. Add a repository secret named `CPI_CLOUDFLARE_API_TOKEN`: a dedicated
Cloudflare API token with **Account → Workers KV Storage → Edit**, scoped to the
OpenNEM account. Do not use a local Wrangler OAuth token for scheduled jobs.
Normal site requests do not need this token, only the KV binding.

Once the workflow is on the default branch and the secret is configured, run
**Refresh Australian CPI → Run workflow**. An unchanged run reports `unchanged`;
a changed or initial run reports `published to KV`. If an update fails, inspect
the workflow log; the old KV snapshot remains usable. Never delete the existing
key to retry an update. Repair the source/credentials and rerun the workflow.

## Contributor and maintainer commands

No credentials are needed for local chart development: `pnpm run dev` uses the
bundled snapshot. A read-only ABS check is:

```sh
pnpm cpi:refresh
```

To update the bundled fallback for review:

```sh
pnpm cpi:refresh --output src/lib/server/data/abs-cpi.json
```

To publish to KV, contributors can set the three private updater variables in a
local `.env` (see `.env.example`) and run:

```sh
pnpm cpi:refresh --publish
```

The command reads `.env` with Node's native environment-file support. Maintainers
can store those same names in Doppler and run:

```sh
doppler run -- pnpm cpi:refresh --publish
```

Doppler is optional. GitHub uses its repository variables/secret directly. Keep
the API token private; never put it in a `PUBLIC_*` variable or commit it.

Tests cover out-of-order SDMX observations, series validation, missing/future
quarters, revisions, unchanged updates, failures, KV fallback and price scaling.
The comparison browser test covers default adjustment, keyboard switching,
exports, history, reload and mobile layout.
