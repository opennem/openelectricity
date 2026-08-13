# OE-backed data access

Prefer direct server calls in a `+page.server.js` or server helper when data is
not needed by the browser after page load. A new public `/api/*` route needs an
explicit client-side caller and should document its validation and cache policy
near the route.

## Endpoint requirements

- Use the existing `src/routes/api/facilities/[code]/power/+server.js` convention
  as the closest reference.
- Validate parameters and valid metric/interval combinations before calling OE.
- Add suitable `Cache-Control` headers (five minutes is a reasonable default
  for 5-minute data; longer for aggregates).
- Catch `NoDataFound` and return the UI's expected empty shape rather than a
  500. Log and return a useful error response for other failures.
- Use JSDoc types for SDK input and result shapes.

## Date handling

OE expects timezone-naive local timestamps. For a timestamp supplied in UTC,
apply the network offset before formatting: NEM is +10:00 and WEM is +08:00.
Pass date-only URL values through unchanged and reject sub-second ranges.

## Power-series pitfalls

- OE `power` does not support a `30m` interval. Fetch `5m` and aggregate.
- Fuel-tech series may have different starts and lengths. Align them onto a
  common timestamp grid before combining them.
- Some 30-minute source values are step-held with intervening nulls. Aggregate
  with null awareness or bounded forward-fill; do not turn long gaps into zero.
- A net `battery` series can be returned beside charging and discharging series.
  Do not stack all three or battery will be double-counted.
- The API can return the in-progress current bucket and extra/blank fuel-tech
  series; trim or filter deliberately.
