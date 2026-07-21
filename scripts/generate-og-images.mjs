/**
 * Build-time generator for per-facility Open Graph cards.
 *
 * Run out-of-band — NOT part of the deploy build (regenerating all ~600 cards
 * blew the Cloudflare build time limit). Invoke via `pnpm build:og` or the
 * `og-cards` GitHub workflow; the JPEGs are committed under static/og/facility
 * and ship as static assets referenced by each page's og:image. Uses native
 * resvg/sharp in Node, which is why it never runs inside the Cloudflare Worker.
 *
 * Env: reads process.env (CI / doppler), falling back to a parsed .env for local
 * OSS builds. Needs PUBLIC_OE_API_URL, PUBLIC_OE_API_KEY, PUBLIC_SANITY_PROJECT_ID,
 * PUBLIC_SANITY_DATASET.
 *
 * Incremental: skips facilities whose PNG already exists unless OG_FORCE=1
 * (`pnpm build:og:force`).
 */

import { mkdirSync, existsSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderFacilityOgCard } from '../src/lib/server/og/facility-card.js';

const OUT_DIR = resolve(process.cwd(), 'static/og/facility');
// Manifest of codes that have a committed card — the facility page reads it to
// pick the per-facility card vs. the default OG image (it can't fs-check at runtime).
const MANIFEST = resolve(process.cwd(), 'src/lib/server/og/facility-card-codes.json');
const CONCURRENCY = 12;
const FORCE = process.env.OG_FORCE === '1';

// ---- env (process.env, falling back to .env) ------------------------------

function loadEnv() {
	/** @type {Record<string, string>} */
	const fromFile = {};
	try {
		const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
		for (const line of raw.split('\n')) {
			const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
			if (!m) continue;
			let v = m[2].trim();
			if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
				v = v.slice(1, -1);
			}
			fromFile[m[1]] = v;
		}
	} catch {
		/* no .env — rely on process.env */
	}
	return { ...fromFile, ...process.env };
}

const env = loadEnv();
const OE_URL = env.PUBLIC_OE_API_URL;
const OE_KEY = env.PUBLIC_OE_API_KEY;
const SANITY_PROJECT = env.PUBLIC_SANITY_PROJECT_ID;
const SANITY_DATASET = env.PUBLIC_SANITY_DATASET;

if (!OE_URL || !OE_KEY) {
	console.error('[og] Missing PUBLIC_OE_API_URL / PUBLIC_OE_API_KEY — cannot generate OG images.');
	process.exit(1);
}

// ---- data -----------------------------------------------------------------

async function fetchFacilities() {
	const res = await fetch(`${OE_URL}/facilities/`, {
		headers: { Authorization: `Bearer ${OE_KEY}` }
	});
	if (!res.ok) throw new Error(`OE /facilities/ returned ${res.status}`);
	const json = await res.json();
	return json.data || [];
}

/** Map facility code → first photo's CDN url, via the public Sanity query API. */
async function fetchPhotoMap() {
	if (!SANITY_PROJECT || !SANITY_DATASET) return new Map();
	const query = `*[_type == "facility" && defined(photos[0])]{code, "photo": photos[0].asset->url}`;
	const url = `https://${SANITY_PROJECT}.apicdn.sanity.io/v2023-10-11/data/query/${SANITY_DATASET}?query=${encodeURIComponent(query)}`;
	try {
		const res = await fetch(url);
		if (!res.ok) throw new Error(`Sanity query returned ${res.status}`);
		const json = await res.json();
		const map = new Map();
		for (const row of json.result || []) {
			if (row?.code && row?.photo) map.set(row.code, row.photo);
		}
		return map;
	} catch (err) {
		console.warn(
			'[og] Sanity photo lookup failed — all cards will use the branded style.',
			err.message
		);
		return new Map();
	}
}

async function fetchPhotoBuffer(photoUrl) {
	try {
		const res = await fetch(`${photoUrl}?w=1200&h=630&fit=crop&fm=jpg&q=80`);
		if (!res.ok) return null;
		return Buffer.from(await res.arrayBuffer());
	} catch {
		return null;
	}
}

// ---- concurrency pool -----------------------------------------------------

/**
 * @param {any[]} items
 * @param {number} limit
 * @param {(item: any, i: number) => Promise<void>} worker
 */
async function pool(items, limit, worker) {
	let i = 0;
	const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
		while (i < items.length) {
			const idx = i++;
			await worker(items[idx], idx);
		}
	});
	await Promise.all(runners);
}

// ---- main -----------------------------------------------------------------

async function main() {
	mkdirSync(OUT_DIR, { recursive: true });

	const [facilities, photoMap] = await Promise.all([fetchFacilities(), fetchPhotoMap()]);
	const withCode = facilities.filter((f) => f?.code);
	console.log(
		`[og] ${withCode.length} facilities, ${photoMap.size} with photos${FORCE ? ' (force regenerate)' : ''}`
	);

	let generated = 0;
	let skipped = 0;
	let failed = 0;

	await pool(withCode, CONCURRENCY, async (facility) => {
		const out = resolve(OUT_DIR, `${facility.code}.jpg`);
		if (!FORCE && existsSync(out)) {
			skipped++;
			return;
		}
		try {
			const photoUrl = photoMap.get(facility.code);
			const photoBuffer = photoUrl ? await fetchPhotoBuffer(photoUrl) : null;
			const png = await renderFacilityOgCard({ facility, photoBuffer });
			writeFileSync(out, png);
			generated++;
			if (generated % 100 === 0) console.log(`[og]   …${generated} generated`);
		} catch (err) {
			failed++;
			console.warn(`[og]   failed ${facility.code}: ${err.message}`);
		}
	});

	console.log(`[og] done — ${generated} generated, ${skipped} skipped, ${failed} failed`);
	// A handful of per-facility failures shouldn't fail the deploy; a wholesale
	// failure (e.g. OE/Sanity down) already threw above.

	// Refresh the manifest from whatever cards now exist on disk so the facility
	// page's per-card-vs-default OG choice stays in sync. Commit it alongside the cards.
	const codes = readdirSync(OUT_DIR)
		.filter((f) => f.endsWith('.jpg'))
		.map((f) => f.slice(0, -4))
		.sort();
	// Tab-indented to match Prettier (the codes are already sorted above) so the
	// committed manifest stays a clean, minimal diff each regen rather than a
	// one-line blob that fails `prettier --check`.
	writeFileSync(MANIFEST, JSON.stringify(codes, null, '\t') + '\n');
	console.log(`[og] manifest: ${codes.length} codes → ${MANIFEST}`);
}

main().catch((err) => {
	console.error('[og] fatal:', err);
	process.exit(1);
});
