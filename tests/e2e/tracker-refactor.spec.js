import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { inflateRawSync } from 'node:zlib';
import { MARKET_METRIC_NAMES } from '../../src/lib/components/charts/network/market-metric-names.js';

/** Deterministic network responses; no OE credentials or upstream timing required. */
async function fixture(
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
		if (metric === singleFailure) {
			singleFailure = '';
			return route.fulfill({ status: 500, json: { error: 'Upstream query timed out' } });
		}
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
		await route.fulfill({ json: { response: { data } } });
	});
	return {
		requests,
		urls,
		hold: (metric) => {
			held = metric;
		},
		fail: (metric) => {
			failing = metric;
		},
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

for (const group of ['detailed', 'simple']) {
	test(`rooftop interpolation is display-only and disclosed in ${group} grouping`, async ({
		page
	}, testInfo) => {
		await fixture(page);
		const start = Date.parse('2026-09-01T10:00:00+10:00');
		const end = start + 3.5 * 3_600_000;
		await page.route('**/api/network/data?**', async (route) => {
			const params = new URL(route.request().url()).searchParams;
			if (params.get('metric') !== 'power') return route.fallback();
			const from = Date.parse(params.get('date_start') + '+10:00');
			const to = Date.parse(params.get('date_end') + '+10:00');
			const first = Math.ceil(from / 300_000) * 300_000;
			const times = Array.from(
				{ length: Math.floor((to - first) / 300_000) + 1 },
				(_, index) => first + index * 300_000
			);
			await route.fulfill({
				json: {
					response: {
						data: [
							{
								metric: 'power',
								interval: '5m',
								results: ['solar_rooftop', 'solar_utility', 'wind'].map((fueltech) => ({
									columns: { fueltech },
									data: times.map((time) => [
										new Date(time + 10 * 3_600_000).toISOString().slice(0, 19) + '+10:00',
										fueltech === 'solar_rooftop'
											? Math.max(0, 100 + Math.floor((time - start) / 1_800_000) * 60)
											: 200
									])
								}))
							}
						]
					}
				}
			});
		});
		const hidden = group === 'detailed' ? 'wind,solar_utility' : 'wind';
		await page.goto(
			`/tracker?start=${start}&end=${end}&interval=5m&group=${group}&hidden=${hidden}&table=1`
		);
		const note = page.locator('#rooftop-interpolation-note');
		await expect(note).toContainText('linearly interpolated');
		await expect(note).toContainText('retain reported values');
		const solarRow = page
			.getByTestId('fuel-tech-row')
			.filter({ hasText: group === 'detailed' ? 'Rooftop' : 'Solar' })
			.first();
		await expect(solarRow).toHaveAttribute('aria-describedby', 'rooftop-interpolation-note');
		const cells = await solarRow.locator('td').allTextContents();
		expect(cells[2].trim()).toBe(group === 'detailed' ? '286' : '486');
		const tooltip = await hoverGeneration(page);
		await expect(tooltip).toContainText(group === 'detailed' ? '310' : '510');
		await expect(card(page, 'Generation')).toHaveAttribute(
			'data-tracker-png',
			/Rooftop solar.*interpolated/
		);
		const csv = await readFile(await (await download(page, 'Generation')).path(), 'utf8');
		expect(csv).not.toContain('_rooftopPower');
		// The 11:45 raw value is 280 MW (480 MW with utility solar), not the hover estimate.
		const line = csv.split('\n').find((row) => row.includes('2026-09-01 11:45:00'));
		expect(line).toBeTruthy();
		expect(line).toContain(group === 'detailed' ? '280' : '480');
		expect(line).not.toContain(group === 'detailed' ? '310' : '510');
		await expect(solarRow.locator('td')).toHaveText(cells);
		await page.screenshot({ path: testInfo.outputPath('rooftop-interpolation.png') });
		const closeMetrics = page.getByRole('button', { name: 'Hide metrics', exact: true });
		if (await closeMetrics.isVisible()) await closeMetrics.click();
		await page.setViewportSize({ width: 390, height: 844 });
		await note.scrollIntoViewIfNeeded();
		await expect(note).toBeVisible();
		expect(
			await note.evaluate((element) => {
				const style = getComputedStyle(element);
				return parseFloat(style.lineHeight) / parseFloat(style.fontSize);
			})
		).toBeGreaterThan(1.4);
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		await page.screenshot({ path: testInfo.outputPath('rooftop-interpolation-mobile.png') });
		await page.goto(
			`/tracker?start=${start}&end=${end}&interval=30m&group=${group}&hidden=${hidden}&table=1`
		);
		await expect(page.getByTestId('fuel-tech-row').first()).toBeVisible();
		await expect(note).toHaveCount(0);
		await expect(card(page, 'Generation')).not.toHaveAttribute('data-tracker-png', /interpolated/);
	});
}

test('live follow advances, pauses on zoom and resumes through presets and history', async ({
	page
}, testInfo) => {
	const source = await fixture(page, { comparisonGrowth: true });
	await page.clock.install({ time: new Date() });
	await page.goto('/tracker?region=nsw1&table=0');
	await expect(page.getByRole('switch', { name: 'Live' })).toHaveCount(0);
	await chartsSettled(page);
	await expect(page.getByTestId('reading-freshness')).toHaveCount(0);
	const first = source.urls.length;
	const history = await page.evaluate(() => window.history.length);
	await page.clock.fastForward(65_000);
	await expect.poll(() => source.urls.length).toBeGreaterThan(first);
	await chartsSettled(page);
	await expect(page.getByTestId('reading-freshness')).toHaveCount(0);
	expect(await page.evaluate(() => window.history.length)).toBe(history);
	await pauseByZoom(page, true);
	await expect(page).toHaveURL(/start=.*end=/);
	const paused = page.url();
	await expect(
		page.getByTestId('reading-freshness').filter({ hasText: 'Latest in view' })
	).toHaveCount(0);
	await page.clock.fastForward(120_000);
	expect(page.url()).toBe(paused);
	await page.getByRole('button', { name: '3D', exact: true }).click();
	await expect(page).not.toHaveURL(/start=|end=/);
	await expect(page.getByRole('switch', { name: 'Live' })).toHaveCount(0);
	await page.goBack();
	await expect(page).toHaveURL(paused);
	await expect(page.getByRole('button', { name: '3D', exact: true })).not.toHaveClass(/text-white/);
	await page.goForward();
	await expect(page.getByRole('switch', { name: 'Live' })).toHaveCount(0);
	await chartsSettled(page);
	await expect(page.getByTestId('reading-freshness')).toHaveCount(0);
	await page.screenshot({ path: testInfo.outputPath('tracker-live-desktop.png') });
	await page.setViewportSize({ width: 390, height: 844 });
	await expect(page.getByRole('switch', { name: 'Live' })).toHaveCount(0);
	await expect
		.poll(() => page.evaluate(() => document.documentElement.scrollWidth))
		.toBeLessThanOrEqual(390);
	await page.screenshot({ path: testInfo.outputPath('tracker-live-mobile.png') });
});

test('live freshness keeps failed and empty feeds explicit and recovers on the next tick', async ({
	page
}) => {
	const source = await fixture(page, {
		comparisonGrowth: true,
		fail: 'price',
		empty: 'emissions_intensity'
	});
	await page.clock.install({ time: new Date() });
	await page.goto('/tracker?region=nsw1&table=0');
	await expect(card(page, 'Market').getByTestId('reading-freshness')).toContainText(
		'Update unavailable'
	);
	await expect(card(page, 'Emissions').getByTestId('reading-freshness')).toContainText(
		'No readings'
	);
	await expect(card(page, 'Generation').getByTestId('reading-freshness')).toHaveCount(0);
	source.recover();
	await page.clock.fastForward(65_000);
	await expect(card(page, 'Market').getByTestId('reading-freshness')).toHaveCount(0);
	await expect(card(page, 'Emissions').getByTestId('reading-freshness')).toContainText(
		'No readings'
	);
});

test('freshness flags delayed readings but not a deliberately historical view', async ({
	page
}) => {
	await fixture(page, { comparisonGrowth: true, latestAt: Date.now() - 3_600_000 });
	await page.goto('/tracker?region=nsw1&table=0');
	await expect(card(page, 'Generation').getByTestId('reading-freshness')).toContainText(
		'Data delayed'
	);
	await expect(
		card(page, 'Generation').getByTestId('reading-freshness').locator('time')
	).toBeVisible();
	await pauseByZoom(page);
	await expect(card(page, 'Generation').getByTestId('reading-freshness')).toHaveCount(0);
});

test('live ticks stop while hidden and catch up once when visible without moving paused windows', async ({
	page
}) => {
	const source = await fixture(page, { comparisonGrowth: true });
	await page.clock.install({ time: new Date() });
	await page.goto('/tracker?region=nsw1&table=0');
	await chartsSettled(page);
	await expect(page.getByTestId('reading-freshness')).toHaveCount(0);
	// Let initial requests settle before testing the foreground-only live loop.
	await page.clock.fastForward(10_000);
	await page.evaluate(() => {
		Object.defineProperty(document, 'hidden', { configurable: true, value: true });
		document.dispatchEvent(new Event('visibilitychange'));
	});
	const before = source.urls.length;
	await page.clock.fastForward(300_000);
	expect(source.urls.length).toBe(before);
	await page.evaluate(() => {
		Object.defineProperty(document, 'hidden', { configurable: true, value: false });
		document.dispatchEvent(new Event('visibilitychange'));
	});
	await expect.poll(() => source.urls.length).toBeGreaterThan(before);
	await chartsSettled(page);
	await expect(page.getByTestId('reading-freshness')).toHaveCount(0);
	await pauseByZoom(page, true);
	await expect(
		page.getByTestId('reading-freshness').filter({ hasText: 'Latest in view' })
	).toHaveCount(0);
	await expect(page.getByTestId('tracker-loading')).toHaveCount(0);
	const paused = page.url();
	const count = source.urls.length;
	await page.clock.fastForward(300_000);
	expect(source.urls.length).toBe(count);
	expect(page.url()).toBe(paused);
});

test('window metrics use facility cards, signed displayed values and keyboard chart highlighting', async ({
	page
}, testInfo) => {
	const api = await fixture(page, { contributions: true, comparisonGrowth: true });
	const start = Date.parse('2026-08-01T00:00:00+10:00');
	await page.goto(`/tracker?start=${start}&end=${start + 2 * 86_400_000}&interval=30m`);
	const metrics = page.getByRole('region', { name: 'Window metrics' });
	const minimum = page.getByTestId('metric-generation-min');
	const maximum = page.getByTestId('metric-generation-max');
	await expect(minimum).toBeEnabled();
	await expect(minimum).toContainText('200');
	await expect(maximum).toContainText('400');
	await expect(minimum).toContainText('1 Aug 2026');
	await expect(maximum).toContainText('2 Aug 2026');
	await expect(metrics).not.toContainText('UTC+10:00');
	await expect(metrics.locator('button[data-testid]')).toHaveCount(8);
	await expect(metrics.getByText('Minimum', { exact: true })).toHaveCount(0);
	await expect(metrics.getByText('Maximum', { exact: true })).toHaveCount(0);
	await expect(
		page.getByTestId('metrics-generation').getByText('Net power', { exact: true })
	).toHaveCount(1);
	await expect(minimum).not.toContainText('Net power');
	for (const cell of [minimum, maximum]) {
		const fits = await cell.evaluate(
			(el) => el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth
		);
		expect(fits).toBe(true);
	}
	await expect(minimum).not.toHaveAttribute('title');
	await page.getByTestId('metrics-generation').getByText('Net power', { exact: true }).hover();
	await expect(page.locator('[data-tooltip-content]')).toContainText(
		'Selected technologies, including imports and subtracting loads.'
	);
	await page.mouse.move(0, 0);
	await page.getByTestId('metrics-generation').getByText('Net power', { exact: true }).focus();
	await expect(page.locator('[data-tooltip-content]')).toBeVisible();
	await page.getByTestId('metric-market-min').hover();
	await expect(
		page.locator('[data-tooltip-content]').filter({ hasText: 'Minimum spot price' })
	).toBeVisible();
	const requests = api.requests.length;
	await maximum.focus();
	await expect(
		page.locator('[data-tooltip-content]').filter({ hasText: 'Maximum net power' })
	).toBeVisible();
	await expect(card(page, 'Generation').getByTestId('chart-floating-tooltip')).toContainText(
		'2 Aug'
	);
	expect(api.requests.length).toBe(requests);
	await maximum.click();
	await page.mouse.move(0, 0);
	await expect(maximum).toHaveAttribute('aria-pressed', 'true');
	await expect(maximum.locator('svg')).toHaveCSS('width', '20px');
	await expect(maximum.locator('svg')).toHaveCSS('color', 'oklch(0.205 0 0)');
	await expect(minimum.locator('svg')).toHaveCSS('color', 'rgb(106, 106, 106)');
	await expect(maximum).toHaveCSS('border-left-width', '1px');
	await expect(card(page, 'Generation').getByTestId('chart-floating-tooltip')).toContainText(
		'2 Aug'
	);
	await expect(card(page, 'Market').getByTestId('chart-floating-tooltip')).toContainText('2 Aug');
	await minimum.hover();
	await expect(card(page, 'Generation').getByTestId('chart-floating-tooltip')).toContainText(
		'1 Aug'
	);
	await page.mouse.move(0, 0);
	await expect(card(page, 'Generation').getByTestId('chart-floating-tooltip')).toContainText(
		'2 Aug'
	);
	await minimum.click();
	await expect(minimum).toHaveAttribute('aria-pressed', 'true');
	await expect(maximum).toHaveAttribute('aria-pressed', 'false');
	await minimum.press('Enter');
	await expect(minimum).toHaveAttribute('aria-pressed', 'false');
	await expect(minimum.locator('svg')).toHaveCSS('color', 'rgb(106, 106, 106)');
	await page.getByTestId('fuel-tech-row').filter({ hasText: 'Coal' }).first().click();
	await expect(minimum).toContainText('100');
	await expect(maximum).toContainText('200');
	await metrics.scrollIntoViewIfNeeded();
	await expect(page.getByTestId('metric-demand-min')).toContainText('100');
	await expect(page.getByTestId('metric-demand-max')).toContainText('200');
	await expect(page.getByTestId('metric-emissions-min')).toHaveCount(0);
	await expect(page.getByTestId('metric-renewables-min')).toContainText('25');
	await expect(page.getByTestId('metric-renewables-max')).toContainText('%');
	await page.screenshot({ path: testInfo.outputPath('window-metrics-desktop.png') });
});

test('tracker slides one nav logo in place of the date range and overlays charts and table', async ({
	page
}, testInfo) => {
	await page.setViewportSize({ width: 1600, height: 1000 });
	const source = await fixture(page, { hold: 'power' });
	await page.goto('/tracker?region=nsw1&table=1');
	const loader = page.getByTestId('tracker-loading');
	const loadingStates = page.getByRole('status', { name: /Loading|Updating/ });
	await expect(loader).toBeVisible();
	await expect(loadingStates).toHaveCount(1);
	await expect(loader.locator('svg')).toHaveAttribute('viewBox', '70 6 24 16');
	const rangeStatus = page.getByTestId('tracker-range-status');
	const rangeLabel = page.getByTestId('tracker-range-label');
	const overlays = page.getByTestId('tracker-loading-overlay');
	await expect(rangeStatus.getByTestId('tracker-loading')).toBeVisible();
	await expect(rangeLabel).toHaveCSS('opacity', '0');
	await expect(overlays).toHaveCount(4);
	for (const overlay of await overlays.all()) {
		await expect(overlay).toHaveAttribute('data-active', 'true');
		await expect(overlay).toHaveCSS('pointer-events', 'none');
		await expect(overlay).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.65)');
	}
	await expect(page.getByTestId('metrics-pane').getByTestId('tracker-loading-overlay')).toHaveCount(
		0
	);
	await expect(
		page.locator('[data-testid="chart-loading"], [data-testid="table-loading"]')
	).toHaveCount(0);
	await expect(page.getByTestId('metrics-pane')).not.toContainText('Updating…');
	await page.screenshot({
		path: testInfo.outputPath('shared-loading-initial.png'),
		animations: 'disabled'
	});
	source.release();
	await expect(loader).toHaveCount(0);
	await expect(rangeLabel).toHaveCSS('opacity', '1');
	await expect(rangeLabel).not.toHaveText('');
	const dateBounds = await rangeStatus.boundingBox();
	await expect(page.getByTestId('fuel-tech-row').first()).toBeVisible();
	await expect(card(page, 'Generation').locator('header').first()).not.toContainText('30 min');
	source.hold('energy');
	await page.getByRole('button', { name: '30D', exact: true }).click();
	await expect(loader).toBeVisible();
	await expect(rangeLabel).toHaveCSS('opacity', '0');
	const loadingBounds = await rangeStatus.boundingBox();
	expect(loadingBounds.y).toBe(dateBounds.y);
	expect(loadingBounds.height).toBe(dateBounds.height);
	await expect(loadingStates).toHaveCount(1);
	await expect(page.getByTestId('fuel-tech-row').first()).toBeVisible();
	await page.screenshot({
		path: testInfo.outputPath('shared-loading-refresh.png'),
		animations: 'disabled'
	});
	// Grouping stays usable during a range refresh; the newest selection wins.
	await page.getByRole('button', { name: 'Fuel technology options', exact: true }).click();
	await page.getByRole('menuitemradio', { name: 'Detailed', exact: true }).click();
	await expect(page).toHaveURL(/group=detailed/);
	await expect(loader).toBeVisible();
	await expect(loadingStates).toHaveCount(1);
	await page.screenshot({
		path: testInfo.outputPath('shared-loading-group.png'),
		animations: 'disabled'
	});
	source.release();
	await expect(loader).toHaveCount(0);
	await expect(rangeLabel).toHaveCSS('opacity', '1');
	for (const overlay of await overlays.all()) await expect(overlay).toHaveCSS('opacity', '0');
	await expect(page.getByRole('columnheader', { name: /Technology/ })).toContainText('Detailed');
});

test('shared loading waits for table-only data after charts settle and fits mobile', async ({
	page
}, testInfo) => {
	const source = await fixture(page, { hold: 'market_value' });
	await page.goto('/tracker?region=nsw1&table=1&emissions=volume');
	const loader = page.getByTestId('tracker-loading');
	await expect(page.getByTestId('metric-generation-min')).toBeEnabled();
	await expect(page.getByTestId('metric-market-min')).toBeEnabled();
	await expect(page.getByTestId('metric-emissions-min')).toBeEnabled();
	await expect(loader).toBeVisible();
	await expect(page.getByRole('status', { name: /Loading|Updating/ })).toHaveCount(1);
	await page.screenshot({
		path: testInfo.outputPath('shared-loading-table.png'),
		animations: 'disabled'
	});
	await page.setViewportSize({ width: 390, height: 844 });
	await expect(loader).toBeInViewport();
	const bounds = await loader.locator('svg').boundingBox();
	expect(bounds.y + bounds.height).toBeLessThanOrEqual(60);
	expect(bounds.x).toBeGreaterThanOrEqual(0);
	expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await expect(loader).toHaveCSS('transition-duration', '0s');
	await expect(loader.locator('svg')).toHaveCSS('animation-name', 'none');
	await expect
		.poll(() =>
			page
				.getByTestId('tracker-loading-overlay')
				.first()
				.evaluate((el) => getComputedStyle(el, '::after').animationName)
		)
		.toBe('none');
	await page.screenshot({
		path: testInfo.outputPath('shared-loading-mobile.png'),
		animations: 'disabled'
	});
	source.release();
	await expect(loader).toHaveCount(0);
	await expect(page.getByTestId('fuel-tech-row').first()).toBeVisible();
});

test('shared loading clears on a failed refresh and retained table values stay stale until retry', async ({
	page
}) => {
	const source = await fixture(page);
	await page.goto('/tracker?region=nsw1&table=1');
	const panel = page.locator('#tracker-table-panel');
	await expect(panel.getByRole('table')).toBeVisible();
	await expect(page.getByTestId('tracker-loading')).toHaveCount(0);
	source.fail('energy');
	await page.getByRole('button', { name: '30D', exact: true }).click();
	await expect(panel.getByText('Could not load table data.')).toBeVisible();
	await expect(page.getByTestId('tracker-loading')).toHaveCount(0);
	const body = panel.locator('[aria-busy]');
	await expect(body).toHaveCSS('opacity', '0.4');
	await expect(body).toHaveAttribute('aria-busy', 'false');
	source.recover();
	await panel.getByRole('button', { name: 'Retry', exact: true }).click();
	await expect(panel.getByText('Could not load table data.')).toHaveCount(0);
	await expect(page.getByTestId('tracker-loading')).toHaveCount(0);
	await expect(body).toHaveCSS('opacity', '1');
	await expect(panel.getByRole('columnheader', { name: /Energy/ })).toBeVisible();
});

test('table header contains Show all and columns scroll without a switcher', async ({ page }) => {
	await fixture(page);
	await page.goto('/tracker?region=nsw1&table=1&hidden=coal');
	const panel = page.locator('#tracker-table-panel');
	const showAll = panel.getByRole('button', { name: 'Show all', exact: true });
	const heading = panel.getByRole('heading', { name: 'Fuel technologies' });
	await expect(showAll).toBeVisible();
	await expect(page.getByRole('group', { name: 'Table columns' })).toHaveCount(0);
	const headingBox = await heading.boundingBox();
	const buttonBox = await showAll.boundingBox();
	expect(buttonBox.x).toBeGreaterThan(headingBox.x + headingBox.width);
	expect(
		Math.abs(buttonBox.y + buttonBox.height / 2 - headingBox.y - headingBox.height / 2)
	).toBeLessThanOrEqual(1);
	await expect(panel.getByRole('table')).toBeVisible();
	const scroller = panel.getByRole('table').locator('xpath=..');
	const technology = panel.getByRole('columnheader', { name: /Technology/ });
	const before = await technology.boundingBox();
	await scroller.evaluate((element) => element.scrollTo({ left: 300, behavior: 'instant' }));
	await expect.poll(() => scroller.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
	expect((await technology.boundingBox()).x).toBeCloseTo(before.x, 0);
	await showAll.click();
	await expect(page).not.toHaveURL(/hidden=/);
	await expect(showAll).toHaveCount(0);
});

test('panel controls share generous targets, directional icons and keyboard focus', async ({
	page
}, testInfo) => {
	await fixture(page);
	await page.goto('/tracker?region=nsw1');
	await chartsSettled(page);
	const hideMetrics = page.getByRole('button', { name: 'Hide metrics', exact: true });
	const hideTable = page.getByRole('button', { name: 'Hide fuel tech table', exact: true });
	const showMetrics = page.getByRole('button', { name: 'Show metrics', exact: true });
	const showTable = page.getByRole('button', { name: 'Show fuel tech table', exact: true });
	for (const button of [hideMetrics, hideTable]) {
		const bounds = await button.boundingBox();
		expect(bounds.width).toBe(40);
		expect(bounds.height).toBe(40);
		expect((await button.locator('svg').boundingBox()).width).toBe(20);
		await expect(button.locator('svg')).toHaveAttribute('stroke-width', '1.5');
		await expect(button).toHaveAttribute('aria-expanded', 'true');
		await expect(button).toHaveCSS('color', 'rgb(106, 106, 106)');
	}
	expect((await hideMetrics.boundingBox()).y).toBe((await hideTable.boundingBox()).y);
	await expect(hideMetrics.locator('svg')).toHaveClass(/lucide-panel-left-close/);
	await expect(hideTable.locator('svg')).toHaveClass(/lucide-panel-right-close/);
	await hideMetrics.hover();
	await expect(hideMetrics).toHaveCSS('color', 'rgb(106, 106, 106)');
	await page.screenshot({ path: testInfo.outputPath('panels-open.png') });
	await hideMetrics.press('Enter');
	await expect(showMetrics).toBeFocused();
	await hideTable.press('Enter');
	await expect(showTable).toBeFocused();
	for (const button of [showMetrics, showTable]) {
		const bounds = await button.boundingBox();
		expect(bounds.width).toBe(40);
		expect(bounds.height).toBe(40);
		await expect(button).toHaveAttribute('aria-expanded', 'false');
		await expect(button.locator('svg')).toHaveCSS('width', '20px');
		await expect(button.locator('svg')).toHaveAttribute('stroke-width', '1.5');
		await expect(button).toHaveCSS('color', 'rgb(106, 106, 106)');
	}
	await expect(showMetrics.locator('svg')).toHaveClass(/lucide-panel-left-open/);
	await expect(showTable.locator('svg')).toHaveClass(/lucide-panel-right-open/);
	await expect(showTable).toHaveCSS('outline-style', 'solid');
	await page.screenshot({ path: testInfo.outputPath('panels-collapsed.png') });
	await showTable.press('Enter');
	await expect(hideTable).toBeFocused();
	await showMetrics.press('Enter');
	await expect(hideMetrics).toBeFocused();
	await expect(hideMetrics).toHaveCSS('outline-style', 'solid');
	await hideTable.click();
	await page.setViewportSize({ width: 390, height: 844 });
	await expect(hideMetrics).toBeVisible();
	await expect
		.poll(() => page.evaluate(() => document.documentElement.scrollWidth))
		.toBeLessThanOrEqual(390);
	await page.screenshot({ path: testInfo.outputPath('panels-mobile.png') });
});

test('fuel technology options move with the panel, support keyboard selection and fit mobile', async ({
	page
}, testInfo) => {
	await fixture(page);
	await page.goto('/tracker?region=nsw1');
	await chartsSettled(page);
	const trigger = page.getByRole('button', { name: 'Fuel technology options', exact: true });
	await expect(
		page
			.locator('#tracker-table-panel')
			.getByRole('button', { name: 'Fuel technology options', exact: true })
	).toBeVisible();
	const target = await trigger.boundingBox();
	expect(target.width).toBe(40);
	expect(target.height).toBe(40);
	await expect(trigger).toHaveCSS('color', 'rgb(106, 106, 106)');
	await expect(trigger.locator('svg')).toHaveCSS('width', '16px');
	await expect(trigger.locator('svg')).toHaveCSS('height', '16px');
	await expect(trigger.locator('svg')).toHaveAttribute('stroke-width', '1.5');
	await page.getByRole('button', { name: 'Options', exact: true }).click();
	const menuStyle = (element) => {
		const style = getComputedStyle(element);
		return ['fontFamily', 'fontSize', 'fontWeight', 'padding', 'gap', 'color', 'borderRadius'].map(
			(key) => style[key]
		);
	};
	const navRowStyle = await page
		.getByRole('menu')
		.getByRole('button', { name: 'Generation', exact: true })
		.evaluate(menuStyle);
	const navHeadingStyle = await page
		.getByRole('menu')
		.getByText('Download as CSV', { exact: true })
		.evaluate(menuStyle);
	await expect(page.getByRole('menu').getByRole('menuitemradio')).toHaveCount(0);
	await expect(page.getByRole('menu')).not.toContainText('Fuel tech grouping');
	await expect(page.getByRole('menu')).not.toContainText('Contribution');
	await page.getByRole('button', { name: 'Options', exact: true }).click();
	await trigger.press('Enter');
	const menu = page.getByRole('menu', { name: 'Fuel technology options' });
	await expect(menu.getByRole('menuitemradio')).toHaveCount(8);
	await expect(menu.getByRole('menuitemradio', { name: /^% / })).toHaveText([
		'% demand',
		'% generation'
	]);
	expect(
		await menu.getByRole('menuitemradio', { name: 'Detailed', exact: true }).evaluate(menuStyle)
	).toEqual(navRowStyle);
	expect(await menu.getByText('Fuel tech grouping', { exact: true }).evaluate(menuStyle)).toEqual(
		navHeadingStyle
	);
	await expect(
		menu.getByRole('menuitemradio', { name: 'Simplified', exact: true })
	).toHaveAttribute('aria-checked', 'true');
	await expect(menu.getByRole('menuitemradio', { name: '% demand', exact: true })).toHaveAttribute(
		'aria-checked',
		'true'
	);
	await page.screenshot({ path: testInfo.outputPath('fuel-options-desktop.png') });
	await page.keyboard.press('Home');
	await expect(menu.getByRole('menuitemradio', { name: 'Detailed', exact: true })).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(menu).toBeHidden();
	await expect(trigger).toBeFocused();
	await expect(page).toHaveURL(/group=detailed/);
	await expect(page.getByRole('columnheader', { name: /Technology/ })).toContainText('Detailed');
	await trigger.click();
	await menu.getByRole('menuitemradio', { name: '% generation', exact: true }).click();
	await expect(trigger).toBeFocused();
	await expect(page).toHaveURL(/contribution=generation/);
	await page.getByRole('button', { name: 'Hide fuel tech table', exact: true }).click();
	await expect(page.locator('#tracker-table-panel')).toHaveCount(0);
	await trigger.click();
	await expect(menu.getByRole('menuitemradio', { name: 'Detailed', exact: true })).toHaveAttribute(
		'aria-checked',
		'true'
	);
	await expect(
		menu.getByRole('menuitemradio', { name: '% generation', exact: true })
	).toHaveAttribute('aria-checked', 'true');
	await page.keyboard.press('Escape');
	await expect(trigger).toBeFocused();
	await page.setViewportSize({ width: 390, height: 844 });
	await trigger.click();
	const bounds = await menu.boundingBox();
	expect(bounds.x).toBeGreaterThanOrEqual(0);
	expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
	expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
	await page.screenshot({ path: testInfo.outputPath('fuel-options-mobile.png') });
	await page.keyboard.press('Escape');
	await expect(trigger).toBeFocused();
	await page.setViewportSize({ width: 390, height: 480 });
	await trigger.click();
	const shortBounds = await menu.boundingBox();
	expect(shortBounds.y).toBeGreaterThanOrEqual(0);
	expect(shortBounds.y + shortBounds.height).toBeLessThanOrEqual(480);
	await menu.getByRole('menuitemradio', { name: '% demand', exact: true }).click();
	await expect(menu).toBeHidden();
});

test('window metrics follow range and market modes without applying timeline transforms', async ({
	page
}) => {
	await fixture(page, { contributions: true, comparisonGrowth: true });
	const start = Date.parse('2026-08-01T00:00:00+10:00');
	await page.goto(
		`/tracker?start=${start}&end=${start + 2 * 86_400_000}&interval=30m&table=0&transform=proportion`
	);
	await expect(page.getByTestId('metric-generation-min')).toContainText('200');
	await expect(page.getByTestId('metric-generation-min')).toContainText('MW');
	await expect(page.getByTestId('metric-demand-min')).toContainText('100');
	await expect(page.getByTestId('metric-demand-max')).toContainText('200');
	await card(page, 'Market').getByRole('tab', { name: 'Market value', exact: true }).click();
	await expect(page.getByTestId('metric-market-max')).toBeEnabled();
	await expect(page.getByTestId('metrics-market')).toContainText('Market value');
	await card(page, 'Emissions').getByRole('tab', { name: 'Volume', exact: true }).click();
	await expect(page.getByTestId('metric-emissions-max')).toBeEnabled();
	await expect(page.getByTestId('metric-emissions-max')).toContainText('tCO₂e');
	await page.goto(
		`/tracker?start=${start + 86_400_000}&end=${Date.parse('2026-09-01T00:00:00+10:00')}&interval=1d&table=0`
	);
	await expect(page.getByTestId('metric-generation-min')).toBeEnabled();
	await expect(page.getByTestId('metrics-generation')).toContainText('Net energy');
	await expect(page.getByTestId('metric-generation-min')).toContainText('400');
	await expect(page.getByTestId('metric-generation-min')).toContainText('MWh');
	await expect(page.getByTestId('metric-demand-min')).toContainText('MWh');
	await expect(page.getByTestId('metric-demand-min')).toContainText('200');
});

test('window metrics never show held, failed or empty data as current', async ({ page }) => {
	const api = await fixture(page, { hold: 'price', empty: 'emissions' });
	await page.goto('/tracker?region=nsw1&table=0&emissions=volume');
	await expect.poll(() => api.requests.includes('power')).toBe(true);
	const price = page.getByTestId('metric-market-min');
	await expect(price).toBeDisabled();
	await expect(page.getByTestId('tracker-loading')).toBeVisible();
	await expect(price).not.toContainText('Updating…');
	api.release();
	await expect(price).toBeEnabled();
	const emissions = page.getByTestId('metric-emissions-min');
	await expect(emissions).toBeDisabled();
	await expect(emissions).toContainText('No complete intervals');
});

test('demand metrics wait for their feed and recover with the table and overlay closed', async ({
	page
}) => {
	const api = await fixture(page, { fail: 'demand' });
	await page.goto('/tracker?region=nsw1&table=0');
	const demand = page.getByTestId('metric-demand-min');
	await expect(page.getByRole('button', { name: 'Retry demand', exact: true })).toBeVisible();
	await expect(demand).toBeDisabled();
	await expect(demand).toContainText('Unavailable');
	await expect(page.getByTestId('metric-generation-min')).toBeEnabled();
	api.recover();
	await page.getByRole('button', { name: 'Retry demand', exact: true }).click();
	await expect(demand).toBeEnabled();
	await expect(demand).toContainText('100');
});

test('window metrics fit mobile in WEM', async ({ page }, testInfo) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await fixture(page, { contributions: true });
	await page.goto('/tracker?region=wem&table=0');
	await expect(page.getByRole('region', { name: 'Window metrics' })).toHaveCount(0);
	const chartWidth = (await card(page, 'Generation').boundingBox()).width;
	await page.getByRole('button', { name: 'Show metrics', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Hide metrics', exact: true })).toBeFocused();
	await expect(page.getByTestId('metric-generation-min')).toBeEnabled();
	const metrics = page.getByRole('region', { name: 'Window metrics' });
	await expect(metrics).not.toContainText('UTC+08:00');
	const bounds = await metrics.boundingBox();
	expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
	await expect
		.poll(() => page.evaluate(() => document.documentElement.scrollWidth))
		.toBeLessThanOrEqual(390);
	await page.screenshot({ path: testInfo.outputPath('window-metrics-mobile.png') });
	const resize = page.getByRole('separator', { name: 'Resize metrics panel' });
	await resize.press('End');
	await expect(resize).toHaveAttribute('aria-valuenow', '334');
	await expect
		.poll(() => page.evaluate(() => document.documentElement.scrollWidth))
		.toBeLessThanOrEqual(390);
	expect((await card(page, 'Generation').boundingBox()).width).toBe(chartWidth);
	await page.getByRole('button', { name: 'Hide metrics', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Show metrics', exact: true })).toBeFocused();
	await page.getByRole('button', { name: 'Show metrics', exact: true }).click();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('region', { name: 'Window metrics' })).toHaveCount(0);
});

test('metrics pane stays left with minimum and maximum columns, resizes without fetching and remembers its width', async ({
	page
}) => {
	const api = await fixture(page);
	await page.goto('/tracker?region=nsw1');
	await ready(page);
	await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
	const pane = page.getByTestId('metrics-pane');
	const handle = page.getByRole('separator', { name: 'Resize metrics panel' });
	const bounds = await pane.boundingBox();
	const chart = await card(page, 'Generation').boundingBox();
	expect(bounds.x + bounds.width).toBeLessThanOrEqual(chart.x);
	const divider = await handle.boundingBox();
	const metrics = await page.getByRole('region', { name: 'Window metrics' }).boundingBox();
	expect(metrics.x + metrics.width).toBeLessThanOrEqual(divider.x);
	expect(await pane.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
		'rgba(0, 0, 0, 0)'
	);
	expect(await handle.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
		'rgba(0, 0, 0, 0)'
	);
	const cells = await pane.locator('button[data-testid]').evaluateAll((buttons) =>
		buttons.map((button) => {
			const rect = button.getBoundingClientRect();
			return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
		})
	);
	for (let i = 0; i < cells.length; i += 2) {
		expect(cells[i].x).toBe(cells[0].x);
		expect(cells[i + 1].x).toBeGreaterThan(cells[i].x);
		expect(cells[i + 1].y).toBe(cells[i].y);
		expect(cells[i + 1].width).toBeCloseTo(cells[i].width, 0);
		if (i > 0) expect(cells[i].y).toBeGreaterThanOrEqual(cells[i - 2].y + cells[i - 2].height);
	}
	const requests = api.requests.length;
	const value = await page.getByTestId('metric-generation-min').textContent();
	const grip = await handle.boundingBox();
	await page.mouse.move(grip.x + grip.width / 2, grip.y + 80);
	await page.mouse.down();
	await page.mouse.move(grip.x + grip.width / 2 + 60, grip.y + 80);
	await page.mouse.up();
	await expect(handle).toHaveAttribute('aria-valuenow', '316');
	await handle.press('ArrowRight');
	await expect(handle).toHaveAttribute('aria-valuenow', '326');
	await expect(page.getByTestId('metric-generation-min')).toHaveText(value);
	expect(api.requests.length).toBe(requests);
	await page.reload();
	await expect(handle).toHaveAttribute('aria-valuenow', '326');
	await handle.press('End');
	await expect(handle).toHaveAttribute('aria-valuenow', '400');
	await page.getByRole('separator', { name: 'Resize table panel' }).press('End');
	expect((await card(page, 'Generation').boundingBox()).width).toBeGreaterThanOrEqual(340);
	await handle.press('Home');
	await handle.press('ArrowLeft');
	await expect(handle).toHaveAttribute('aria-valuenow', '224');
	await handle.dispatchEvent('pointerdown', { pointerId: 7, button: 0, clientX: 224 });
	await page.evaluate(() => {
		window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 7 }));
		window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 7, clientX: 500 }));
	});
	await expect(handle).toHaveAttribute('aria-valuenow', '224');
});

test('metrics resizing survives unavailable storage and narrower desktop widths', async ({
	page
}) => {
	await page.addInitScript(() => {
		for (const method of ['getItem', 'setItem']) {
			const original = Storage.prototype[method];
			Storage.prototype[method] = function (key, ...args) {
				if (key === 'tracker-metrics-width') throw new Error('Storage unavailable');
				return original.call(this, key, ...args);
			};
		}
	});
	await fixture(page);
	await page.goto('/tracker?region=nsw1');
	await ready(page);
	const handle = page.getByRole('separator', { name: 'Resize metrics panel' });
	await expect(handle).toHaveAttribute('aria-valuemax', '400');
	await handle.press('End');
	await expect(handle).toHaveAttribute('aria-valuenow', '400');
	await page.setViewportSize({ width: 1024, height: 768 });
	await expect(handle).toHaveAttribute('aria-valuenow', '328');
	await expect
		.poll(() => page.evaluate(() => document.documentElement.scrollWidth))
		.toBeLessThanOrEqual(1024);
	await page.getByRole('button', { name: 'Hide metrics', exact: true }).click();
	await page.getByRole('button', { name: 'Show metrics', exact: true }).click();
	await expect(handle).toHaveAttribute('aria-valuenow', '328');
});

test('window metrics recover from a failed chart without presenting an old value', async ({
	page
}) => {
	const api = await fixture(page, { fail: 'price' });
	await page.goto('/tracker?region=nsw1&table=0');
	const minimum = page.getByTestId('metric-market-min');
	await expect(minimum).toContainText('Unavailable — retry the chart');
	await expect(minimum).toBeDisabled();
	await expect(minimum).toContainText('--');
	api.recover();
	await card(page, 'Market').getByRole('button', { name: 'Retry', exact: true }).click();
	await expect(minimum).toBeEnabled();
	await expect(minimum).toContainText('50');
});

async function openPng(page) {
	await page.getByRole('button', { name: 'Options', exact: true }).click();
	await page.getByRole('button', { name: 'Export PNG', exact: true }).click();
	return page.getByRole('dialog', { name: 'Export PNG' });
}

test('PNG exports selected Stratum layers, legends and edited captions as the exact preview', async ({
	page
}, testInfo) => {
	await fixture(page, { contributions: true });
	await page.goto('/tracker?region=nsw1&range=7d&table=0');
	await ready(page);
	await expect
		.poll(() => card(page, 'Generation').getAttribute('data-tracker-png'))
		.toContain('"ready":true');
	// Record canvas text to verify provenance and legends in the bitmap, not just UI copy.
	await page.evaluate(() => {
		window.__pngText = [];
		const original = CanvasRenderingContext2D.prototype.fillText;
		CanvasRenderingContext2D.prototype.fillText = function (...args) {
			window.__pngText.push(args[0]);
			return original.apply(this, args);
		};
	});
	const dialog = await openPng(page);
	await dialog.getByRole('checkbox', { name: 'Market', exact: true }).uncheck();
	await dialog.getByRole('checkbox', { name: 'Emissions', exact: true }).uncheck();
	await dialog.getByLabel('Title', { exact: true }).fill('New South Wales electricity');
	await dialog
		.getByLabel('Description', { exact: true })
		.fill('Generation and charging — a frozen view.');
	await expect(dialog.getByRole('button', { name: 'Download PNG' })).toBeEnabled();
	const previewBytes = await dialog
		.getByRole('img')
		.evaluate(async (img) =>
			Array.from(new Uint8Array(await (await fetch(img.src)).arrayBuffer()))
		);
	const downloading = page.waitForEvent('download');
	await dialog.getByRole('button', { name: 'Download PNG' }).click();
	const download = await downloading;
	const bytes = await readFile(await download.path());
	expect(bytes.equals(Buffer.from(previewBytes))).toBe(true);
	expect(bytes.subarray(1, 4).toString()).toBe('PNG');
	expect(bytes.readUInt32BE(16)).toBeGreaterThanOrEqual(1280);
	const text = (await page.evaluate(() => window.__pngText)).join('\n');
	for (const caption of [
		'New South Wales electricity',
		'Generation and charging',
		'UTC+10:00',
		'Coal',
		'Battery (Charging)',
		'Source: Open Electricity'
	])
		expect(text).toContain(caption);
	// Actual coloured chart pixels, not merely a successfully encoded white canvas.
	const colourPixels = await dialog.getByRole('img').evaluate((img) => {
		const canvas = document.createElement('canvas');
		canvas.width = img.naturalWidth;
		canvas.height = img.naturalHeight;
		const ctx = canvas.getContext('2d');
		ctx.drawImage(img, 0, 0);
		const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
		let count = 0;
		for (let i = 0; i < pixels.length; i += 4)
			if (
				Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) -
					Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) >
				40
			)
				count++;
		return count;
	});
	expect(colourPixels).toBeGreaterThan(10000);
	await download.saveAs(testInfo.outputPath('tracker-export.png'));
	await page.screenshot({ path: testInfo.outputPath('png-dialog.png') });
	await dialog.getByRole('checkbox', { name: 'Generation', exact: true }).uncheck();
	await expect(dialog.getByRole('alert')).toContainText('Select at least one ready chart');
	await expect(dialog.getByRole('button', { name: 'Download PNG' })).toBeDisabled();
	await dialog.getByRole('button', { name: 'Close', exact: true }).click();
	await expect(dialog).toBeHidden();
});

test('PNG prevents held-frame export and freezes readiness until reopened', async ({ page }) => {
	const api = await fixture(page, { hold: 'price' });
	await page.goto('/tracker?region=nsw1&table=0');
	await expect.poll(() => api.requests.includes('power')).toBe(true);
	const dialog = await openPng(page);
	await expect(dialog.getByRole('checkbox', { name: /Market/ })).toBeDisabled();
	await expect(dialog.getByRole('button', { name: 'Download PNG' })).toBeDisabled();
	api.release();
	await expect
		.poll(() => card(page, 'Market').getAttribute('data-tracker-png'))
		.toContain('"ready":true');
	await expect(dialog.getByRole('checkbox', { name: /Market/ })).toBeDisabled();
	await dialog.getByRole('button', { name: 'Close', exact: true }).click();
	const reopened = await openPng(page);
	await expect(reopened.getByRole('checkbox', { name: 'Market', exact: true })).toBeEnabled();
	await expect(reopened.getByRole('button', { name: 'Download PNG' })).toBeEnabled();
	await page.keyboard.press('Escape');
	await expect(reopened).toBeHidden();
});

test('PNG captures average-day charts and fits a narrow screen', async ({ page }, testInfo) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await fixture(page, { contributions: true });
	await page.goto('/tracker?view=average&profile-end=2026-08-31&profile-series=wind');
	await expect(page.locator('[data-tracker-png]')).toHaveCount(2);
	const dialog = await openPng(page);
	await expect(dialog.getByRole('checkbox')).toHaveCount(2);
	await expect(dialog.getByRole('button', { name: 'Download PNG' })).toBeEnabled();
	const bounds = await dialog.boundingBox();
	expect(bounds.x).toBeGreaterThanOrEqual(0);
	expect(bounds.width).toBeLessThanOrEqual(390);
	const downloading = page.waitForEvent('download');
	await dialog.getByRole('button', { name: 'Download PNG' }).click();
	await (await downloading).saveAs(testInfo.outputPath('average-day-export.png'));
	await page.screenshot({ path: testInfo.outputPath('png-mobile.png') });
});

test('PNG excludes confirmed empty charts while keeping ready charts selectable', async ({
	page
}) => {
	await fixture(page, { empty: 'price' });
	await page.goto('/tracker?region=nsw1&table=0');
	await expect(card(page, 'Market').getByText('No data for this range.')).toBeVisible();
	await expect
		.poll(() => card(page, 'Generation').getAttribute('data-tracker-png'))
		.toContain('"ready":true');
	const dialog = await openPng(page);
	await expect(dialog.getByRole('checkbox', { name: /Market/ })).toBeDisabled();
	await expect(dialog.getByRole('checkbox', { name: 'Generation', exact: true })).toBeChecked();
	await expect(dialog.getByRole('button', { name: 'Download PNG' })).toBeEnabled();
});

test('PNG supports percentage overlays and comparisons without refetching and can retry rendering', async ({
	page
}, testInfo) => {
	const api = await fixture(page, { contributions: true, comparisonGrowth: true });
	const a = Date.parse('2026-08-01T00:00:00+10:00');
	const b = a + 86_400_000;
	await page.goto(
		`/tracker?start=${a}&end=${b + 86_400_000}&interval=30m&table=0&transform=proportion&contribution=demand&overlay=demand`
	);
	await expect
		.poll(() => card(page, 'Generation').getAttribute('data-tracker-png'))
		.toContain('"ready":true');
	await card(page, 'Generation')
		.getByRole('button', { name: 'Compare dates', exact: true })
		.click();
	await expect(
		page
			.getByRole('region', { name: 'Two-date comparison' })
			.getByRole('button', { name: 'Download comparison CSV' })
	).toBeEnabled();
	const metadata = await card(page, 'Generation')
		.locator('[data-chart-image]')
		.getAttribute('data-chart-image');
	expect(metadata).toContain('% of gross demand');
	expect(metadata).toContain('Demand');
	const count = api.requests.length;
	await page.evaluate(() => {
		window.__originalContext = HTMLCanvasElement.prototype.getContext;
		HTMLCanvasElement.prototype.getContext = () => null;
	});
	const dialog = await openPng(page);
	await expect(dialog.getByRole('checkbox')).toHaveCount(4);
	await expect(dialog.getByRole('alert')).toContainText('not supported');
	await expect(dialog.getByRole('button', { name: 'Download PNG' })).toBeDisabled();
	await page.evaluate(() => {
		HTMLCanvasElement.prototype.getContext = window.__originalContext;
	});
	await dialog.getByRole('button', { name: 'Retry preview' }).click();
	await expect(dialog.getByRole('button', { name: 'Download PNG' })).toBeEnabled();
	const downloading = page.waitForEvent('download');
	await dialog.getByRole('button', { name: 'Download PNG' }).click();
	await (await downloading).saveAs(testInfo.outputPath('percentage-comparison-export.png'));
	expect(api.requests.length).toBe(count);
});

test('two-date comparison uses signed displayed values, Stratum bars, CSV and history without fetching', async ({
	page
}, testInfo) => {
	const api = await fixture(page, { contributions: true, comparisonGrowth: true });
	const a = Date.parse('2026-08-01T00:00:00+10:00');
	const b = a + 86_400_000;
	await page.goto(`/tracker?start=${a}&end=${b + 86_400_000}&interval=30m&table=0`);
	await expect(page.getByTestId('metric-generation-min')).toBeEnabled();
	await card(page, 'Generation')
		.getByRole('button', { name: 'Compare dates', exact: true })
		.click();
	const panel = page.getByRole('region', { name: 'Two-date comparison' });
	await expect(panel.getByRole('combobox', { name: 'Date A', exact: true })).toBeEnabled();
	await panel.getByRole('combobox', { name: 'Date A', exact: true }).selectOption(String(a));
	await panel.getByRole('combobox', { name: 'Date B', exact: true }).selectOption(String(b));
	const coal = panel
		.getByRole('row')
		.filter({ has: page.getByRole('rowheader', { name: 'Coal', exact: true }) });
	await expect(coal.getByRole('cell')).toHaveText(['100', '200', '100', '100.0%']);
	const load = panel
		.getByRole('row')
		.filter({ has: page.getByRole('rowheader', { name: 'Battery (Charging)', exact: true }) });
	await expect(load.getByRole('cell')).toHaveText(['-400', '-800', '-400', '-100.0%']);
	await expect(
		panel
			.getByRole('rowgroup', { name: 'Sources' })
			.getByRole('rowheader', { name: 'Coal', exact: true })
	).toBeVisible();
	await expect(
		panel
			.getByRole('rowgroup', { name: 'Loads' })
			.getByRole('rowheader', { name: 'Battery (Charging)', exact: true })
	).toBeVisible();
	await expect(
		panel
			.getByRole('rowgroup', { name: 'Sources' })
			.getByRole('rowheader', { name: 'Battery (Charging)', exact: true })
	).toHaveCount(0);
	const axisLabels = panel.locator('.x-axis-rotated text');
	await expect(axisLabels.first()).toBeVisible();
	expect(await axisLabels.first().evaluate((el) => getComputedStyle(el).fill)).toBe(
		'rgb(53, 53, 53)'
	);

	await expect(panel.locator('.stratum-chart .stacked-bar rect')).toHaveCount(4);
	await panel.locator('.stacked-bar rect').first().hover();
	await expect(panel.locator('.stratum-chart')).toContainText('Wind');
	await panel.getByRole('button', { name: 'Coal', exact: true }).focus();
	await expect(panel.locator('.stratum-chart')).toContainText('Coal');
	const requestCount = api.requests.length;
	const csvDownload = page.waitForEvent('download');
	await panel.getByRole('button', { name: 'Download comparison CSV' }).click();
	const csv = await readFile(await (await csvDownload).path(), 'utf8');
	expect(csv).toContain('Change B − A (MW)');
	expect(csv).toContain(',-400,-800,-400,-100');
	await panel.getByRole('button', { name: 'Swap A and B' }).click();
	await expect(coal.getByRole('cell')).toHaveText(['200', '100', '-100', '-50.0%']);
	await page.goBack();
	await expect(coal.getByRole('cell')).toHaveText(['100', '200', '100', '100.0%']);
	expect(api.requests.length).toBe(requestCount);
	const link = page.url();
	await page.reload();
	await expect(coal.getByRole('cell')).toHaveText(['100', '200', '100', '100.0%']);
	expect(page.url()).toBe(link);
	await panel.scrollIntoViewIfNeeded();
	await page.screenshot({ path: testInfo.outputPath('two-date-comparison.png'), fullPage: true });
	await page.setViewportSize({ width: 390, height: 844 });
	await expect(panel).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.screenshot({
		path: testInfo.outputPath('two-date-comparison-mobile.png'),
		fullPage: true
	});
});

test('comparison rejects stale range dates and waits for failed or missing generation', async ({
	page
}) => {
	const api = await fixture(page, { fail: 'power' });
	const a = Date.parse('2026-08-01T00:00:00+08:00');
	const b = a + 86_400_000;
	await page.goto(
		`/tracker?region=wem&start=${a}&end=${b + 86_400_000}&interval=30m&table=0&compare=1&compare-a=${a}&compare-b=${b}`
	);
	const panel = page.getByRole('region', { name: 'Two-date comparison' });
	await expect(panel).toContainText('Comparison unavailable');
	await expect(panel.getByRole('button', { name: 'Download comparison CSV' })).toBeDisabled();
	const retry = card(page, 'Generation').getByRole('button', { name: 'Retry', exact: true });
	// Wait for bounded automatic retries to finish before recovering the fixture.
	// Otherwise an in-flight automatic retry can succeed and remove this button.
	await expect(retry).toBeVisible();
	api.recover();
	await retry.click();
	await expect(panel.getByRole('button', { name: 'Download comparison CSV' })).toBeEnabled();
	await expect(panel).toContainText('UTC+08:00');
	await page.getByRole('button', { name: '3D', exact: true }).click();
	await expect(panel).toContainText('Select two available intervals');
	await expect(panel.getByRole('button', { name: 'Download comparison CSV' })).toBeDisabled();
	await expect(panel.locator('.stratum-chart')).toHaveCount(0);
	await panel.getByRole('button', { name: 'Close comparison' }).click();
	await expect(panel).toBeHidden();
	expect(new URL(page.url()).searchParams.has('compare-a')).toBe(false);
});

test('comparison uses raw energy despite timeline transforms and follows visibility and grouping', async ({
	page
}) => {
	await fixture(page, { contributions: true, comparisonGrowth: true });
	const start = Date.parse('2026-07-01T00:00:00+10:00');
	const end = Date.parse('2026-09-01T00:00:00+10:00');
	const a = Date.parse('2026-08-01T00:00:00+10:00');
	const b = a + 86_400_000;
	await page.goto(
		`/tracker?start=${start}&end=${end}&interval=1d&table=0&transform=proportion&hidden=wind&compare=1&compare-a=${a}&compare-b=${b}`
	);
	const panel = page.getByRole('region', { name: 'Two-date comparison' });
	await expect(panel.getByRole('combobox', { name: 'Date A', exact: true })).toBeEnabled();
	const coal = panel
		.getByRole('row')
		.filter({ has: page.getByRole('rowheader', { name: 'Coal', exact: true }) });
	await expect(coal.getByRole('cell')).toHaveText(['100', '200', '100', '100.0%']);
	await expect(panel.getByRole('columnheader', { name: 'A MWh', exact: true })).toBeVisible();
	await expect(panel.getByRole('rowheader', { name: 'Wind', exact: true })).toHaveCount(0);
	const csvDownload = page.waitForEvent('download');
	await panel.getByRole('button', { name: 'Download comparison CSV' }).click();
	expect(await readFile(await (await csvDownload).path(), 'utf8')).toContain('Change B − A (MWh)');
	await page.getByRole('button', { name: 'Fuel technology options', exact: true }).click();
	await page.getByRole('menuitemradio', { name: 'Detailed', exact: true }).click();
	await expect(panel.getByRole('rowheader', { name: 'Coal (Black)', exact: true })).toBeVisible();
	await expect(panel.getByRole('rowheader', { name: 'Wind', exact: true })).toBeVisible();
	await expect(panel.getByRole('combobox', { name: 'Date A', exact: true })).toHaveValue(String(a));
});

test('Stratum profiles support hover, keyboard pinning, legend filtering and bounded zoom without fetching', async ({
	page
}, testInfo) => {
	const api = await fixture(page, { contributions: true });
	await page.goto('/tracker?view=daily&profile-end=2026-08-31&profile-series=wind');
	const stack = page.getByRole('region', {
		name: 'Average day fuel technology stack',
		exact: true
	});
	await expect(stack.locator('path.path-area')).toHaveCount(4);
	await expect(stack.locator('path.path-area').first()).toHaveAttribute('d', /C/);
	// At midnight each layer starts at the previous layer's signed cumulative
	// edge, including across negative charging — never an independent baseline.
	const edges = await stack.locator('path.path-area').evaluateAll((paths) =>
		paths.map((path) => {
			const pairs = path.getAttribute('d').match(/-?[\d.]+,-?[\d.]+/g);
			return {
				end: Number(pairs[0].split(',')[1]),
				start: Number(pairs.at(-1).split(',')[1])
			};
		})
	);
	for (let i = 1; i < edges.length; i++) expect(edges[i].start).toBeCloseTo(edges[i - 1].end, 2);
	const area = stack.locator('.stratum-chart-area');
	await area.hover({ position: { x: 200, y: 120 } });
	await expect(stack.getByTestId('chart-floating-tooltip')).toBeVisible();
	await expect(stack.getByTestId('chart-floating-tooltip')).toContainText('UTC+10:00');
	await expect(stack.getByTestId('chart-floating-tooltip')).not.toContainText('2000');
	await page.mouse.move(0, 0);
	const inspect = stack.getByRole('button', { name: 'Inspect values' });
	await inspect.click();
	await inspect.press('ArrowRight');
	await expect(stack.getByTestId('chart-floating-tooltip')).toContainText('00:30–01:00');
	await inspect.press('Enter');
	await page.mouse.move(0, 0);
	await expect(stack.getByTestId('chart-floating-tooltip')).toBeVisible();
	await inspect.press('Escape');
	await expect(stack.getByTestId('chart-floating-tooltip')).toBeHidden();
	await stack.getByRole('button', { name: 'Coal', exact: true }).click();
	await expect(stack.locator('path.path-area')).toHaveCount(3);
	await expect(stack.getByRole('button', { name: 'Coal', exact: true })).toHaveAttribute(
		'aria-pressed',
		'false'
	);
	await stack.getByRole('button', { name: 'Zoom in', exact: true }).click();
	await expect(stack.getByRole('button', { name: 'Zoom out', exact: true })).toBeEnabled();
	await stack.getByRole('button', { name: 'Enable pan and zoom', exact: true }).click();
	await area.scrollIntoViewIfNeeded();
	const bounds = await area.boundingBox();
	await page.mouse.move(bounds.x + 100, bounds.y + 120);
	await page.mouse.down();
	await page.mouse.move(bounds.x + 650, bounds.y + 120, { steps: 8 });
	await page.mouse.up();
	await expect(stack.locator('.x-axis .tick text').first()).toHaveText('00:00');
	await stack.getByRole('button', { name: 'Reset day view' }).click();
	await expect(stack.getByRole('button', { name: 'Zoom out', exact: true })).toBeDisabled();
	const resize = stack.getByRole('separator', { name: 'Resize chart height' });
	const grip = await resize.boundingBox();
	const beforeHeight = (await area.boundingBox()).height;
	await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
	await page.mouse.down();
	await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2 + 50, { steps: 5 });
	await page.mouse.up();
	await expect.poll(async () => (await area.boundingBox()).height).toBeGreaterThan(beforeHeight);
	const individual = page.getByRole('group', { name: 'Wind interactive chart', exact: true });
	await expect(individual.locator('.stratum-chart')).toBeVisible();
	await expect(individual.locator('path.path-line')).toHaveCount(8);
	await expect(individual.locator('path.path-line').first()).toHaveAttribute('d', /C/);
	await individual.scrollIntoViewIfNeeded();
	await individual.locator('.stratum-chart-area').hover({ position: { x: 200, y: 120 } });
	await expect(individual.getByTestId('chart-floating-tooltip')).toContainText('Average');
	expect(api.requests).toEqual(['power']);
	await page.screenshot({
		path: testInfo.outputPath('stratum-profile-interaction.png'),
		fullPage: true
	});
});

test('average-day stack includes every technology and persists beside price without duplicate power requests', async ({
	page
}, testInfo) => {
	const api = await fixture(page, { contributions: true });
	await page.goto('/tracker?view=average&profile-end=2026-08-31&hidden=coal&profile-series=wind');
	const stack = page.getByRole('region', {
		name: 'Average day fuel technology stack',
		exact: true
	});
	await expect(stack.locator('.stratum-chart')).toBeVisible();
	await expect(stack.locator('path.path-area')).toHaveCount(4);
	await expect(stack.getByRole('button', { name: 'Coal', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await stack.getByText('All-technology averages and coverage', { exact: true }).click();
	const row = stack
		.getByRole('row')
		.filter({ has: page.getByRole('rowheader', { name: '00:00', exact: true }) });
	await expect(row).toContainText('100 (7)');
	await expect(row).toContainText('-400 (7)');
	expect(api.requests.filter((metric) => metric === 'power')).toHaveLength(1);
	await page.getByRole('combobox', { name: 'Metric', exact: true }).selectOption('price');
	await expect(page.getByRole('heading', { name: /Spot price/ })).toBeVisible();
	await expect(
		page
			.getByRole('group', { name: 'Spot price interactive chart', exact: true })
			.locator('path.path-line')
	).not.toHaveAttribute('d', /C/);
	await expect(stack.locator('.stratum-chart')).toBeVisible();
	expect(api.requests.filter((metric) => metric === 'power')).toHaveLength(1);
	await page.getByRole('combobox', { name: 'View', exact: true }).selectOption('daily');
	await expect(stack.locator('path.path-area')).toHaveCount(4);
	await page.getByRole('button', { name: 'Fuel technology options', exact: true }).click();
	await page.getByRole('menuitemradio', { name: 'Detailed', exact: true }).click();
	await expect(stack).toContainText('Detailed');
	await expect(stack.getByRole('button', { name: 'Coal (Black)', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await stack.getByText('All-technology averages and coverage', { exact: true }).click();
	await page.screenshot({ path: testInfo.outputPath('average-day-stack.png'), fullPage: true });
});

test('time-of-day profiles keep requests bounded and reproduce selections, coverage and CSV', async ({
	page
}) => {
	const api = await fixture(page);
	await page.goto('/tracker?region=wem&view=average&profile-end=2026-08-31&profile-series=wind');
	const profile = page.getByRole('region', { name: 'Time-of-day analysis' });
	await expect(profile.getByRole('button', { name: 'Download profile CSV' })).toBeEnabled();
	await expect(profile.getByRole('combobox', { name: 'Fuel technology', exact: true })).toHaveValue(
		'wind'
	);
	await expect(profile).toContainText('2026-08-25 to 2026-08-31 · UTC+08:00');
	expect(api.requests).toEqual(['power']);
	await profile.getByRole('combobox', { name: 'View', exact: true }).selectOption('daily');
	await expect(profile.getByRole('button', { name: '2026-08-31', exact: true })).toBeVisible();
	await profile
		.getByRole('combobox', { name: 'Fuel technology', exact: true })
		.selectOption('coal');
	await profile.getByRole('button', { name: '2026-08-31', exact: true }).click();
	await expect(profile.getByRole('button', { name: '2026-08-31', exact: true })).toHaveAttribute(
		'aria-pressed',
		'false'
	);
	expect(api.requests).toEqual(['power']);
	for (const days of [14, 28]) {
		await profile.getByRole('combobox', { name: 'Window', exact: true }).selectOption(String(days));
		await expect(profile.getByRole('button', { name: 'Download profile CSV' })).toBeEnabled();
		await expect(profile.getByRole('button', { name: /2026-\d\d-\d\d/, exact: true })).toHaveCount(
			days
		);
	}
	for (const url of api.urls) {
		const params = new URL(url).searchParams;
		const start = Date.parse(`${params.get('date_start')}+08:00`);
		const end = Date.parse(`${params.get('date_end')}+08:00`);
		expect(end - start).toBeLessThanOrEqual(28 * 86_400_000);
		expect(params.get('interval')).toBe('5m');
		expect(params.get('date_end')).toBe('2026-09-01T00:00:00');
	}
	await profile.getByText('Profile data and coverage', { exact: true }).click();
	await expect(
		profile
			.getByRole('row')
			.filter({ has: page.getByRole('rowheader', { name: '00:00', exact: true }) })
	).toContainText('28/28');
	const saved = page.waitForEvent('download');
	await profile.getByRole('button', { name: 'Download profile CSV' }).click();
	const csv = await readFile(await (await saved).path(), 'utf8');
	expect(csv).toContain('Average (MW),Days available');
	expect(csv).toContain('UTC+08:00,Coal,00:00,100,28,100,6');
	const url = await copyTrackerLink(page);
	expect(new URL(url).searchParams.get('view')).toBe('daily');
	await page.goto(url);
	await expect(profile.getByRole('combobox', { name: 'Window', exact: true })).toHaveValue('28');
	await expect(profile.getByRole('combobox', { name: 'View', exact: true })).toHaveValue('daily');
	await expect(profile.getByRole('combobox', { name: 'Fuel technology', exact: true })).toHaveValue(
		'coal'
	);
	await expect(profile.getByRole('button', { name: 'Download profile CSV' })).toBeEnabled();
	await profile.getByRole('combobox', { name: 'Metric', exact: true }).selectOption('price');
	await expect(profile.getByRole('heading', { name: /Spot price/ })).toBeVisible();
	await page.goBack();
	await expect(profile.getByRole('combobox', { name: 'Metric', exact: true })).toHaveValue('power');
	await expect(profile.getByRole('combobox', { name: 'Fuel technology', exact: true })).toHaveValue(
		'coal'
	);
});

test('time-of-day switches preserve timeline bounds and fit narrow screens', async ({
	page
}, testInfo) => {
	await fixture(page);
	await page.goto(
		'/tracker?view=daily&profile-end=2026-08-31&profile-days=14&range=30d&interval=1h&hidden=coal&transform=proportion'
	);
	const original = new URL(page.url()).searchParams;
	await expect(page.getByRole('button', { name: 'Download profile CSV' })).toBeEnabled();
	await page.getByRole('button', { name: 'Time of day', exact: true }).click();
	await page
		.getByRole('listbox', { name: 'Analysis view' })
		.getByRole('option', { name: 'Timeline', exact: true })
		.click();
	await expect(page.getByRole('button', { name: 'Timeline', exact: true })).toBeVisible();
	await expect(card(page, 'Generation')).toBeVisible();
	for (const key of ['range', 'interval', 'hidden', 'transform'])
		expect(new URL(page.url()).searchParams.get(key)).toBe(original.get(key));
	await page.goBack();
	await expect(page.getByRole('button', { name: 'Time of day', exact: true })).toBeVisible();
	await expect(page.getByRole('combobox', { name: 'View', exact: true })).toHaveValue('daily');
	await expect(page.getByRole('button', { name: 'Download profile CSV' })).toBeEnabled();
	await page.setViewportSize({ width: 390, height: 844 });
	await expect(page.getByRole('combobox', { name: 'Window', exact: true })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
		true
	);
	await page.screenshot({ path: testInfo.outputPath('time-of-day-mobile.png'), fullPage: true });
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.screenshot({ path: testInfo.outputPath('time-of-day-desktop.png'), fullPage: true });
});

test('time-of-day failures and empty results remain explicit; switching metric cannot export stale data', async ({
	page
}) => {
	const api = await fixture(page, { fail: 'power', hold: 'price' });
	await page.goto('/tracker?view=average&profile-end=2026-08-31');
	await expect(page.getByRole('alert')).toContainText('Fixture failure');
	await expect(page.getByRole('button', { name: 'Download profile CSV' })).toBeDisabled();
	api.recover();
	await page.getByRole('button', { name: 'Retry profile' }).click();
	await expect(page.getByRole('button', { name: 'Download profile CSV' })).toBeEnabled();
	await page.getByRole('combobox', { name: 'Metric', exact: true }).selectOption('price');
	await expect(page.getByRole('button', { name: 'Download profile CSV' })).toBeDisabled();
	await expect(page.getByRole('status')).toContainText('Loading time-of-day');
	api.release();
	await expect(page.getByRole('button', { name: 'Download profile CSV' })).toBeEnabled();
	await fixture(page, { empty: 'power' });
	await page.getByRole('combobox', { name: 'Metric', exact: true }).selectOption('power');
	// Use a new window so the successful response cache cannot satisfy it.
	await page.getByLabel('Last day', { exact: true }).fill('2026-07-31');
	await expect(page.getByRole('status')).toContainText('No time-of-day data');
	await expect(page.getByRole('button', { name: 'Download profile CSV' })).toBeDisabled();
});

async function percentageView(page) {
	const generation = card(page, 'Generation');
	// The SVG mounts before data; wait for the chart before targeting its toolbar.
	await expect(generation.locator('path.path-area').first()).toHaveAttribute('d', /M/);
	await generation.getByRole('button', { name: 'Toggle chart options' }).click();
	await generation.getByRole('tab', { name: 'Proportion', exact: true }).click();
	// The contribution note moves the chart toolbar; close outside that moving target.
	await generation.getByRole('heading', { name: 'Generation', exact: true }).click();
	await expect(generation.getByRole('tab', { name: 'Proportion', exact: true })).toBeHidden();
	return generation;
}

async function contributionBasis(page, label) {
	const trigger = page.getByRole('button', { name: 'Fuel technology options', exact: true });
	await trigger.click();
	await page.getByRole('menu').getByRole('menuitemradio', { name: label, exact: true }).click();
	await expect(page.getByRole('menu', { name: 'Fuel technology options' })).toBeHidden();
	await expect(trigger).toBeFocused();
}

async function copyTrackerLink(page) {
	// Stub only the browser clipboard boundary; exercise the real copy action.
	await page.evaluate(() =>
		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: {
				writeText: async (value) => {
					document.documentElement.dataset.copiedTrackerUrl = value;
				}
			}
		})
	);
	await page.getByRole('button', { name: 'Options', exact: true }).click();
	await page.getByRole('menu').getByRole('button', { name: 'Copy link', exact: true }).click();
	await expect(page.getByText('Link copied.', { exact: true })).toBeVisible();
	return page.locator('html').getAttribute('data-copied-tracker-url');
}

test('copied analytical links restore hidden sources, contribution, transforms and emissions exclusions', async ({
	page,
	context
}) => {
	await fixture(page, { distinctEmissions: true });
	await page.goto('/tracker?region=nsw1&table=1');
	await ready(page);
	const before = await readFile(await (await download(page, 'Emissions')).path(), 'utf8');
	expect(before.split(/\r?\n/)[0].split(',')[1]).toBe('Emissions intensity (kgCO2e/MWh)');
	expect(
		before
			.trim()
			.split(/\r?\n/)
			.slice(1)
			.some((line) => Number(line.split(',')[1]) > 0)
	).toBe(true);
	await percentageView(page);
	await contributionBasis(page, '% generation');
	await page.getByTestId('fuel-tech-row').filter({ hasText: 'Coal' }).first().click();
	const market = card(page, 'Market');
	await market.getByRole('tab', { name: 'Market value', exact: true }).click();
	await market.getByRole('button', { name: 'Toggle chart options' }).click();
	await market.getByRole('tab', { name: 'Change since', exact: true }).click();
	await market.getByRole('button', { name: 'Toggle chart options' }).click();
	await page.getByRole('button', { name: 'Hide fuel tech table', exact: true }).click();
	const copied = await copyTrackerLink(page);
	const params = new URL(copied).searchParams;
	expect(params.get('hidden')).toBe('coal');
	expect(params.get('contribution')).toBe('generation');
	expect(params.get('transform')).toBe('proportion');
	expect(params.get('market-transform')).toBe('changeSince');
	expect(params.get('price')).toBe('mv');
	expect(params.get('table')).toBe('0');
	const reopened = await context.newPage();
	await fixture(reopened, { distinctEmissions: true });
	await reopened.goto(copied);
	await ready(reopened);
	await expect(
		card(reopened, 'Generation').getByText('% of generation', { exact: true })
	).toBeVisible();
	await expect(await hoverGeneration(reopened)).not.toContainText('Coal');
	const emissions = await readFile(await (await download(reopened, 'Emissions')).path(), 'utf8');
	expect(emissions.split(/\r?\n/)[0].split(',')[1]).toBe('Emissions intensity (kgCO2e/MWh)');
	expect(
		emissions
			.trim()
			.split(/\r?\n/)
			.slice(1)
			.every((line) => line.split(',')[1] === '0')
	).toBe(true);
	const restoredMarket = card(reopened, 'Market');
	await restoredMarket.getByRole('button', { name: 'Toggle chart options' }).click();
	await expect(
		restoredMarket.getByRole('tab', { name: 'Change since', exact: true })
	).toHaveAttribute('aria-selected', 'true');
	await reopened.reload();
	await ready(reopened);
	await expect(
		card(reopened, 'Generation').getByText('% of generation', { exact: true })
	).toBeVisible();
	await expect(await hoverGeneration(reopened)).not.toContainText('Coal');
	await reopened.close();
});

test('analytical history restores grouping visibility and transform without echo entries', async ({
	page
}) => {
	await fixture(page);
	await page.goto('/tracker?region=nsw1&table=1');
	await ready(page);
	const initialHistory = await page.evaluate(() => history.length);
	await percentageView(page);
	await page.getByTestId('fuel-tech-row').filter({ hasText: 'Coal' }).first().click();
	await page.getByRole('button', { name: 'Fuel technology options', exact: true }).click();
	await page.getByRole('menuitemradio', { name: 'Detailed', exact: true }).click();
	await expect.poll(() => new URL(page.url()).searchParams.get('hidden')).toBeNull();
	await expect(page.getByRole('columnheader', { name: /Technology/ })).toContainText('Detailed');
	expect(await page.evaluate(() => history.length)).toBe(initialHistory + 3);
	await page.goBack();
	await expect(page.getByRole('columnheader', { name: /Technology/ })).toContainText('Simplified');
	await expect(
		page.getByTestId('fuel-tech-row').filter({ hasText: 'Coal' }).first()
	).toHaveAttribute('aria-pressed', 'false');
	await page.goBack();
	await expect(
		page.getByTestId('fuel-tech-row').filter({ hasText: 'Coal' }).first()
	).toHaveAttribute('aria-pressed', 'true');
	await page.goBack();
	await expect(
		card(page, 'Generation').getByText('% of gross demand', { exact: true })
	).toBeHidden();
	await page.goForward();
	await expect(
		card(page, 'Generation').getByText('% of gross demand', { exact: true })
	).toBeVisible();
	expect(await page.evaluate(() => history.length)).toBe(initialHistory + 3);
});

test('solo selections are atomic and plain same-route links reset analytical state', async ({
	page
}) => {
	await fixture(page);
	await page.goto(
		'/tracker?region=nsw1&table=1&hidden=coal&contribution=generation&transform=proportion'
	);
	await ready(page);
	const historyBefore = await page.evaluate(() => history.length);
	await page
		.getByTestId('fuel-tech-row')
		.filter({ hasText: 'Coal' })
		.first()
		.click({ modifiers: ['Meta'] });
	await expect.poll(() => new URL(page.url()).searchParams.get('hidden')).toBe('wind');
	expect(await page.evaluate(() => history.length)).toBe(historyBefore + 1);
	await page.goBack();
	await expect.poll(() => new URL(page.url()).searchParams.get('hidden')).toBe('coal');
	await page.getByRole('link', { name: 'Tracker', exact: true }).click();
	await expect(page).not.toHaveURL(/hidden=|contribution=|transform=/);
	await ready(page);
	await expect(
		card(page, 'Generation').getByText('% of gross demand', { exact: true })
	).toBeHidden();
	await expect(
		page.getByTestId('fuel-tech-row').filter({ hasText: 'Coal' }).first()
	).toHaveAttribute('aria-pressed', 'true');
});

async function hoverGeneration(page) {
	const generation = card(page, 'Generation');
	const area = generation.locator('path.path-area').first();
	await expect(area).toHaveAttribute('d', /M/);
	// The path animates when percentage scales change and can temporarily lie
	// outside the clipped plot. Hover the stable SVG viewport, not that path box.
	const box = await area.evaluate((path) => {
		const bounds = /** @type {SVGPathElement} */ (path).ownerSVGElement.getBoundingClientRect();
		return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
	});
	const tooltip = generation.getByTestId('chart-floating-tooltip');
	// Local basis changes can publish after the first pointer event and clear
	// its old hover. Re-enter through real pointer input until publication settles.
	await expect
		.poll(async () => {
			await page.mouse.move(box.x + box.width / 2, box.y + Math.max(1, box.height / 2));
			return tooltip.isVisible();
		})
		.toBe(true);
	return tooltip;
}

test('generation tooltip shows interval percentages beside absolute values and follows the contribution basis', async ({
	page
}, testInfo) => {
	await fixture(page, { contributions: true });
	await page.goto('/tracker?region=nsw1&contribution=generation&table=1');
	await expect(page.getByTestId('tracker-loading')).toHaveCount(0);
	let tooltip = await hoverGeneration(page);
	const tooltipRow = (label) => tooltip.getByText(label, { exact: true }).locator('xpath=../..');
	await expect(tooltip.getByTestId('tooltip-unit')).toHaveText('MW');
	await expect(tooltip.getByTestId('tooltip-percentage-heading')).toContainText('% of generation');
	await expect(tooltipRow('Wind').getByTestId('tooltip-value')).toHaveText('200');
	await expect(tooltipRow('Wind').getByTestId('tooltip-percentage')).toHaveText('66.7');
	await expect(tooltipRow('Coal').getByTestId('tooltip-percentage')).toHaveText('33.3');
	await expect(tooltipRow('Imports').getByTestId('tooltip-percentage')).toHaveText('—');
	await expect(tooltipRow('Battery (Charging)').getByTestId('tooltip-percentage')).toHaveText('—');
	await expect(card(page, 'Market').getByTestId('tooltip-percentage')).toHaveCount(0);
	await page.screenshot({
		path: testInfo.outputPath('generation-tooltip-percentages.png'),
		animations: 'disabled'
	});
	await page.getByTestId('fuel-tech-row').filter({ hasText: 'Coal' }).first().click();
	tooltip = await hoverGeneration(page);
	await expect(tooltipRow('Wind').getByTestId('tooltip-percentage')).toHaveText('66.7');
	await contributionBasis(page, '% demand');
	await expect(page.getByTestId('tracker-loading')).toHaveCount(0);
	tooltip = await hoverGeneration(page);
	await expect(tooltip.getByTestId('tooltip-percentage-heading')).toContainText(
		'% of gross demand'
	);
	await expect(tooltipRow('Wind').getByTestId('tooltip-percentage')).toHaveText('200');
	await expect(tooltipRow('Imports').getByTestId('tooltip-percentage')).toHaveText('300');
	await page.getByRole('button', { name: '30D', exact: true }).click();
	await expect(page.getByTestId('tracker-loading')).toHaveCount(0);
	tooltip = await hoverGeneration(page);
	await expect(tooltip.getByTestId('tooltip-unit')).toHaveText('MWh');
	await expect(tooltipRow('Wind').getByTestId('tooltip-percentage')).toHaveText('200');
	await page.getByRole('button', { name: 'Hide fuel tech table', exact: true }).click();
	await page.setViewportSize({ width: 390, height: 844 });
	tooltip = await hoverGeneration(page);
	await expect(tooltipRow('Wind').getByTestId('tooltip-percentage')).toHaveText('200');
	const bounds = await tooltip.boundingBox();
	expect(bounds.x).toBeGreaterThanOrEqual(0);
	expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
	await page.screenshot({
		path: testInfo.outputPath('generation-tooltip-percentages-mobile.png'),
		animations: 'disabled'
	});
});

test('renewables and curtailment tooltips pair amounts and percentages with the table closed', async ({
	page
}, testInfo) => {
	const source = await fixture(page, { contributions: true });
	await page.goto(
		'/tracker?region=nsw1&contribution=generation&table=0&hidden=coal&overlay=demand,renewables,curtailment-solar,curtailment-wind'
	);
	await expect(page.getByTestId('tracker-loading')).toHaveCount(0);
	let tooltip = await hoverGeneration(page);
	const row = (label) => tooltip.getByText(label, { exact: true }).locator('xpath=../..');
	await expect(tooltip.getByTestId('tooltip-unit')).toHaveText('MW');
	await expect(row('Renewables').getByTestId('tooltip-value')).toHaveText('100');
	await expect(row('Renewables').getByTestId('tooltip-percentage')).toHaveText('25.0');
	await expect(row('Demand')).toHaveCSS('border-top-width', '1px');
	await expect(row('Renewables')).toHaveCSS('border-top-width', '0px');
	for (const label of ['Curtailment (Solar)', 'Curtailment (Wind)']) {
		await expect(row(label).getByTestId('tooltip-value')).toHaveText('100');
		await expect(row(label).getByTestId('tooltip-percentage')).toHaveText('33.3');
	}
	expect(source.requests).toContain('renewables');
	expect(source.requests).not.toContain('market_value');
	await page.screenshot({
		path: testInfo.outputPath('overlay-tooltip-percentages.png'),
		animations: 'disabled'
	});
	await contributionBasis(page, '% demand');
	await expect(page.getByTestId('tracker-loading')).toHaveCount(0);
	tooltip = await hoverGeneration(page);
	await expect(row('Renewables').getByTestId('tooltip-percentage')).toHaveText('25.0');
	await expect(row('Curtailment (Solar)').getByTestId('tooltip-percentage')).toHaveText('100');
	await page.getByRole('button', { name: '30D', exact: true }).click();
	await expect(page.getByTestId('tracker-loading')).toHaveCount(0);
	tooltip = await hoverGeneration(page);
	await expect(tooltip.getByTestId('tooltip-unit')).toHaveText('MWh');
	await expect(row('Renewables').getByTestId('tooltip-value')).toHaveText('100');
	await expect(row('Renewables').getByTestId('tooltip-percentage')).toHaveText('25.0');
	await expect(row('Curtailment (Wind)').getByTestId('tooltip-value')).toHaveText('100');
	await expect(row('Curtailment (Wind)').getByTestId('tooltip-percentage')).toHaveText('100');
	await page.setViewportSize({ width: 390, height: 844 });
	tooltip = await hoverGeneration(page);
	const bounds = await tooltip.boundingBox();
	expect(bounds.x).toBeGreaterThanOrEqual(0);
	expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
	await page.screenshot({
		path: testInfo.outputPath('overlay-tooltip-percentages-mobile.png'),
		animations: 'disabled'
	});
	await percentageView(page);
	tooltip = await hoverGeneration(page);
	await expect(tooltip.getByTestId('tooltip-percentage-heading')).toHaveCount(0);
	await expect(row('Renewables (% of gross demand)').getByTestId('tooltip-value')).toHaveText(
		'25.0'
	);
	await expect(row('Curtailment (Wind)').getByTestId('tooltip-value')).toHaveText('100');
});

test('generation tooltip retains its unit and percentage headings in line mode', async ({
	page
}) => {
	await fixture(page, { contributions: true });
	await page.goto('/tracker?region=nsw1&table=0');
	const generation = card(page, 'Generation');
	await expect(page.getByTestId('metric-generation-min')).toBeEnabled();
	await generation.getByRole('button', { name: 'Toggle chart options' }).click();
	await generation.getByRole('tab', { name: 'Line', exact: true }).click();
	await generation.getByRole('heading', { name: 'Generation', exact: true }).click();
	await page.getByTestId('metric-generation-min').focus();
	const tooltip = generation.getByTestId('chart-floating-tooltip');
	await expect(tooltip.getByTestId('tooltip-unit')).toHaveText('MW');
	await expect(tooltip.getByTestId('tooltip-percentage-heading')).toContainText(
		'% of gross demand'
	);
	await expect(tooltip.getByTestId('tooltip-percentage')).toHaveCount(4);
	await expect(tooltip.getByTestId('tooltip-percentage')).toContainText(['200', '100', '300', '—']);
});

test('percentage shares stay stable when hiding series and exports keep raw units', async ({
	page
}) => {
	await fixture(page, { contributions: true });
	await page.goto('/tracker?region=nsw1&contribution=generation');
	await ready(page);
	const generation = await percentageView(page);
	await expect(generation.getByText('% of generation', { exact: true })).toBeVisible();
	let tooltip = await hoverGeneration(page);
	await expect(tooltip).toContainText('66.7');
	await expect(tooltip).not.toContainText('Imports');
	await expect(tooltip).not.toContainText('Charging');
	const coal = page.getByTestId('fuel-tech-row').filter({ hasText: 'Coal' }).first();
	await coal.click();
	await expect(coal).toHaveAttribute('aria-pressed', 'false');
	tooltip = await hoverGeneration(page);
	await expect(tooltip).toContainText('66.7');
	await expect(tooltip).not.toContainText('Coal');
	await expect(tooltip).not.toContainText('MW');
	const csv = await download(page, 'Generation');
	const content = await readFile(await csv.path(), 'utf8');
	expect(content).toContain('(MW)');
	expect(content).not.toContain('66.7');
	await generation.getByRole('button', { name: 'Toggle chart options' }).click();
	await generation.getByRole('tab', { name: 'Absolute', exact: true }).click();
	await generation.getByRole('button', { name: 'Toggle chart options' }).click();
	tooltip = await hoverGeneration(page);
	await expect(tooltip).toContainText('Imports');
	await expect(tooltip).toContainText('MW');
	await expect(tooltip.getByTestId('tooltip-unit')).toHaveText('MW');
	for (const value of await tooltip.getByTestId('tooltip-value').allTextContents()) {
		expect(value).not.toContain('MW');
	}
});

test('demand percentage data loads with the table closed and overlays share its units', async ({
	page
}) => {
	const source = await fixture(page, { hold: 'renewables', contributions: true });
	await page.goto(
		'/tracker?region=nsw1&contribution=generation&table=0&overlay=demand,curtailment-solar'
	);
	await ready(page);
	const generation = await percentageView(page);
	expect(source.requests).not.toContain('renewables');
	await contributionBasis(page, '% demand');
	await expect(page.getByTestId('tracker-loading')).toBeVisible();
	await expect.poll(() => source.requests.includes('renewables')).toBe(true);
	// No alternate denominator or old percentage geometry while demand is held.
	await expect(generation.locator('path.path-area[d*="M"]')).toHaveCount(0);
	source.release();
	await expect(page.getByTestId('tracker-loading')).toBeHidden();
	await expect(generation.getByText('% of gross demand', { exact: true })).toBeVisible();
	const tooltip = await hoverGeneration(page);
	await expect(tooltip).toContainText('200');
	await expect(tooltip).toContainText('Imports');
	await expect(tooltip).toContainText('Demand');
	await expect(tooltip).toContainText('Curtailment');
	await expect(tooltip).not.toContainText('MW');
	await expect(generation.locator('path.overlay-line')).toHaveCount(1);
	await expect(generation.locator('path.overlay-area')).toHaveCount(1);
	expect(source.requests).not.toContain('market_value');
});

test('failed demand percentages stay unavailable and retry without reopening the table', async ({
	page
}) => {
	const source = await fixture(page, { fail: 'renewables' });
	await page.goto('/tracker?region=nsw1&table=0');
	await ready(page);
	const generation = await percentageView(page);
	await expect(generation.getByText('Gross-demand percentages unavailable.')).toBeVisible();
	await expect(generation.locator('path.path-area[d*="M"]')).toHaveCount(0);
	source.recover();
	await generation.getByRole('button', { name: 'Retry percentage data' }).click();
	await expect(generation.getByRole('button', { name: 'Retry percentage data' })).toBeHidden();
	await expect(await hoverGeneration(page)).toContainText('200');
	await contributionBasis(page, '% generation');
	await expect(await hoverGeneration(page)).toContainText('66.7');
});
async function pauseByZoom(page, clockInstalled = false) {
	await card(page, 'Generation').getByRole('button', { name: 'Zoom in', exact: true }).click();
	if (clockInstalled) await page.clock.runFor(1000);
	await expect(page).toHaveURL(/start=.*end=/);
	await expect(page.getByTestId('tracker-loading')).toHaveCount(0);
}

async function chartsSettled(page) {
	await expect(page.getByTestId('metric-generation-min')).toBeEnabled();
	await expect(page.getByTestId('metric-market-min')).toBeEnabled();
	await expect(page.getByTestId('tracker-loading')).toHaveCount(0);
}

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
	await chartsSettled(page);
	const generation = card(page, 'Generation');
	await generation.getByRole('button', { name: 'Toggle chart options' }).click();
	await generation.getByRole('tab', { name: 'GW', exact: true }).click();
	const handle = page.getByRole('separator', { name: 'Resize chart height' }).first();
	await handle.focus();
	await handle.press('ArrowDown');
	await expect(handle).toHaveAttribute('aria-valuenow', '330');
	await expect(generation.getByRole('button', { name: 'GW', exact: true })).toBeVisible();
	const box = await handle.boundingBox();
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	await page.mouse.move(box.x + box.width / 2, box.y + 45, { steps: 4 });
	await page.mouse.up();
	await expect(generation.getByRole('button', { name: 'GW', exact: true })).toBeVisible();
});

test('a failed metric retries in place and only required providers load', async ({ page }) => {
	const source = await fixture(page, { fail: 'price' });
	await page.goto('/tracker?region=nsw1&table=0');
	await expect(card(page, 'Market').getByRole('button', { name: 'Retry' })).toBeVisible();
	await expect(card(page, 'Market')).toContainText('Fixture failure');
	await expect(page.getByTestId('tracker-loading')).toHaveCount(0);
	source.recover();
	await card(page, 'Market').getByRole('button', { name: 'Retry' }).click();
	await expect(card(page, 'Market').getByRole('button', { name: 'Retry' })).toBeHidden();
	await ready(page);
	expect(source.requests.filter((metric) => metric === 'price').length).toBeGreaterThanOrEqual(2);
	expect(source.requests).toContain('renewables');
	expect(source.requests).not.toContain('market_value');
	expect(source.requests).not.toContain('curtailment');
});

test('a transient date-range data failure recovers without a manual retry', async ({ page }) => {
	const source = await fixture(page, { failOnce: 'price' });
	await page.goto('/tracker?region=sa1&range=30d&interval=1d&table=0');
	await ready(page);
	// Initialisation and gap fills can use other windows. Count only the failed
	// URL, whose one retry is shared rather than duplicating the chart request.
	await expect.poll(() => source.requests.includes('price')).toBe(true);
	const failedUrl = source.urls.find(
		(href) => new URL(href).searchParams.get('metric') === 'price'
	);
	await expect.poll(() => source.urls.filter((href) => href === failedUrl).length).toBe(2);
	await expect(card(page, 'Market').getByRole('button', { name: 'Retry' })).toBeHidden();
	await expect(card(page, 'Market').locator('svg').first()).toBeVisible();
});

test('idle warming stays near the selected range and other grains load only on demand', async ({
	page
}) => {
	// Drive real idle jobs explicitly so absence of cross-grain requests is not
	// inferred from an arbitrary sleep or a busy browser never becoming idle.
	await page.addInitScript(() => {
		const callbacks = new Map();
		let id = 0;
		window.requestIdleCallback = (callback) => {
			callbacks.set(++id, callback);
			return id;
		};
		window.cancelIdleCallback = (key) => callbacks.delete(key);
		window.flushTrackerIdle = () => {
			const batch = [...callbacks.values()];
			callbacks.clear();
			for (const callback of batch) callback({ didTimeout: false, timeRemaining: () => 50 });
			return batch.length;
		};
	});
	const source = await fixture(page);
	await page.goto('/tracker?region=sa1&table=0');
	await ready(page);
	await expect.poll(() => page.evaluate(() => window.flushTrackerIdle())).toBeGreaterThan(0);
	await ready(page);
	await expect.poll(() => source.urls.length).toBeGreaterThan(3);
	for (const href of source.urls) {
		const params = new URL(href).searchParams;
		expect(params.get('interval')).toBe('5m');
		const start = Date.parse(params.get('date_start') + '+10:00');
		const end = Date.parse(params.get('date_end') + '+10:00');
		expect(end - start).toBeLessThanOrEqual(10 * 86_400_000 + 300_000);
	}
	await page.getByRole('button', { name: '30D', exact: true }).click();
	await ready(page);
	await expect
		.poll(() => source.urls.some((href) => new URL(href).searchParams.get('interval') === '1d'))
		.toBe(true);
	await page.evaluate(() => window.flushTrackerIdle());
	expect(source.urls.some((href) => new URL(href).searchParams.get('interval') === '1M')).toBe(
		false
	);
	await page.getByRole('button', { name: 'All', exact: true }).click();
	await ready(page);
	await expect
		.poll(() => source.urls.some((href) => new URL(href).searchParams.get('interval') === '1M'))
		.toBe(true);
	await page.getByRole('button', { name: '3D', exact: true }).click();
	await ready(page);
	await expect(card(page, 'Generation').getByText('Power', { exact: true })).toBeVisible();
});

test('explicit ranges push history and back/forward restore the range', async ({ page }) => {
	await fixture(page);
	await page.goto('/tracker?region=nsw1&table=0');
	await chartsSettled(page);
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
	await expect(page.getByTestId('tracker-loading')).toHaveCount(0);
	await expect(card(page, 'Market').getByRole('button', { name: 'Retry' })).toHaveCount(0);
	const csv = await download(page, 'Generation');
	expect(await readFile(await csv.path(), 'utf8')).toContain('+08:00');
});

test('reopening the table waits for its providers before enabling its export', async ({ page }) => {
	const source = await fixture(page, { hold: 'market_value' });
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
		await page.getByRole('button', { name: 'Fuel technology options', exact: true }).click();
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
