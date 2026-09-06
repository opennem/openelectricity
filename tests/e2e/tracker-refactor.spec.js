import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { inflateRawSync } from 'node:zlib';
import { MARKET_METRIC_NAMES } from '../../src/lib/components/charts/network/market-metric-names.js';

/** Deterministic network responses; no OE credentials or upstream timing required. */
async function fixture(page, { fail = '', hold = '', empty = '' } = {}) {
	let failing = fail;
	let held = hold;
	const waiting = [];
	const requests = [];
	const urls = [];
	await page.route('**/api/network/data?**', async (route) => {
		const params = new URL(route.request().url()).searchParams;
		const metric = params.get('metric');
		requests.push(metric);
		urls.push(route.request().url());
		if (metric === held) await new Promise((resolve) => waiting.push(resolve));
		if (metric === failing)
			return route.fulfill({ status: 503, json: { error: 'Fixture failure' } });
		if (metric === empty) return route.fulfill({ json: { response: { data: [] } } });
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
		const zone = params.get('region') === 'wem' ? '+08:00' : '+10:00';
		const parse = (value) =>
			new Date(value + (/[zZ]|[+-]\d\d:\d\d$/.test(value) ? '' : zone)).getTime();
		const start = parse(params.get('date_start'));
		const end = parse(params.get('date_end'));
		let times = Array.from(
			{ length: Math.min(15000, Math.floor((end - start) / step) + 1) },
			(_, i) => new Date(start + i * step).toISOString()
		);
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
				? ['coal_black', 'wind']
				: [name]
			).map((fueltech, index) => ({
				name: `${name}_${fueltech}`,
				columns: { fueltech },
				data: times.map((time) => [
					time,
					name === 'price' ? 50 : name.includes('proportion') ? 25 : (index + 1) * 100
				])
			}))
		}));
		await route.fulfill({ json: { response: { data } } });
	});
	return {
		requests,
		urls,
		recover: () => {
			failing = '';
		},
		release: () => {
			held = '';
			for (const resume of waiting) resume();
		}
	};
}

const card = (page, title) =>
	page.getByRole('heading', { name: title, exact: true }).locator('xpath=ancestor::section[1]');
async function ready(page) {
	await expect(page.locator('[aria-busy="false"]').first()).toBeAttached();
	await expect(card(page, 'Generation').locator('svg').first()).toBeVisible();
}
async function download(page, label) {
	await ready(page);
	await page.getByRole('button', { name: 'Options', exact: true }).click();
	const menu = page.getByRole('menu');
	const result = page.waitForEvent('download');
	await menu.getByRole('button', { name: label, exact: true }).click();
	return result;
}

/** Read a generated XLSX's XML via its ZIP directory, without a second spreadsheet library. */
function workbookXml(buffer, wanted) {
	for (let offset = 0; offset < buffer.length - 46; offset++) {
		if (buffer.readUInt32LE(offset) !== 0x02014b50) continue;
		const length = buffer.readUInt16LE(offset + 28);
		const name = buffer.subarray(offset + 46, offset + 46 + length).toString();
		if (name !== wanted) continue;
		const size = buffer.readUInt32LE(offset + 20);
		const local = buffer.readUInt32LE(offset + 42);
		const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
		const content = buffer.subarray(start, start + size);
		return (buffer.readUInt16LE(offset + 10) === 8 ? inflateRawSync(content) : content).toString();
	}
	throw new Error(`Missing workbook entry: ${wanted}`);
}

test('selected units survive pointer and keyboard resizing', async ({ page }) => {
	await fixture(page);
	await page.goto('/tracker?region=nsw1&table=0');
	await ready(page);
	const generation = card(page, 'Generation');
	await generation.getByRole('button', { name: 'Toggle chart options' }).click();
	await generation.getByRole('tab', { name: 'GW', exact: true }).click();
	const handle = page.getByRole('separator', { name: 'Resize chart height' }).first();
	await handle.focus();
	await handle.press('ArrowDown');
	await expect(handle).toHaveAttribute('aria-valuenow', '270');
	await expect(generation.getByRole('button', { name: 'GW', exact: true })).toBeVisible();
	const box = await handle.boundingBox();
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	await page.mouse.move(box.x + box.width / 2, box.y + 45, { steps: 4 });
	await page.mouse.up();
	await expect(generation.getByRole('button', { name: 'GW', exact: true })).toBeVisible();
});

test('a failed metric retries in place and optional providers stay disabled', async ({ page }) => {
	const source = await fixture(page, { fail: 'price' });
	await page.goto('/tracker?region=nsw1&table=0');
	await expect(card(page, 'Market').getByRole('button', { name: 'Retry' })).toBeVisible();
	source.recover();
	await card(page, 'Market').getByRole('button', { name: 'Retry' }).click();
	await expect(card(page, 'Market').getByRole('button', { name: 'Retry' })).toBeHidden();
	await ready(page);
	expect(source.requests.filter((metric) => metric === 'price').length).toBeGreaterThanOrEqual(2);
	expect(source.requests).not.toContain('renewables');
	expect(source.requests).not.toContain('curtailment');
});

test('explicit ranges push history and back/forward restore the range', async ({ page }) => {
	await fixture(page);
	await page.goto('/tracker?region=nsw1&table=0');
	await ready(page);
	await page.getByRole('button', { name: '30D', exact: true }).click();
	await expect(page).toHaveURL(/range=30d/);
	await page.goBack();
	await expect(page).not.toHaveURL(/range=30d/);
	await page.goForward();
	await expect(page).toHaveURL(/range=30d/);
	await expect(card(page, 'Generation').getByText('Energy', { exact: true })).toBeVisible();
});

test('CSV can export an independent ready dataset while a workbook waits for all datasets', async ({
	page
}) => {
	const source = await fixture(page, { hold: 'price' });
	await page.goto('/tracker?region=nsw1&table=0');
	// The generation snapshot publishes independently of the held market response.
	// A client request proves hydration without waiting on the held chart.
	await expect.poll(() => source.requests.includes('power')).toBe(true);
	await page.getByRole('button', { name: 'Options', exact: true }).click();
	const menu = page.getByRole('menu');
	await expect(
		menu.getByRole('button', { name: 'Everything (one workbook)', exact: true })
	).toBeDisabled();
	await expect(menu.getByRole('button', { name: 'Generation', exact: true })).toBeEnabled();
	const independent = page.waitForEvent('download');
	await menu.getByRole('button', { name: 'Generation', exact: true }).click();
	expect((await independent).suggestedFilename()).toContain('generation');
	source.release();
	await ready(page);
	// Wait for publication through a visible table after opening it.
	await page.getByRole('button', { name: 'Show fuel tech table' }).click();
	await expect(page.getByTestId('fuel-tech-row').first()).toBeVisible();
	const csv = await download(page, 'Generation');
	const content = await readFile(await csv.path(), 'utf8');
	expect(content).toContain('(MW)');
	expect(content.split('\n').length).toBeGreaterThan(2);
	expect(content).toMatch(/\+10:00/);
	const workbook = await download(page, 'Everything (one workbook)');
	const bytes = await readFile(await workbook.path());
	const index = workbookXml(bytes, 'xl/workbook.xml');
	for (const name of ['Summary', 'Generation', 'Market', 'Emissions', 'Fuel tech table'])
		expect(index).toContain(`name="${name}"`);
	expect(workbookXml(bytes, 'xl/worksheets/sheet2.xml')).toContain('<v>100</v>');
});

test('confirmed empty data settles without a retry or an endless loading state', async ({
	page
}) => {
	await fixture(page, { empty: 'price' });
	await page.goto('/tracker?region=wem&table=0');
	await expect(card(page, 'Market').getByText('No data for this range.')).toBeVisible();
	await expect(card(page, 'Market').getByRole('button', { name: 'Retry' })).toHaveCount(0);
	const csv = await download(page, 'Generation');
	expect(await readFile(await csv.path(), 'utf8')).toContain('+08:00');
});

test('reopening the table waits for its providers before enabling its export', async ({ page }) => {
	const source = await fixture(page, { hold: 'renewables' });
	await page.goto('/tracker?region=nsw1&table=0');
	await ready(page);
	await page.getByRole('button', { name: 'Show fuel tech table' }).click();
	await page.getByRole('button', { name: 'Options', exact: true }).click();
	const tableDownload = page
		.getByRole('menu')
		.getByRole('button', { name: 'Fuel tech table', exact: true });
	await expect(tableDownload).toBeDisabled();
	source.release();
	await expect(tableDownload).toBeEnabled();
	const saved = page.waitForEvent('download');
	await tableDownload.click();
	expect(await readFile(await (await saved).path(), 'utf8')).toContain('Demand,summary,');
});

test('same-route links reset selection and phone/tablet layouts remain usable', async ({
	page
}, testInfo) => {
	await fixture(page);
	for (const width of [390, 820, 1440]) {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/tracker?region=nsw1');
		await ready(page);
		if (width === 390)
			await expect(page.getByRole('button', { name: 'Show fuel tech table' })).toBeVisible();
		else await expect(page.getByTestId('fuel-tech-row').first()).toBeVisible();
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
			width
		);
		await page.screenshot({ path: testInfo.outputPath(`tracker-${width}.png`) });
	}
	await page.getByRole('link', { name: 'Tracker', exact: true }).click();
	await expect(page).not.toHaveURL(/region=nsw1/);
	await expect(page.getByRole('button', { name: 'NEM Regions', exact: true })).toBeVisible();
});

test('repeated grouping changes reuse responses and measure table calculations', async ({
	page
}, testInfo) => {
	const source = await fixture(page);
	await page.goto('/tracker?region=nsw1&table=1');
	await expect(page.getByTestId('fuel-tech-row').first()).toBeVisible();
	await page.evaluate(() => performance.clearMeasures());
	for (const label of ['Detailed', 'Simplified', 'Detailed', 'Simplified']) {
		await page.getByRole('button', { name: 'Options', exact: true }).click();
		await page.getByRole('menuitemradio', { name: label, exact: true }).click();
		await expect(page.getByRole('columnheader', { name: /Technology/ })).toContainText(label);
		await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
	}
	const durations = await page.evaluate(() =>
		performance.getEntriesByName('canvas:table-rows').map((entry) => entry.duration)
	);
	expect(durations.length).toBeGreaterThan(0);
	// Prefetch may widen the viewport; it must not repeat the same completed URL.
	const powerUrls = source.urls.filter(
		(url) => new URL(url).searchParams.get('metric') === 'power'
	);
	await testInfo.attach('table-profile', {
		body: JSON.stringify({
			samples: durations.length,
			maxMs: Math.max(...durations),
			requests: source.requests
		}),
		contentType: 'application/json'
	});
	expect(powerUrls.length).toBe(new Set(powerUrls).size);
});

test('resize bounds and pointer cancellation work when height storage is unavailable', async ({
	page
}) => {
	await page.addInitScript(() => {
		for (const method of ['getItem', 'setItem']) {
			const original = Storage.prototype[method];
			Storage.prototype[method] = function (key, ...args) {
				if (key.startsWith('tracker-chart-height-')) throw new Error('Storage unavailable');
				return original.call(this, key, ...args);
			};
		}
	});
	await fixture(page);
	await page.goto('/tracker?region=nsw1&table=0');
	await ready(page);
	const handle = page.getByRole('separator', { name: 'Resize chart height' }).first();
	await handle.press('Home');
	await handle.press('ArrowUp');
	await expect(handle).toHaveAttribute('aria-valuenow', '120');
	await handle.press('End');
	await handle.press('ArrowDown');
	await expect(handle).toHaveAttribute('aria-valuenow', '800');
	await handle.press('Home');
	await handle.dispatchEvent('pointerdown', { pointerId: 7, button: 0, clientY: 200 });
	await page.evaluate(() => {
		window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 7 }));
		window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 7, clientY: 500 }));
	});
	await expect(handle).toHaveAttribute('aria-valuenow', '120');
});

test('calendar-filtered rolling data exports only the selected months', async ({ page }) => {
	await fixture(page);
	await page.goto('/tracker?region=nsw1&range=all&interval=12mr&filter=jan&table=0');
	const csv = await download(page, 'Generation');
	const content = await readFile(await csv.path(), 'utf8');
	const dates = content.split('\n').filter((line) => /^\d{4}-/.test(line));
	expect(dates.length).toBeGreaterThan(5);
	for (const line of dates) expect(line).toMatch(/^\d{4}-01-/);
	expect(content).toContain('(MWh)');
});
