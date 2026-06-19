/**
 * Pure facility → card data derivation, shared by the build-time OG card renderer
 * (`$lib/server/og/facility-card.js`, run in Node) and the live in-app card
 * (`$lib/components/FacilityOgCard.svelte`). Kept here (not under `$lib/server`,
 * and free of `$lib`-alias/theme/node imports) so both a plain-Node build script
 * and the browser bundle can import it — hence the relative import of the
 * self-contained `detailed` fuel-tech order below.
 */

import { sortByDetailedOrder } from '../fuel-tech-groups/detailed.js';

/** @param {any} v */
function num(v) {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
}

/** @param {number} v */
export function formatMw(v) {
	if (!v) return '—';
	return v < 10 ? v.toFixed(1) : Math.round(v).toLocaleString('en-AU');
}

/**
 * Build the card subtitle line — "{MW} MW · {REGION} · {Status}" — shared by the
 * satori renderer and the live card so they stay identical.
 * @param {{ capacity: number, region: string, status: string | null }} card
 */
export function formatCardSubtitle({ capacity, region, status }) {
	return [
		`${formatMw(capacity)} MW`,
		region,
		status ? status.charAt(0).toUpperCase() + status.slice(1) : ''
	]
		.filter(Boolean)
		.join('  ·  ');
}

/**
 * Derive the badge fueltechs (deduped, capacity-desc), the dominant fueltech,
 * total active capacity, rolled-up status, region, and name from a facility's units.
 * @param {any} facility
 * @returns {{ fuelTechs: string[], dominant: string, capacity: number, status: string | null, region: string, name: string }}
 */
export function deriveCard(facility) {
	/** @type {any[]} */
	let units = Array.isArray(facility.units) ? facility.units : [];
	// Drop derived battery_charging/discharging when a bidirectional `battery`
	// unit exists, so the battery isn't triple-counted.
	if (units.some((u) => u.fueltech_id === 'battery')) {
		units = units.filter(
			(u) => u.fueltech_id !== 'battery_charging' && u.fueltech_id !== 'battery_discharging'
		);
	}

	/** @type {Map<string, { ft: string, cap: number, active: number }>} */
	const byFt = new Map();
	for (const u of units) {
		const ft = u.fueltech_id;
		if (!ft) continue;
		const cap = num(u.capacity_maximum ?? u.capacity_registered);
		const entry = byFt.get(ft) || { ft, cap: 0, active: 0 };
		entry.cap += cap;
		if (u.status_id !== 'retired') entry.active += cap;
		byFt.set(ft, entry);
	}

	const groups = [...byFt.values()];
	// Dominant (drives the card background + ring colour) is the highest-capacity
	// fuel tech; the badge row is ordered top-of-stack first (reversed detailed
	// order) so it matches the facility detail panel and list.
	const dominant = groups.length ? [...groups].sort((a, b) => b.cap - a.cap)[0].ft : 'renewables';
	const fuelTechs = sortByDetailedOrder(
		groups.map((g) => ({ fueltech_id: g.ft })),
		{ reverse: true }
	).map((g) => g.fueltech_id);

	const activeCap = groups.reduce((s, g) => s + g.active, 0);
	const totalCap = groups.reduce((s, g) => s + g.cap, 0);
	const capacity = activeCap || totalCap;

	// Status rollup: any operating → operating; all retired → retired; else most
	// common non-retired status.
	let status = null;
	if (units.length) {
		if (units.some((u) => u.status_id === 'operating')) status = 'operating';
		else if (units.every((u) => u.status_id === 'retired')) status = 'retired';
		else {
			/** @type {Record<string, number>} */
			const counts = {};
			for (const u of units) {
				if (!u.status_id || u.status_id === 'retired') continue;
				counts[u.status_id] = (counts[u.status_id] || 0) + 1;
			}
			status = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
		}
	}

	const region = String(facility.network_region || '')
		.replace(/\d+$/, '')
		.toUpperCase();

	return { fuelTechs, dominant, capacity, status, region, name: facility.name || facility.code };
}
