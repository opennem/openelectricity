-- Network-data cache registry schema (Cloudflare D1).
--
-- Metadata about every successful keyed SWR edge-cache write for
-- /api/network/data; the full responses stay in the Cache API. Applied
-- manually to the `openelectricity-cache-registry` databases (production and
-- preview) — see src/routes/api/admin/network-cache/README.md. Idempotent:
-- safe to re-run.

CREATE TABLE IF NOT EXISTS network_cache_entries (
	-- Full synthetic Cache API key: `${keyPrefix}?${canonical_query}`.
	cache_key           TEXT PRIMARY KEY,
	-- Canonicalised query string (the portion after '?').
	canonical_query     TEXT NOT NULL,
	region              TEXT NOT NULL,
	metric              TEXT NOT NULL,
	interval            TEXT NOT NULL,
	date_start          TEXT,
	date_end            TEXT,
	primary_grouping    TEXT,
	-- 1 historical / 0 live, classified at the last storage time.
	is_historical       INTEGER NOT NULL,
	-- Freshness period (ms) applied at the last storage time.
	fresh_ms            INTEGER NOT NULL,
	-- Epoch ms of the last successful Cache API write.
	stored_at           INTEGER NOT NULL,
	-- Serialised response size in bytes.
	size_bytes          INTEGER NOT NULL,
	-- Upstream fetch duration (ms) for that write.
	refresh_duration_ms INTEGER NOT NULL,
	-- Most recent refresh error; cleared by the next successful write.
	last_error          TEXT,
	last_error_at       INTEGER
);

CREATE INDEX IF NOT EXISTS idx_network_cache_entries_stored_at
	ON network_cache_entries (stored_at DESC);
