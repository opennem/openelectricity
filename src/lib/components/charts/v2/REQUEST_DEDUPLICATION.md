# Chart request deduplication

Every rendered chart owns a `ChartDataManager`. The manager holds that chart's processed rows,
visible range, loading state and lifecycle. Managers do not share presentation state.

The module does share raw API requests. This prevents two charts that need the same source data from
making the same browser request independently.

## Request identity

Before fetching, `canonicalChartRequestKey()` converts the URL into a stable signature:

1. The route or absolute origin and path identify the resource.
2. Query parameters are sorted by name and value, so construction order does not matter.
3. Repeated parameters such as `facility_code` are order-independent.
4. Moving `date_start` and `date_end` values at `5m` and `1h` are floored to their data bucket.

The final point means two live charts mounted a few seconds apart share one request while they are in
the same data interval. Crossing the next interval boundary creates a new signature and permits a
fresh request. The first consumer's original URL is sent to the API; normalisation changes only the
coordinator key.

Region, network, metric, interval, materially different range, route and facility selection remain
part of the signature. Those requests are not combined.

## Request lifecycle

The coordinator has two module-level maps:

- `inFlightFetches` holds the promise and `AbortController` for a request currently on the network.
- `completedResponses` is a 30-entry least-recently-used cache of successful raw responses.

For each request:

1. A completed response with the same signature is returned immediately.
2. Otherwise, an in-flight request with the same signature is reused.
3. Otherwise, one browser `fetch()` is started and registered under the signature.
4. When it succeeds, the raw `json.response` payload is cached for five minutes.
5. Each manager independently transforms that raw response for its chart or metric.

The five-minute lifetime matches the chart API routes' `Cache-Control: public, max-age=300` policy.
Failures and aborted requests are not added to the completed-response cache, so retries reach the
network.

The sharing scope is one loaded JavaScript module, normally the current browser tab. HTTP caching can
provide additional reuse outside that scope, but this coordinator does not share memory between
tabs, users or Cloudflare Worker isolates.

## Cancellation

Each manager waiting on a shared request holds one reference. Disposing a chart releases only its own
reference and rejects that manager's wait with `AbortError`. The underlying network request continues
while another manager still needs it. It is aborted only after the final consumer releases it.

This allows a chart to be removed or reconfigured without interrupting another chart using the same
response.

## Diagnostics

`getSharedFetchStats()` returns a snapshot with:

- `network`: new browser requests started.
- `inFlightReuse`: consumers attached to an existing request.
- `responseCacheReuse`: consumers served from the completed-response cache.
- `inFlight`: requests currently running.
- `cachedResponses`: successful responses currently retained.

Tests use these counters to assert the coordinator path. To see decisions in the browser console,
enable the opt-in diagnostic and reload:

```javascript
localStorage.setItem('oe:debug-chart-fetch', '1');
```

The console then reports `[ChartDataManager] network`, `inFlightReuse` or `responseCacheReuse` with
the canonical signature. Disable it with:

```javascript
localStorage.removeItem('oe:debug-chart-fetch');
```

## Invariants

- Only raw API responses are shared; processed chart data and interaction state are not.
- Cache keys describe data inputs, never chart titles, colours, grouping or presentation.
- A failed response must remain retryable.
- One consumer cannot cancel a request still used by another consumer.
- Cache size and lifetime remain bounded.
