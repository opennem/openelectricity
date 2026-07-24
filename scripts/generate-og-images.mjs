/**
 * Build-time generator for per-facility Open Graph cards.
 *
 * Run out-of-band — NOT part of the deploy build (regenerating all ~600 cards
 * blew the Cloudflare build time limit). Invoke via `pnpm build:og` or the
 * `og-cards` GitHub workflow; the JPEGs are committed under static/og/facility
 * and ship as static assets referenced by each page's og:image. Uses native
 * resvg/sharp in Node, which is why it never runs inside the Cloudflare Worker.
 *
 * Incremental by state-diff: facility-card-state.json records what each card
 * was built from (template version, Sanity photo URL, derived card data). A
 * card regenerates when any of those change or its file is missing; OG_FORCE=1
 * (`pnpm build:og:force`) regenerates everything. Cards for codes no longer in
 * the OE API are pruned. Sanity photo URLs embed a content hash, so URL
 * equality means content equality.
 *
 * Flags: --dry-run reports regen/prune decisions without writing anything;
 * --code=HAZEL,NARROGINWF limits the run to those codes (prune skipped).
 *
 * Env: reads process.env (CI / doppler), falling back to a parsed .env for local
 * OSS builds. Needs PUBLIC_OE_API_URL, PUBLIC_OE_API_KEY, PUBLIC_SANITY_PROJECT_ID,
 * PUBLIC_SANITY_DATASET — Sanity is a hard dependency: photo changes drive
 * regeneration, so a missing/empty photo map would mass-convert photo cards to
 * the branded fallback.
 */

import {
	mkdirSync,
	existsSync,
	writeFileSync,
	readFileSync,
	readdirSync,
	unlinkSync
} from 'node:fs';
import { resolve } from 'node:path';
import { renderFacilityOgCard, OG_CARD_VERSION } from '../src/lib/server/og/facility-card.js';
import { deriveCard } from '../src/lib/og/facility-card-data.js';

const OUT_DIR = resolve(process.cwd(), 'static/og/facility');
// Manifest of codes that have a committed card — the facility page reads it to
// pick the per-facility card vs. the default OG image (it can't fs-check at runtime).
const MANIFEST = resolve(process.cwd(), 'src/lib/server/og/facility-card-codes.json');
// Generator-only build provenance (never imported by runtime code): what each
// committed card was built from, driving the incremental skip/regen decision.
const STATE = resolve(process.cwd(), 'src/lib/server/og/facility-card-state.json');
const CONCURRENCY = 12;
const FORCE = process.env.OG_FORCE === '1';

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const ONLY = new Set(
	args
		.filter((a) => a.startsWith('--code='))
		.flatMap((a) => a.slice('--code='.length).split(','))
		.filter(Boolean)
);
// Codes become filenames — refuse anything that could escape OUT_DIR.
const VALID_CODE = /^[A-Za-z0-9_-]+$/;

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
if (!SANITY_PROJECT || !SANITY_DATASET) {
	console.error(
		'[og] Missing PUBLIC_SANITY_PROJECT_ID / PUBLIC_SANITY_DATASET — the photo map drives regeneration, so Sanity is required.'
	);
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

/**
 * Map facility code → first photo's CDN url, via the public Sanity query API.
 * Failures are fatal: an empty map here would regenerate every photo card as
 * the branded fallback.
 */
async function fetchPhotoMap() {
	const query = `*[_type == "facility" && defined(photos[0])]{code, "photo": photos[0].asset->url}`;
	const url = `https://${SANITY_PROJECT}.apicdn.sanity.io/v2023-10-11/data/query/${SANITY_DATASET}?query=${encodeURIComponent(query)}`;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Sanity query returned ${res.status}`);
	const json = await res.json();
	const map = new Map();
	for (const row of json.result || []) {
		if (row?.code && row?.photo) map.set(row.code, row.photo);
	}
	return map;
}

/**
 * Download a photo (with the card-crop transform), retrying transient failures.
 * Returns null only after exhausting retries — the caller decides whether a
 * branded fallback is acceptable.
 * @param {string} photoUrl
 */
async function fetchPhotoBuffer(photoUrl, attempts = 3) {
	for (let attempt = 1; attempt <= attempts; attempt++) {
		try {
			const res = await fetch(`${photoUrl}?w=1200&h=630&fit=crop&fm=jpg&q=80`);
			if (res.ok) return Buffer.from(await res.arrayBuffer());
		} catch {
			/* retry */
		}
		if (attempt < attempts) await new Promise((r) => setTimeout(r, 500 * attempt));
	}
	return null;
}

// ---- state ------------------------------------------------------------------

/** @returns {Record<string, { v: number, photo: string | null, data: any }>} */
function loadState() {
	try {
		return JSON.parse(readFileSync(STATE, 'utf8'));
	} catch {
		console.warn('[og] No prior state file — every card will be (re)generated once.');
		return {};
	}
}

/** @param {Record<string, any>} state */
function writeState(state) {
	const sorted = Object.fromEntries(
		Object.keys(state)
			.sort()
			.map((k) => [k, state[k]])
	);
	// Machine-written and prettierignored (JSON.stringify can't reproduce
	// prettier's array collapsing); tab-indented anyway for readable diffs.
	writeFileSync(STATE, JSON.stringify(sorted, null, '\t') + '\n');
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

	const priorState = loadState();
	const [facilities, photoMap] = await Promise.all([fetchFacilities(), fetchPhotoMap()]);
	const withCode = facilities.filter((f) => f?.code);
	const apiCodes = new Set(withCode.map((f) => f.code));

	// Guards against degraded-but-not-failed upstream responses: state-diffing
	// means a hollow facilities list would mass-prune, and a hollow photo map
	// would mass-convert photo cards to the branded fallback. Both are inert on
	// true bootstrap (no prior state).
	let knownCount = Object.keys(priorState).length;
	try {
		knownCount = Math.max(knownCount, JSON.parse(readFileSync(MANIFEST, 'utf8')).length);
	} catch {
		/* no manifest yet */
	}
	if (knownCount > 0 && withCode.length < Math.floor(knownCount * 0.8)) {
		throw new Error(
			`OE returned ${withCode.length} facilities but ${knownCount} cards are known — refusing to regenerate/prune from a suspiciously small response.`
		);
	}
	if (photoMap.size === 0 && Object.values(priorState).some((s) => s?.photo)) {
		throw new Error(
			'Sanity returned no photos but prior cards were built with photos — refusing to downgrade them to branded fallbacks.'
		);
	}

	// Data-quality drift: photos filed in Sanity under codes the OE API doesn't
	// know are silently never used. Surface them every run.
	const unmatched = [...photoMap.keys()].filter((c) => !apiCodes.has(c)).sort();
	if (unmatched.length) {
		console.warn(`[og] Sanity photo codes matching no OE facility: ${unmatched.join(', ')}`);
	}

	let targets = withCode;
	if (ONLY.size) {
		targets = withCode.filter((f) => ONLY.has(f.code));
		const found = new Set(targets.map((f) => f.code));
		const missing = [...ONLY].filter((c) => !found.has(c));
		if (missing.length) console.warn(`[og] --code values not in the API: ${missing.join(', ')}`);
	}

	console.log(
		`[og] ${withCode.length} facilities, ${photoMap.size} with photos${FORCE ? ' (force regenerate)' : ''}${DRY ? ' (dry run)' : ''}${ONLY.size ? ` (only: ${[...ONLY].join(', ')})` : ''}`
	);

	/** @type {Record<string, { v: number, photo: string | null, data: any }>} */
	const newState = {};
	let generated = 0;
	let skipped = 0;
	let failed = 0;
	/** @type {string[]} */
	const failedCodes = [];

	await pool(targets, CONCURRENCY, async (facility) => {
		const code = facility.code;
		if (!VALID_CODE.test(code)) {
			console.warn(`[og]   invalid facility code ${JSON.stringify(code)} — skipping`);
			failed++;
			failedCodes.push(code);
			return;
		}
		const out = resolve(OUT_DIR, `${code}.jpg`);
		const desired = {
			v: OG_CARD_VERSION,
			photo: photoMap.get(code) ?? null,
			data: deriveCard(facility)
		};
		const built = priorState[code];

		const reason = FORCE
			? 'force'
			: !existsSync(out)
				? 'missing-file'
				: !built
					? 'no-state'
					: built.v !== desired.v
						? 'version'
						: built.photo !== desired.photo
							? 'photo-changed'
							: JSON.stringify(built.data) !== JSON.stringify(desired.data)
								? 'data-changed'
								: null;

		if (!reason) {
			newState[code] = built;
			skipped++;
			return;
		}
		if (DRY) {
			console.log(`[og]   would generate ${code} (${reason})`);
			if (built) newState[code] = built;
			generated++;
			return;
		}

		try {
			const photoBuffer = desired.photo ? await fetchPhotoBuffer(desired.photo) : null;
			if (desired.photo && !photoBuffer) {
				if (existsSync(out)) {
					// Never overwrite an existing card with a fallback because a photo
					// download flaked — keep the old card and retry next run.
					console.warn(`[og]   photo download failed for ${code} — keeping existing card`);
					if (built) newState[code] = built;
					failed++;
					failedCodes.push(code);
					return;
				}
				// No card at all: ship the branded fallback now, but record that no
				// photo was used so the next run retries (desired.photo ≠ built.photo).
				console.warn(`[og]   photo download failed for ${code} — writing branded fallback`);
				writeFileSync(out, await renderFacilityOgCard({ facility, photoBuffer: null }));
				newState[code] = { ...desired, photo: null };
				generated++;
				return;
			}
			writeFileSync(out, await renderFacilityOgCard({ facility, photoBuffer }));
			newState[code] = desired;
			generated++;
			if (generated % 100 === 0) console.log(`[og]   …${generated} generated`);
		} catch (err) {
			if (built) newState[code] = built;
			failed++;
			failedCodes.push(code);
			console.warn(`[og]   failed ${code}: ${err.message}`);
		}
	});

	// Prune cards for codes the API no longer returns (renames/removals) so they
	// don't linger on disk and in the manifest. Skipped on subset runs — the
	// full code set is still authoritative, but a --code run shouldn't surprise.
	let pruned = 0;
	if (!ONLY.size) {
		for (const file of readdirSync(OUT_DIR)) {
			if (!file.endsWith('.jpg')) continue;
			const code = file.slice(0, -4);
			if (apiCodes.has(code)) continue;
			if (DRY) {
				console.log(`[og]   would prune ${code}`);
			} else {
				unlinkSync(resolve(OUT_DIR, file));
				console.log(`[og]   pruned ${code}`);
			}
			pruned++;
		}
	}

	console.log(
		`[og] done — ${generated} ${DRY ? 'would generate' : 'generated'}, ${skipped} skipped, ${failed} failed, ${pruned} ${DRY ? 'would prune' : 'pruned'}`
	);
	if (failedCodes.length) console.warn(`[og] FAILED codes: ${failedCodes.join(', ')}`);
	// A handful of per-facility failures shouldn't fail the run; a wholesale
	// failure (e.g. OE/Sanity down) already threw above.

	if (DRY) return;

	// State records what each card was actually built from. On subset runs,
	// merge over the prior state so untouched codes keep their entries; on full
	// runs the rebuild itself prunes state (only processed codes enter newState).
	// Written even when some facilities failed — their entries carry forward.
	writeState(ONLY.size ? { ...priorState, ...newState } : newState);

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
