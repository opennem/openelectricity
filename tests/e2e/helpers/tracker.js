import { expect } from '@playwright/test';
import { MARKET_METRIC_NAMES } from '../../../src/lib/components/charts/network/market-metric-names.js';

/**
 * Shared Playwright helpers for the Tracker specs.
 *
 * `trackerFixture` and `regionsFixture` synthesise OE-shaped `/api/network/data`
 * responses so the deterministic specs need neither OE credentials nor upstream
 * timing. They key their hold/failure controls on different request parameters
 * (metric versus region), accept different options and shape different series,
 * so both code paths are kept intact; only the response envelope, the hold gate
 * and the network timezone rule are shared.
 */

/** @typedef {import('@playwright/test').Page} Page */
/** @typedef {import('@playwright/test').Route} Route */
/** @typedef {import('@playwright/test').Download} Download */

const NETWORK_DATA = '**/api/network/data?**';

/**
 * OE timestamps carry the network's fixed UTC offset.
 * @param {string | null} region
 */
const zoneFor = (region) => (region === 'wem' ? '+08:00' : '+10:00');

/**
 * Fulfil a route with `data` inside the OE response envelope.
 * @param {Route} route
 * @param {unknown[]} data
 */
const respond = (route, data) => route.fulfill({ json: { response: { data } } });

/**
 * Park every request whose key matches the held value until `release()`.
 * @param {string} initial
 */
function createHold(initial) {
	let held = initial;
	/** @type {((value?: unknown) => void)[]} */
	const waiting = [];
	return {
		/** @param {string} key */
		set(key) {
			held = key;
		},
		/** @param {string | null} key */
		async wait(key) {
			if (key === held) await new Promise((resolve) => waiting.push(resolve));
		},
		release() {
			held = '';
			for (const resume of waiting) resume();
		}
	};
}

/**
 * Deterministic network responses for the timeline, time-of-day, comparison and
 * export flows. Series are generated for the requested window and interval, so
 * every flag below is keyed on the request's `metric`.
 * @param {Page} page
 * @param {{
 *   fail?: string,
 *   failOnce?: string,
 *   hold?: string,
 *   empty?: string,
 *   contributions?: boolean,
 *   comparisonGrowth?: boolean,
 *   distinctEmissions?: boolean,
 *   latestAt?: number
 * }} [options] `fail` answers 503 until `recover()`; `failOnce` answers 500 for
 *   the first matching request only; `hold` parks matching requests until
 *   `release()`; `empty` answers an empty dataset; `contributions` adds imports
 *   and battery charging series; `comparisonGrowth` doubles values from
 *   2 Aug 2026 on network-local timestamps; `distinctEmissions` gives coal all
 *   of the emissions; `latestAt` drops timestamps after that epoch millisecond.
 */
export async function trackerFixture(
	page,
	{
		fail = '',
		failOnce = '',
		hold = '',
		empty = '',
		contributions = false,
		comparisonGrowth = false,
		distinctEmissions = false,
		latestAt = Infinity
	} = {}
) {
	let failing = fail;
	let singleFailure = failOnce;
	const held = createHold(hold);
	/** @type {(string | null)[]} */
	const requests = [];
	/** @type {string[]} */
	const urls = [];
	await page.route(NETWORK_DATA, async (route) => {
		const params = new URL(route.request().url()).searchParams;
		const metric = params.get('metric');
		requests.push(metric);
		urls.push(route.request().url());
		await held.wait(metric);
		if (metric === singleFailure) {
			singleFailure = '';
			return route.fulfill({ status: 500, json: { error: 'Upstream query timed out' } });
		}
		if (metric === failing)
			return route.fulfill({ status: 503, json: { error: 'Fixture failure' } });
		if (metric === empty) return respond(route, []);
		const interval = params.get('interval');
		const step =
			{
				'5m': 300_000,
				'1h': 3_600_000,
				'1d': 86_400_000,
				'1M': 30 * 86_400_000,
				'3M': 90 * 86_400_000,
				'1y': 365 * 86_400_000
			}[interval] ?? 86_400_000;
		const zone = zoneFor(params.get('region'));
		const parse = (value) =>
			new Date(value + (/[zZ]|[+-]\d\d:\d\d$/.test(value) ? '' : zone)).getTime();
		const start = parse(params.get('date_start'));
		const end = parse(params.get('date_end'));
		let times = Array.from(
			{ length: Math.min(15000, Math.floor((end - start) / step) + 1) },
			(_, i) => new Date(start + i * step).toISOString()
		);
		// Daily API buckets align to network midnight, not a buffered request's
		// arbitrary start clock. Keep comparison fixture dates on that lattice.
		if (comparisonGrowth && interval === '1d') {
			const offset = zone === '+08:00' ? 8 * 3_600_000 : 10 * 3_600_000;
			const first = Math.ceil((start + offset) / step) * step - offset;
			times = Array.from({ length: Math.max(0, Math.floor((end - first) / step) + 1) }, (_, i) =>
				new Date(first + i * step).toISOString()
			);
		}
		if (interval === '1M') {
			const offset = zone === '+08:00' ? 8 * 3_600_000 : 10 * 3_600_000;
			const month = new Date(start + offset);
			month.setUTCDate(1);
			month.setUTCHours(0, 0, 0, 0);
			times = [];
			while (month.getTime() - offset <= end) {
				times.push(new Date(month.getTime() - offset).toISOString());
				month.setUTCMonth(month.getUTCMonth() + 1);
			}
		}
		times = times.filter((time) => Date.parse(time) <= latestAt);
		const basis = interval === '5m' || interval === '1h' ? 'power' : 'energy';
		const metrics =
			metric === 'emissions_intensity'
				? ['emissions', basis]
				: metric === 'price_vw'
					? ['market_value', basis]
					: (MARKET_METRIC_NAMES[metric] ?? [metric]);
		const data = metrics.map((name) => ({
			metric: name,
			interval,
			results: (['power', 'energy', 'market_value', 'emissions'].includes(name)
				? contributions
					? ['coal_black', 'wind', 'imports', 'battery_charging']
					: ['coal_black', 'wind']
				: [name]
			).map((fueltech, index) => ({
				name: `${name}_${fueltech}`,
				columns: { fueltech },
				data: times.map((time) => [
					// OE feeds use network-local wall-clock timestamps. The shared
					// processor reapplies the network offset, even for zoned input.
					comparisonGrowth
						? new Date(Date.parse(time) + (zone === '+08:00' ? 8 : 10) * 3_600_000)
								.toISOString()
								.slice(0, 19) + zone
						: time,
					name === 'emissions' && distinctEmissions
						? index === 0
							? 100
							: 0
						: name === 'price'
							? 50
							: name.includes('proportion')
								? 25
								: (index + 1) *
									100 *
									(comparisonGrowth && Date.parse(time) >= Date.parse('2026-08-02T00:00:00+10:00')
										? 2
										: 1)
				])
			}))
		}));
		await respond(route, data);
	});
	return {
		requests,
		urls,
		/** @param {string} metric */
		hold: (metric) => held.set(metric),
		/** @param {string} metric */
		fail: (metric) => {
			failing = metric;
		},
		recover: () => {
			failing = '';
		},
		release: () => held.release()
	};
}

/**
 * Deterministic network responses for the regions comparison view: 80 monthly
 * points from January 2020 per region, scaled by a fixed per-region amount, with
 * the clock pinned to 11 September 2026. Flags are keyed on the request's
 * `region`.
 * @param {Page} page
 * @param {{ fail?: string, hold?: string, empty?: boolean, spike?: boolean }} [options]
 *   `fail` answers 503 for that region until `recover()`; `hold` parks that
 *   region's requests until `release()`; `empty` answers every request with an
 *   empty dataset; `spike` multiplies the first twelve months by 50.
 */
export async function regionsFixture(
	page,
	{ fail = '', hold = '', empty = false, spike = false } = {}
) {
	let failure = fail;
	const held = createHold(hold);
	/** @type {{ region: string | null, metric: string | null }[]} */
	const requests = [];
	await page.clock.install({ time: new Date('2026-09-11T00:00:00Z') });
	await page.route(NETWORK_DATA, async (route) => {
		const params = new URL(route.request().url()).searchParams;
		const region = params.get('region');
		const metric = params.get('metric');
		requests.push({ region, metric });
		await held.wait(region);
		if (empty) return respond(route, []);
		if (region === failure)
			return route.fulfill({ status: 503, json: { error: 'Regional fixture unavailable' } });
		const amount = { nsw1: 1, qld1: 2, sa1: 3, tas1: 4, vic1: 5, wem: 6, _all: 15 }[region] ?? 1;
		const months = Array.from(
			{ length: 80 },
			(_, i) => new Date(Date.UTC(2020, i, 1)).toISOString().slice(0, 19) + zoneFor(region)
		);
		const series = (fueltech, value) => ({
			name: fueltech,
			columns: { fueltech },
			data: months.map((time, i) => [
				time,
				value * amount * (1 + i / 100) * (spike && i < 12 ? 50 : 1)
			])
		});
		const data =
			metric === 'flows_energy'
				? [
						{ metric: 'flow_imports_energy', results: [series('imports', 200)] },
						{ metric: 'flow_exports_energy', results: [series('exports', 300)] }
					]
				: metric === 'price_vw'
					? [
							{
								metric: 'market_value',
								results: [series('coal_black', 25000), series('wind', 75000)]
							}
						]
					: metric === 'renewables_energy'
						? [
								{ metric: 'generation_renewable_energy', results: [series('renewables', 1500)] },
								{ metric: 'demand_gross_energy', results: [series('demand', 1000)] }
							]
						: [
								{ metric: 'emissions', results: [series('coal_black', 500), series('wind', 0)] },
								{ metric: 'energy', results: [series('coal_black', 500), series('wind', 1500)] }
							];
		await respond(route, data);
	});
	return {
		requests,
		release: () => held.release(),
		recover: () => {
			failure = '';
		}
	};
}

/**
 * The chart card (`<section>`) headed by `title`, e.g. `card(page, 'Generation')`.
 * @param {Page} page
 * @param {string} title
 */
export const card = (page, title) =>
	page.getByRole('heading', { name: title, exact: true }).locator('xpath=ancestor::section[1]');

/**
 * The regions comparison values table.
 * @param {Page} page
 */
export const regionsTable = (page) => page.getByRole('table', { name: 'Region comparison values' });

/**
 * A region's row in the comparison table, found by its "Compare …" toggle.
 * @param {Page} page
 * @param {string} name Region label as shown in the table, e.g. `'NSW'`.
 */
export const regionRow = (page, name) =>
	regionsTable(page)
		.getByRole('row')
		.filter({ has: page.getByRole('button', { name: `Compare ${name}`, exact: true }) });

/**
 * Wait for the tracker to hydrate. The page server-renders a complete skeleton,
 * chart SVGs included, so element visibility alone cannot prove Svelte has
 * mounted — and a click on an unhydrated control is silently lost. The page
 * marks `<main data-hydrated>` once mounted.
 * @param {Page} page
 */
export async function hydrated(page) {
	await page.locator('main[data-hydrated]').waitFor();
}

/**
 * The timeline view is hydrated, its first data surface has left its busy
 * state and the Generation chart has mounted.
 * @param {Page} page
 */
export async function trackerReady(page) {
	await hydrated(page);
	await expect(page.locator('[aria-busy="false"]').first()).toBeAttached();
	await expect(card(page, 'Generation').locator('svg').first()).toBeVisible();
}

/**
 * The regions view is hydrated and showing complete monthly values, with the
 * NSW fixture row populated.
 * @param {Page} page
 */
export async function regionsReady(page) {
	await hydrated(page);
	await expect(
		page.getByText('Complete periods · monthly source data', { exact: true })
	).toBeVisible();
	await expect(regionRow(page, 'NSW')).toContainText('250');
}

/**
 * Open the tracker's Options menu once the page has hydrated.
 * @param {Page} page
 * @returns {Promise<import('@playwright/test').Locator>} The open menu.
 */
export async function openOptions(page) {
	await hydrated(page);
	await page.getByRole('button', { name: 'Options', exact: true }).click();
	return page.getByRole('menu');
}

/**
 * Trigger a dataset export from the Options menu and return the download.
 * @param {Page} page
 * @param {string} label Menu button label, e.g. `'Generation'` or
 *   `'Everything (one workbook)'`.
 * @returns {Promise<Download>}
 */
export async function download(page, label) {
	const menu = await openOptions(page);
	const result = page.waitForEvent('download');
	await menu.getByRole('button', { name: label, exact: true }).click();
	return result;
}

/**
 * The document does not overflow the viewport horizontally. Polls so a layout
 * that is still settling after a viewport change is given time to converge.
 * @param {Page} page
 */
export async function expectNoHorizontalScroll(page) {
	await expect
		.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
		.toBe(true);
}

/**
 * Collect uncaught page errors for the test to assert on once it has finished.
 * @param {Page} page
 * @returns {string[]} Error messages, appended as they occur.
 */
export function collectPageErrors(page) {
	/** @type {string[]} */
	const errors = [];
	page.on('pageerror', (error) => errors.push(error.message));
	return errors;
}
