# Records RSS feed

Serves an RSS 2.0 feed of the **100 most recent** electricity records at
[`/records/rss.xml`](https://openelectricity.org.au/records/rss.xml). The
`/records` page advertises it via a `<link rel="alternate" type="application/rss+xml">`
in its `<svelte:head>`, so feed readers auto-discover it from the page URL.

## Files

```
rss.xml/
├── +server.js     # GET handler: fetches data, sets headers, returns the feed
├── feed.js        # pure feed-building logic (no SvelteKit/IO dependencies)
└── feed.test.js   # unit tests for feed.js
```

The split keeps the endpoint thin (I/O only) and the transformation logic pure
and testable. `feed.js` exports:

| Export                                  | Purpose                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------ |
| `FEED_SIZE`                             | Item cap / API page size (100).                                                      |
| `buildRecordsFeed({ records, origin })` | Filters, sorts, caps and serialises raw records to RSS XML.                          |
| `recordTitle(record)`                   | One-line human title, e.g. `Highest instantaneous wind generation: 4,210 MW (NSW1)`. |
| `intervalToDate(interval, networkId)`   | Network-aware UTC `Date` for `pubDate` (see Date handling).                          |
| `escapeXml(str)`                        | Escapes the five XML special characters.                                             |

## How it works

1. **Two API calls.** `/api/records` can't return network-wide (NEM/WEM) and
   per-region records in a single query, so the handler fetches both in
   parallel and merges them — the same workaround the `/records` page uses
   (`page-data-options/fetch.js`).
2. **Filter / sort / cap.** `renewable_proportion` records are dropped (not yet
   supported by the OE API, and hidden in the UI too), the rest are sorted
   newest-first and capped at `FEED_SIZE`.
3. **Serialise.** Each record becomes an `<item>` with:
   - **title** — `recordTitle()` (reuses `generateDescription` + `formatRecordValue`).
   - **link** — `/records/{record_id}?focus={time}`, deep-linking the instance.
   - **guid** — `instance_id` (stable, `isPermaLink="false"`).
   - **pubDate** — RFC-822 UTC, see below.

## Date handling

Two distinct dates are derived per record, on purpose:

- **`date`** — `parseISO(interval)` with **no** offset re-applied. Used for sort
  order and the deep-link `focus` time, matching the `/records` page exactly.
- **`pubDate`** — `intervalToDate(interval, networkId)`. The OE API returns
  interval timestamps in network-local time with an _inconsistent_ suffix (some
  `Z`, some `+HH:MM`, some none). `intervalToDate` strips whatever is there via
  `stripDateTimezone()`, then re-applies the network offset (NEM `+10:00` /
  WEM `+08:00`) to produce a correct, unambiguous UTC `pubDate`.

Naively appending an offset to an already-suffixed string yields `Invalid Date`
— the regression `feed.test.js` guards against.

## Caching

The response sets `cache-control: public, max-age=300` (5 minutes). The feed is
generated on demand (not prerendered — the root `+layout.js` sets
`prerender = false`), and `/api/records` is always fetched fresh
(`max-age=0`). Effective freshness is therefore ≤ 5 minutes, though most readers
poll on their own (typically 15–60 min) cadence.

## Testing

```bash
pnpm exec vitest run "src/routes/(main)/records/rss.xml/feed.test.js"
```

To eyeball the live output with the dev server running:

```bash
curl -s http://localhost:5173/records/rss.xml | xmllint --format -
```
