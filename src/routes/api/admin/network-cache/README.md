# Admin network-cache endpoints

Authenticated inspection and refresh of the `/api/network/data` keyed SWR edge
cache (`src/lib/server/keyed-swr-cache.js`). The cache makes historical tracker
charts fast but its contents invisible; these endpoints and the Studio
dashboard at `/studio/cache/network-data` (the documented browser caller,
`src/routes/(main)/studio/cache/network-data/`) let maintainers see which
historical data visitors may receive, inspect complete cached responses,
identify stale entries and refresh corrected upstream data — without purging
the whole Cloudflare zone.

## How the registry works

A Cloudflare D1 database (bound as `CACHE_REGISTRY`) stores metadata about
every successful Cache API write; the full responses stay in `caches.default`.
The keyed SWR cache exposes best-effort lifecycle hooks (`onStored`,
`onRefreshError`) that `src/lib/server/network-data.js` wires to the registry
(`src/lib/server/network-cache-registry.js`) through `waitUntil`. Registry
failures never delay or break the public tracker response, and rows older than
30 days are pruned during successful writes.

Two views of freshness matter:

- **Projected (registry)** — computed from the recorded storage time and the
  entry's freshness period (five minutes for live windows, six hours for
  historical, `expired` past the seven-day edge-retention TTL). Cloudflare may
  evict entries earlier, so this is only an expected state; the list endpoint
  cannot prove that any colo still holds the payload.
- **Local (this data centre)** — what the Cache API of the colo serving the
  request actually holds. Cache API entries are data-centre-local: an entry
  registered by one location may be absent, older or newer elsewhere, and a
  refresh replaces only the serving colo's entry. Other locations keep theirs
  until their own stale-while-revalidate schedule replaces them.

## Endpoints

All three require a Clerk admin bearer token (`verifyAdmin`,
`src/lib/auth/clerk-server.js`): 401 unauthenticated, 403 authenticated
non-admin. All respond `Cache-Control: no-store`, and all return 503 when the
`CACHE_REGISTRY` binding is not configured (for example in `vite dev`, which
also bypasses the edge cache entirely).

### `GET /api/admin/network-cache`

Lists registry entries, newest storage time first. Query params: `region`,
`metric`, `interval`, `window` (`live|historical`), `freshness`
(`fresh|stale|expired`), `q` (substring of the canonical query), `page`
(default 1) and `pageSize` (default 25, max 100). Unknown filter values are
400s. Returns `{ items, total, page, totalPages, now }`; each item carries the
registry row (camel-cased) plus projected `status`, `ageMs`, `freshUntil` and
`expiresAt` computed at `now`.

### `GET /api/admin/network-cache/entry?key=<full synthetic key>`

Reads the exact entry from the current data centre's Cache API and returns its
complete JSON payload with local freshness metadata. Never populates the cache
on a miss — a miss is an expected colo-local state and returns 200
`{ found: false, key }`. Malformed or non-canonical keys (wrong prefix,
reordered or extra parameters) are 400s.

### `POST /api/admin/network-cache/refresh` — body `{ "key": "…" }`

Accepts a **registered** key only (unknown keys are 404s), re-validates and
canonicalises its parameters, fetches fresh upstream data and replaces the
current data centre's entry through the same cache instance as the public
endpoint (shared in-flight de-duplication and lifecycle hooks). The edge write
and registry upsert complete before the response resolves. Success returns 200
`{ ok: true, value, stored, storedAt, sizeBytes, durationMs }`. Upstream
failure (including `NoDataFound`, which must not fabricate an empty cached
entry) leaves any existing entry untouched, records `last_error` in the
registry, and returns 502 `{ ok: false, error, cached }` where `cached`
describes the preserved local entry, if one exists. Historical refreshes
re-fetch the complete range and can take tens of seconds — the dashboard
requires confirmation before triggering one.

## Manual Cloudflare setup

The project has no wrangler configuration — Cloudflare settings live in the
dashboard, so the D1 databases and binding are configured there once:

1. **Create the databases**: Cloudflare dashboard → Storage & Databases → D1 →
   create `openelectricity-cache-registry` (production) and
   `openelectricity-cache-registry-preview`. Separate databases keep preview
   traffic from polluting production metadata.
2. **Apply the schema** to each database: paste
   `src/lib/server/network-cache-registry.sql` into the D1 console (it is
   idempotent), or use the CLI:

   ```bash
   pnpm exec wrangler d1 execute openelectricity-cache-registry --remote \
     --file=src/lib/server/network-cache-registry.sql
   pnpm exec wrangler d1 execute openelectricity-cache-registry-preview --remote \
     --file=src/lib/server/network-cache-registry.sql
   ```

3. **Bind** in the Workers project → Settings → Bindings: add a D1 binding
   named `CACHE_REGISTRY` — production environment → production database,
   preview environment → preview database.
4. **Redeploy** (push a `v*` tag to trigger the deploy hook) so the binding
   takes effect, then browse the tracker to seed entries and verify at
   `/studio/cache/network-data`.

No environment variables are involved (`.env.example` is unchanged); local
development keeps working without any of this and the dashboard shows a
"registry unavailable" state.

## Tests

- `server.test.js`, `entry/server.test.js`, `refresh/server.test.js` — endpoint
  auth, validation, miss/hit, refresh success and failure paths.
- `src/lib/server/network-cache-registry.test.js` — registry SQL, pruning and
  failure isolation.
- `src/lib/server/keyed-swr-cache.test.js` — SWR behaviour plus lifecycle
  hooks, `peek` and `refresh`.
- `src/lib/server/network-data.test.js` — parameter validation, canonical keys
  and key round-tripping.
- `src/lib/network-cache/freshness.test.js` — fresh/stale/expired boundaries.
- `src/routes/api/network/data/server.test.js` — public endpoint regression,
  including registry-failure isolation.
- `src/routes/(main)/studio/cache/network-data/_lib/cache-dashboard.test.js` —
  dashboard filter state, formatting and refresh presentation.
