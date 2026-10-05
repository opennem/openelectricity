import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { inflateRawSync } from 'node:zlib';
import {
	card,
	download,
	expectNoHorizontalScroll,
	navPill,
	openOptions,
	pickNavOption,
	trackerFixture,
	trackerReady,
	styleButton
} from './helpers/tracker.js';

async function openPng(page) {
	await openOptions(page);
	await page.getByRole('button', { name: 'Export PNG', exact: true }).click();
	return page.getByRole('dialog', { name: 'Export PNG' });
}

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
	await page.getByRole('dialog').getByRole('radio', { name: label, exact: true }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Done', exact: true }).click();
	await expect(page.getByRole('dialog', { name: 'Fuel technology options' })).toBeHidden();
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
	const menu = await openOptions(page);
	await menu.getByRole('button', { name: 'Copy link', exact: true }).click();
	await expect(page.getByText('Link copied.', { exact: true })).toBeVisible();
	return page.locator('html').getAttribute('data-copied-tracker-url');
}

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
	const tooltip = generation.getByTestId('chart-tooltip-strip');
	// Local basis changes can publish after the first pointer event and clear
	// its old hover. Re-enter through real pointer input until publication settles.
	await expect
		.poll(async () => {
			await page.mouse.move(box.x + box.width / 2, box.y + Math.max(1, box.height / 2));
			return (await tooltip.textContent()).trim().length > 0;
		})
		.toBe(true);
	return tooltip;
}

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

for (const group of ['detailed', 'simple']) {
	test(`rooftop interpolation is display-only and disclosed in ${group} grouping`, async ({
		page
	}, testInfo) => {
		await trackerFixture(page);
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
			`/tracker/timeline?start=${start}&end=${end}&interval=5m&group=${group}&hidden=${hidden}&table=1`
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
		await trackerReady(page);
		const csv = await readFile(await (await download(page, 'Generation')).path(), 'utf8');
		expect(csv).not.toContain('_rooftopPower');
		// The 11:45 raw value is 280 MW (480 MW with utility solar), not the hover estimate.
		const line = csv.split('\n').find((row) => row.includes('2026-09-01 11:45:00'));
		expect(line).toBeTruthy();
		expect(line).toContain(group === 'detailed' ? '280' : '480');
		expect(line).not.toContain(group === 'detailed' ? '310' : '510');
		await expect(solarRow.locator('td')).toHaveText(cells);
		await page.screenshot({ path: testInfo.outputPath('rooftop-interpolation.png') });
		await page.setViewportSize({ width: 390, height: 844 });
		await note.scrollIntoViewIfNeeded();
		await expect(note).toBeVisible();
		expect(
			await note.evaluate((element) => {
				const style = getComputedStyle(element);
				return parseFloat(style.lineHeight) / parseFloat(style.fontSize);
			})
		).toBeGreaterThan(1.4);
		await expectNoHorizontalScroll(page);
		await page.screenshot({ path: testInfo.outputPath('rooftop-interpolation-mobile.png') });
		await page.goto(
			`/tracker/timeline?start=${start}&end=${end}&interval=30m&group=${group}&hidden=${hidden}&table=1`
		);
		await expect(page.getByTestId('fuel-tech-row').first()).toBeVisible();
		await expect(note).toHaveCount(0);
		await expect(card(page, 'Generation')).not.toHaveAttribute('data-tracker-png', /interpolated/);
	});
}

test('refresh advances a following window, pauses on zoom and resumes through presets and history', async ({
	page
}, testInfo) => {
	const source = await trackerFixture(page, { comparisonGrowth: true });
	await page.clock.install({ time: new Date() });
	await page.goto('/tracker/timeline?region=nsw1&table=0');
	await expect(page.getByRole('switch', { name: 'Live' })).toHaveCount(0);
	await chartsSettled(page);
	await expect(page.getByTestId('reading-freshness')).toHaveCount(0);
	const first = source.urls.length;
	const history = await page.evaluate(() => window.history.length);
	// Nothing polls: minutes pass without a request.
	await page.clock.fastForward(125_000);
	expect(source.urls.length).toBe(first);
	await page.keyboard.press('r');
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
	// A refresh on a paused window revisits its newest buckets but keeps its bounds.
	await page.keyboard.press('r');
	await expect(page.getByTestId('tracker-loading')).toHaveCount(0);
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
	await expectNoHorizontalScroll(page);
	await page.screenshot({ path: testInfo.outputPath('tracker-live-mobile.png') });
});

test('freshness keeps failed and empty feeds explicit and recovers on refresh', async ({
	page
}) => {
	const source = await trackerFixture(page, {
		comparisonGrowth: true,
		fail: 'price',
		empty: 'emissions_intensity'
	});
	await page.clock.install({ time: new Date() });
	await page.goto('/tracker/timeline?region=nsw1&table=0');
	await expect(card(page, 'Market').getByTestId('reading-freshness')).toContainText(
		'Update unavailable'
	);
	await expect(card(page, 'Emissions').getByTestId('reading-freshness')).toContainText(
		'No readings'
	);
	await expect(card(page, 'Generation').getByTestId('reading-freshness')).toHaveCount(0);
	source.recover();
	await page.keyboard.press('r');
	await expect(card(page, 'Market').getByTestId('reading-freshness')).toHaveCount(0);
	await expect(card(page, 'Emissions').getByTestId('reading-freshness')).toContainText(
		'No readings'
	);
});

test('freshness flags delayed readings but not a deliberately historical view', async ({
	page
}) => {
	await trackerFixture(page, { comparisonGrowth: true, latestAt: Date.now() - 3_600_000 });
	await page.goto('/tracker/timeline?region=nsw1&table=0');
	await expect(card(page, 'Generation').getByTestId('reading-freshness')).toContainText(
		'Data delayed'
	);
	await expect(
		card(page, 'Generation').getByTestId('reading-freshness').locator('time')
	).toBeVisible();
	await pauseByZoom(page);
	await expect(card(page, 'Generation').getByTestId('reading-freshness')).toHaveCount(0);
});

test('data refreshes only on demand: the range readout button, the options menu and the shortcuts modal', async ({
	page
}) => {
	// The range readout (and its refresh button) only renders from the lg breakpoint.
	await page.setViewportSize({ width: 1600, height: 900 });
	const source = await trackerFixture(page, { comparisonGrowth: true });
	await page.clock.install({ time: new Date() });
	await page.goto('/tracker/timeline?region=nsw1&table=0');
	await chartsSettled(page);
	const before = source.urls.length;
	await page.clock.fastForward(300_000);
	expect(source.urls.length).toBe(before);
	// The range readout is the refresh button: hovering says when data last updated.
	const readout = page.getByTestId('tracker-range-label');
	await readout.hover();
	await expect(page.locator('[data-tooltip-content]')).toContainText('Updated');
	await expect(page.locator('[data-tooltip-content]')).toContainText('Tap to refresh (R)');
	await readout.click();
	await expect.poll(() => source.urls.length).toBeGreaterThan(before);
	await chartsSettled(page);
	const afterButton = source.urls.length;
	const menu = await openOptions(page);
	await menu.getByRole('button', { name: /^Refresh data/ }).click();
	await expect.poll(() => source.urls.length).toBeGreaterThan(afterButton);
	await chartsSettled(page);
	// The shortcuts modal lists the tracker's keys and closes on Escape.
	await page.keyboard.press('?');
	const modal = page.getByRole('heading', { name: 'Keyboard shortcuts' });
	await expect(modal).toBeVisible();
	const panel = modal.locator('..').locator('..');
	await expect(panel).toContainText('Refresh data');
	await expect(panel).toContainText('Show / hide metrics');
	await expect(panel).toContainText('Enter / exit full screen');
	await expect(panel).toContainText('Toggle navigation menu');
	await expect(panel.locator('kbd', { hasText: /^R$/ })).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(modal).toHaveCount(0);
	// G toggles the navigation menu; Shift+G is left to pages.
	const navMenu = page.getByRole('menu');
	await page.keyboard.press('g');
	await expect(navMenu).toHaveCount(1);
	await page.keyboard.press('g');
	await expect(navMenu).toHaveCount(0);
	await page.keyboard.press('Shift+G');
	await expect(navMenu).toHaveCount(0);
	// Typing in a field never refreshes.
	const typed = source.urls.length;
	await page.keyboard.press('Escape');
	await page.getByRole('button', { name: 'Choose a custom date range' }).click();
	const field = page.getByRole('textbox').first();
	if (await field.count()) {
		await field.focus();
		await page.keyboard.press('r');
		expect(source.urls.length).toBe(typed);
	}
	await page.keyboard.press('Escape');
});

test('window metrics strip shows signed displayed extremes with keyboard chart highlighting', async ({
	page
}, testInfo) => {
	const api = await trackerFixture(page, { contributions: true, comparisonGrowth: true });
	const start = Date.parse('2026-08-01T00:00:00+10:00');
	await page.goto(`/tracker/timeline?start=${start}&end=${start + 2 * 86_400_000}&interval=30m`);
	const metrics = page.getByRole('region', { name: 'Window metrics' });
	const minimum = page.getByTestId('metric-generation-min');
	const maximum = page.getByTestId('metric-generation-max');
	await expect(minimum).toBeEnabled();
	await expect(minimum).toContainText('200');
	await expect(maximum).toContainText('400');
	// Times live in the value tooltips, in the short form without the current year.
	await expect(minimum).not.toContainText('Aug');
	await minimum.hover();
	await expect(page.locator('[data-tooltip-content]')).toContainText('Min: 1 Aug,');
	await expect(page.locator('[data-tooltip-content]')).not.toContainText('2026');
	await page.mouse.move(0, 0);
	await expect(metrics).not.toContainText('UTC+10:00');
	await expect(metrics.locator('button[data-testid]')).toHaveCount(16);
	await expect(metrics.getByText('Minimum', { exact: true })).toHaveCount(0);
	await expect(metrics.getByText('Maximum', { exact: true })).toHaveCount(0);
	await expect(
		page.getByTestId('metrics-generation').getByText('Net power', { exact: true })
	).toHaveCount(1);
	await expect(minimum).not.toContainText('Net power');
	// Sub-daily buckets are power only; energy would just rescale them.
	await expect(page.getByTestId('metrics-energy')).toHaveCount(0);
	// The strip sits between the navigation and the charts.
	const strip = await metrics.boundingBox();
	const nav = await page.getByTestId('tracker-top-nav').boundingBox();
	const chart = await card(page, 'Generation').boundingBox();
	expect(strip.y).toBeGreaterThanOrEqual(nav.y + nav.height);
	expect(chart.y).toBeGreaterThanOrEqual(strip.y + strip.height);
	expect((await minimum.boundingBox()).x).toBeLessThan((await maximum.boundingBox()).x);
	expect(await metrics.evaluate((el) => el.scrollHeight <= el.clientHeight)).toBe(true);
	await expect(minimum).not.toHaveAttribute('title');
	// Only Renewables explains itself: its label tooltip links to the methodology.
	await page.getByTestId('metrics-generation').getByText('Net power', { exact: true }).hover();
	await expect(page.locator('[data-tooltip-content]')).toHaveCount(0);
	await page.getByTestId('metrics-renewables').getByText('Renewables', { exact: true }).hover();
	await expect(page.locator('[data-tooltip-content]')).toContainText('Renewable share');
	await expect(
		page
			.locator('[data-tooltip-content]')
			.getByRole('link', { name: 'How renewable energy is calculated' })
	).toBeVisible();
	await page.mouse.move(0, 0);
	await page.getByTestId('metric-market-min').hover();
	await expect(
		page.locator('[data-tooltip-content]').filter({ hasText: 'Min: 1 Aug,' })
	).toBeVisible();
	const requests = api.requests.length;
	await maximum.focus();
	await expect(
		page.locator('[data-tooltip-content]').filter({ hasText: 'Max: 2 Aug,' })
	).toBeVisible();
	await expect(card(page, 'Generation').getByTestId('chart-tooltip-strip')).toContainText('2 Aug');
	expect(api.requests.length).toBe(requests);
	await maximum.click();
	await page.mouse.move(0, 0);
	await expect(maximum).toHaveAttribute('aria-pressed', 'true');
	await expect(page.getByTestId('metrics-generation').getByRole('img')).toHaveCount(0);
	await expect(page.getByTestId('metrics-generation-unit')).toHaveText('MW');
	await expect(card(page, 'Generation').getByTestId('chart-tooltip-strip')).toContainText('2 Aug');
	await expect(card(page, 'Market').getByTestId('chart-tooltip-strip')).toContainText('2 Aug');
	await minimum.hover();
	await expect(card(page, 'Generation').getByTestId('chart-tooltip-strip')).toContainText('1 Aug');
	await page.mouse.move(0, 0);
	await expect(card(page, 'Generation').getByTestId('chart-tooltip-strip')).toContainText('2 Aug');
	// Hovering the chart leaves the pin alone; clicking to focus a time clears it.
	const plot = await card(page, 'Generation').locator('.stratum-chart-area').boundingBox();
	await page.mouse.move(plot.x + plot.width * 0.25, plot.y + plot.height * 0.5);
	await expect(card(page, 'Generation').getByTestId('chart-tooltip-strip')).toContainText('1 Aug');
	await expect(maximum).toHaveAttribute('aria-pressed', 'true');
	// The first tap engages pan/zoom; the next pins the hovered time, which replaces the strip's pin.
	await page.mouse.click(plot.x + plot.width * 0.25, plot.y + plot.height * 0.5);
	await expect(maximum).toHaveAttribute('aria-pressed', 'true');
	await page.mouse.click(plot.x + plot.width * 0.25, plot.y + plot.height * 0.5);
	await expect(maximum).toHaveAttribute('aria-pressed', 'false');
	await expect(minimum).toHaveAttribute('aria-pressed', 'false');
	// Pinning an extreme moves the charts' focus to its time; the plot's pin is gone.
	await maximum.click();
	await expect(maximum).toHaveAttribute('aria-pressed', 'true');
	await page.mouse.move(0, 0);
	await expect(card(page, 'Generation').getByTestId('chart-tooltip-strip')).toContainText('2 Aug');
	await maximum.click();
	await expect(maximum).toHaveAttribute('aria-pressed', 'false');
	await page.keyboard.press('Escape');
	await minimum.click();
	await expect(minimum).toHaveAttribute('aria-pressed', 'true');
	await expect(maximum).toHaveAttribute('aria-pressed', 'false');
	await minimum.press('Enter');
	await expect(minimum).toHaveAttribute('aria-pressed', 'false');
	await page.getByTestId('fuel-tech-row').filter({ hasText: 'Coal' }).first().click();
	await expect(minimum).toContainText('100');
	await expect(maximum).toContainText('200');
	await metrics.scrollIntoViewIfNeeded();
	await expect(page.getByTestId('metric-demand-min')).toContainText('100');
	await expect(page.getByTestId('metric-demand-max')).toContainText('200');
	// Emissions volume and intensity come from one components feed, whatever the chart shows.
	await expect(page.getByTestId('metric-emissions-min')).toBeEnabled();
	await expect(page.getByTestId('metrics-emissions-unit')).toHaveText('tCO₂e');
	await expect(page.getByTestId('metric-intensity-min')).toBeEnabled();
	await expect(page.getByTestId('metrics-intensity-unit')).toHaveText('kgCO₂e/MWh');
	await expect(page.getByTestId('metric-curtailment_solar-min')).toBeEnabled();
	await expect(page.getByTestId('metrics-curtailment_wind-unit')).toHaveText('MW');
	await expect(page.getByTestId('metric-renewables-min')).toContainText('25');
	await expect(page.getByTestId('metric-renewables-max')).toContainText('%');
	await expect(page.getByTestId('metrics-renewables-unit')).toHaveCount(0);
	await page.screenshot({ path: testInfo.outputPath('window-metrics-desktop.png') });
});

test('tracker slides one nav logo in place of the date range and overlays charts and table', async ({
	page
}, testInfo) => {
	await page.setViewportSize({ width: 1600, height: 1000 });
	const source = await trackerFixture(page, { hold: 'power' });
	await page.goto('/tracker/timeline?region=nsw1&table=1');
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
	const metrics = page.getByRole('region', { name: 'Window metrics' });
	await expect(metrics.getByTestId('tracker-loading-overlay')).toHaveCount(0);
	await expect(
		page.locator('[data-testid="chart-loading"], [data-testid="table-loading"]')
	).toHaveCount(0);
	await expect(metrics).not.toContainText('Updating…');
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
	await page.getByRole('radio', { name: 'Detailed', exact: true }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Done', exact: true }).click();
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
	const source = await trackerFixture(page, { hold: 'market_value' });
	await page.goto('/tracker/timeline?region=nsw1&table=1&emissions=volume');
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
	const source = await trackerFixture(page);
	await page.goto('/tracker/timeline?region=nsw1&table=1');
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
	await trackerFixture(page);
	await page.goto('/tracker/timeline?region=nsw1&table=1&hidden=coal');
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
	await trackerFixture(page);
	await page.goto('/tracker/timeline?region=nsw1');
	await chartsSettled(page);
	const hideTable = page.getByRole('button', { name: 'Hide fuel tech table', exact: true });
	const showTable = page.getByRole('button', { name: 'Show fuel tech table', exact: true });
	await expect(page.getByRole('button', { name: /metrics/i })).toHaveCount(0);
	const bounds = await hideTable.boundingBox();
	expect(bounds.width).toBe(40);
	expect(bounds.height).toBe(40);
	expect((await hideTable.locator('svg').boundingBox()).width).toBe(20);
	await expect(hideTable.locator('svg')).toHaveAttribute('stroke-width', '1.5');
	await expect(hideTable).toHaveAttribute('aria-expanded', 'true');
	await expect(hideTable).toHaveCSS('color', 'rgb(106, 106, 106)');
	await expect(hideTable.locator('svg')).toHaveClass(/lucide-panel-right-close/);
	await hideTable.hover();
	await expect(hideTable).toHaveCSS('color', 'rgb(106, 106, 106)');
	await page.screenshot({ path: testInfo.outputPath('panels-open.png') });
	await hideTable.press('Enter');
	await expect(showTable).toBeFocused();
	const collapsed = await showTable.boundingBox();
	expect(collapsed.width).toBe(40);
	expect(collapsed.height).toBe(40);
	await expect(showTable).toHaveAttribute('aria-expanded', 'false');
	await expect(showTable.locator('svg')).toHaveCSS('width', '20px');
	await expect(showTable.locator('svg')).toHaveAttribute('stroke-width', '1.5');
	await expect(showTable).toHaveCSS('color', 'rgb(106, 106, 106)');
	await expect(showTable.locator('svg')).toHaveClass(/lucide-panel-right-open/);
	await expect(showTable).toHaveCSS('outline-style', 'solid');
	await page.screenshot({ path: testInfo.outputPath('panels-collapsed.png') });
	await showTable.press('Enter');
	await expect(hideTable).toBeFocused();
	await expect(hideTable).toHaveCSS('outline-style', 'solid');
	await hideTable.click();
	await page.setViewportSize({ width: 390, height: 844 });
	await expect(showTable).toBeVisible();
	await expectNoHorizontalScroll(page);
	await page.screenshot({ path: testInfo.outputPath('panels-mobile.png') });
});

test('fuel technology options modal controls grouping, contribution and columns across history and mobile', async ({
	page
}, testInfo) => {
	await trackerFixture(page);
	await page.goto('/tracker/timeline?region=nsw1');
	await chartsSettled(page);
	const trigger = page.getByRole('button', { name: 'Fuel technology options', exact: true });
	const dialog = page.getByRole('dialog', { name: 'Fuel technology options' });
	await trigger.press('Enter');
	await expect(dialog.getByRole('radio')).toHaveCount(8);
	await expect(dialog.getByRole('checkbox')).toHaveCount(6);
	await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
	await dialog.getByRole('button', { name: 'Close fuel technology options' }).focus();
	await page.keyboard.press('Shift+Tab');
	await expect(dialog.getByRole('button', { name: 'Done', exact: true })).toBeFocused();
	await expect(dialog.getByRole('radio', { name: 'Simplified', exact: true })).toHaveAttribute(
		'aria-checked',
		'true'
	);
	await expect(dialog.getByRole('radio', { name: '% demand', exact: true })).toHaveAttribute(
		'aria-checked',
		'true'
	);
	await expect(dialog.getByRole('radio', { name: 'Detailed', exact: true })).toHaveAttribute(
		'aria-checked',
		'false'
	);
	await page.screenshot({ path: testInfo.outputPath('fuel-options-desktop.png') });
	await dialog.getByRole('radio', { name: 'Simplified', exact: true }).focus();
	await page.keyboard.press('ArrowUp');
	await expect(dialog.getByRole('radio', { name: 'Detailed', exact: true })).toBeChecked();
	await expect(page).toHaveURL(/group=detailed/);
	await dialog.getByRole('radio', { name: '% generation', exact: true }).click();
	await dialog.getByRole('checkbox', { name: 'Energy', exact: true }).focus();
	await page.keyboard.press('Space');
	await expect(dialog.getByRole('checkbox', { name: 'Energy', exact: true })).not.toBeChecked();
	// Price, emissions and intensity are opt-in.
	for (const name of ['Av price', 'Emissions', 'Intensity'])
		await expect(dialog.getByRole('checkbox', { name, exact: true })).not.toBeChecked();
	await dialog.getByRole('checkbox', { name: 'Intensity', exact: true }).check();
	await expect(dialog).toBeVisible();
	await dialog.getByRole('button', { name: 'Done', exact: true }).click();
	await expect(trigger).toBeFocused();
	const table = page.getByRole('table', { name: 'Fuel technology values' });
	await expect(table.getByRole('columnheader', { name: /^Energy/ })).toHaveCount(0);
	await expect(table.getByRole('columnheader', { name: /^Intensity/ })).toBeVisible();
	await expect(table.getByRole('columnheader', { name: /^Av price/ })).toHaveCount(0);
	await expect(table.getByRole('columnheader', { name: /^Technology/ })).toContainText('Detailed');
	await expect(table.getByRole('columnheader', { name: /^Contribution/ })).toContainText(
		'% generation'
	);
	// Columns are a localStorage preference: history leaves them alone and reloads keep them.
	await page.goBack();
	await expect(table.getByRole('columnheader', { name: /^Contribution/ })).toContainText(
		'% demand'
	);
	await expect(table.getByRole('columnheader', { name: /^Intensity/ })).toBeVisible();
	await expect(table.getByRole('columnheader', { name: /^Energy/ })).toHaveCount(0);
	await page.goForward();
	await page.reload();
	await chartsSettled(page);
	await expect(table.getByRole('columnheader', { name: /^Intensity/ })).toBeVisible();
	await expect(table.getByRole('columnheader', { name: /^Energy/ })).toHaveCount(0);
	await trigger.click();
	for (const checkbox of await dialog.getByRole('checkbox').all()) await checkbox.uncheck();
	await dialog.getByRole('button', { name: 'Done', exact: true }).click();
	await expect(table.getByRole('columnheader', { name: /^Av / })).toHaveCount(0);
	await expect(table.locator('[colspan="0"]')).toHaveCount(0);
	await trigger.click();
	await page.locator('[data-dialog-overlay]').click({ position: { x: 5, y: 5 } });
	await expect(dialog).not.toBeVisible();
	await expect(trigger).toBeFocused();
	await page.getByRole('button', { name: 'Hide fuel tech table', exact: true }).click();
	await trigger.click();
	await dialog.getByRole('button', { name: 'Show all columns' }).click();
	await page.keyboard.press('Escape');
	await expect(trigger).toBeFocused();
	await page.setViewportSize({ width: 390, height: 480 });
	await trigger.click();
	const bounds = await dialog.boundingBox();
	expect(bounds.x).toBeGreaterThanOrEqual(0);
	expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
	expect(bounds.y + bounds.height).toBeLessThanOrEqual(480);
	await dialog.getByRole('checkbox', { name: 'Intensity', exact: true }).uncheck();
	await page.screenshot({ path: testInfo.outputPath('fuel-options-mobile.png') });
	await dialog.getByRole('button', { name: 'Done', exact: true }).click();
	await expect(trigger).toBeFocused();
	await expectNoHorizontalScroll(page);
});

test('table headers change grouping, contribution basis and units in place', async ({ page }) => {
	await trackerFixture(page);
	await page.addInitScript(() =>
		localStorage.setItem(
			'tracker-table-columns',
			JSON.stringify(['energy', 'power', 'contribution', 'price', 'emissions', 'intensity'])
		)
	);
	await page.goto('/tracker/timeline?region=nsw1');
	await chartsSettled(page);
	const table = page.getByRole('table', { name: 'Fuel technology values' });
	const header = (/** @type {RegExp} */ name) => table.getByRole('columnheader', { name });

	// Technology opens the grouping list; a pick applies and closes it.
	await header(/^Technology/)
		.getByRole('button')
		.click();
	const groupings = page.getByRole('listbox', { name: 'Fuel tech grouping' });
	await groupings.getByRole('option', { name: 'Detailed', exact: true }).click();
	await expect(groupings).toHaveCount(0);
	await expect(page).toHaveURL(/group=detailed/);
	await expect(header(/^Technology/)).toContainText('Detailed');

	// Contribution toggles its basis through the URL-owned selection.
	await header(/^Contribution/)
		.getByRole('button')
		.click();
	await expect(page).toHaveURL(/contribution=generation/);
	await expect(header(/^Contribution/)).toContainText('% generation');

	// Value columns step through their SI prefixes and wrap.
	const energy = header(/^Energy/).getByRole('button');
	const start = (await energy.textContent())?.match(/[MGT]Wh/)?.[0];
	const cycle = ['MWh', 'GWh', 'TWh'];
	for (let step = 1; step <= 3; step++) {
		await energy.click();
		await expect(energy).toContainText(cycle[(cycle.indexOf(String(start)) + step) % 3]);
	}
	for (const unit of ['ktCO₂e', 'MtCO₂e', 'tCO₂e']) {
		await header(/^Emissions/)
			.getByRole('button')
			.click();
		await expect(header(/^Emissions/)).toContainText(unit);
	}
	await header(/^Intensity/)
		.getByRole('button')
		.click();
	await expect(header(/^Intensity/)).toContainText('tCO₂e/MWh');
	await expect(header(/^Intensity/)).not.toContainText('kg');
	await expect(header(/^Av price/).getByRole('button')).toHaveCount(0);
});

test('window metrics follow range and market modes without applying timeline transforms', async ({
	page
}) => {
	await trackerFixture(page, { contributions: true, comparisonGrowth: true });
	const start = Date.parse('2026-08-01T00:00:00+10:00');
	await page.goto(
		`/tracker/timeline?start=${start}&end=${start + 2 * 86_400_000}&interval=30m&table=0&transform=proportion`
	);
	await expect(page.getByTestId('metric-generation-min')).toContainText('200');
	await expect(page.getByTestId('metrics-generation-unit')).toHaveText('MW');
	await expect(page.getByTestId('metric-demand-min')).toContainText('100');
	await expect(page.getByTestId('metric-demand-max')).toContainText('200');
	await card(page, 'Market').getByRole('tab', { name: 'Market value', exact: true }).click();
	await expect(page.getByTestId('metric-market-max')).toBeEnabled();
	await expect(page.getByTestId('metrics-market')).toContainText('Market value');
	await card(page, 'Emissions').getByRole('tab', { name: 'Volume', exact: true }).click();
	await expect(page.getByTestId('metric-emissions-max')).toBeEnabled();
	await expect(page.getByTestId('metrics-emissions-unit')).toHaveText('tCO₂e');
	await page.goto(
		`/tracker/timeline?start=${start + 86_400_000}&end=${Date.parse('2026-09-01T00:00:00+10:00')}&interval=1d&table=0`
	);
	await expect(page.getByTestId('metric-generation-min')).toBeEnabled();
	// Daily buckets hold MWh: net energy appears and net power reads their average MW.
	await expect(page.getByTestId('metrics-generation')).toContainText('Net power');
	await expect(page.getByTestId('metric-energy-min')).toContainText('400');
	await expect(page.getByTestId('metrics-energy-unit')).toHaveText('MWh');
	await expect(page.getByTestId('metric-generation-min')).toContainText('17');
	await expect(page.getByTestId('metrics-generation-unit')).toHaveText('MW');
	await expect(page.getByTestId('metrics-demand-unit')).toHaveText('MWh');
	await expect(page.getByTestId('metric-demand-min')).toContainText('200');
});

test('window metrics never show held, failed or empty data as current', async ({ page }) => {
	const api = await trackerFixture(page, { hold: 'price', empty: 'emissions_intensity' });
	await page.goto('/tracker/timeline?region=nsw1&table=0&emissions=volume');
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
	const api = await trackerFixture(page, { fail: 'demand' });
	await page.goto('/tracker/timeline?region=nsw1&table=0');
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

test('the metrics strip hides and shows with the M key and the options menu, and remembers it', async ({
	page
}) => {
	await trackerFixture(page);
	await page.goto('/tracker/timeline?region=nsw1&table=0');
	await chartsSettled(page);
	const strip = page.getByRole('region', { name: 'Window metrics' });
	await expect(strip).toBeVisible();
	await page.keyboard.press('m');
	await expect(strip).toHaveCount(0);
	await page.keyboard.press('M');
	await expect(strip).toBeVisible();
	await openOptions(page);
	await page.getByRole('button', { name: /^Hide metrics/ }).click();
	await expect(strip).toHaveCount(0);
	await page.reload();
	// The strip stays hidden after a reload, so settle on the page's loader instead.
	await expect(page.getByTestId('tracker-loading')).toHaveCount(0);
	await expect(strip).toHaveCount(0);
	await openOptions(page);
	await expect(page.getByRole('button', { name: /^Hide metrics/ })).toHaveCount(0);
	await page.getByRole('button', { name: /^Show metrics/ }).click();
	await expect(strip).toBeVisible();
	await page.getByRole('button', { name: 'Profile', exact: true }).click();
	await expect(strip).toHaveCount(0);
	await expect(card(page, 'Average over last 7 full days')).toBeVisible();
	await page.keyboard.press('m');
	await page.getByRole('button', { name: 'Timeline', exact: true }).click();
	await expect(strip).toBeVisible();
});

test('window metrics strip scrolls sideways on mobile in WEM', async ({ page }, testInfo) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await trackerFixture(page, { contributions: true });
	await page.goto('/tracker/timeline?region=wem&table=0');
	const metrics = page.getByRole('region', { name: 'Window metrics' });
	await expect(metrics).toBeVisible();
	await expect(page.getByTestId('metric-generation-min')).toBeEnabled();
	await expect(metrics).not.toContainText('UTC+08:00');
	await expect(page.getByRole('button', { name: /metrics/i })).toHaveCount(0);
	const bounds = await metrics.boundingBox();
	expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
	const scroller = metrics.locator('.ticker-scroll');
	expect(await scroller.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
	await expectNoHorizontalScroll(page);
	const chart = await card(page, 'Generation').boundingBox();
	expect(chart.y).toBeGreaterThanOrEqual(bounds.y + bounds.height);
	expect(chart.x + chart.width).toBeLessThanOrEqual(390);
	await page.screenshot({ path: testInfo.outputPath('window-metrics-mobile.png') });
	await scroller.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
	await expect(page.getByTestId('metric-curtailment_wind-max')).toBeInViewport();
	await expectNoHorizontalScroll(page);
});

test('window metrics recover from a failed chart without presenting an old value', async ({
	page
}) => {
	const api = await trackerFixture(page, { fail: 'price' });
	await page.goto('/tracker/timeline?region=nsw1&table=0');
	const minimum = page.getByTestId('metric-market-min');
	await expect(minimum).toContainText('Unavailable — retry the chart');
	await expect(minimum).toBeDisabled();
	await expect(minimum).toContainText('--');
	api.recover();
	await card(page, 'Market').getByRole('button', { name: 'Retry', exact: true }).click();
	await expect(minimum).toBeEnabled();
	await expect(minimum).toContainText('50');
});

test('PNG exports selected Stratum layers, legends and edited captions as the exact preview', async ({
	page
}, testInfo) => {
	await trackerFixture(page, { contributions: true });
	await page.goto('/tracker/timeline?region=nsw1&range=7d&table=0');
	await trackerReady(page);
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
	const api = await trackerFixture(page, { hold: 'price' });
	await page.goto('/tracker/timeline?region=nsw1&table=0');
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
	await trackerFixture(page, { contributions: true });
	await page.goto('/tracker/profile?profile-end=2026-08-31');
	// Stacked exports its one card: the stacked area (the radial bars sit in the
	// table panel).
	await expect(page.locator('[data-tracker-png]')).toHaveCount(1);
	const dialog = await openPng(page);
	await expect(dialog.getByRole('checkbox')).toHaveCount(1);
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
	await trackerFixture(page, { empty: 'price' });
	await page.goto('/tracker/timeline?region=nsw1&table=0');
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
	const api = await trackerFixture(page, { contributions: true, comparisonGrowth: true });
	const a = Date.parse('2026-08-01T00:00:00+10:00');
	const b = a + 86_400_000;
	await page.goto(
		`/tracker/timeline?start=${a}&end=${b + 86_400_000}&interval=30m&table=0&transform=proportion&contribution=demand&overlay=demand`
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
	const api = await trackerFixture(page, { contributions: true, comparisonGrowth: true });
	const a = Date.parse('2026-08-01T00:00:00+10:00');
	const b = a + 86_400_000;
	await page.goto(`/tracker/timeline?start=${a}&end=${b + 86_400_000}&interval=30m&table=0`);
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
	await expectNoHorizontalScroll(page);
	await page.screenshot({
		path: testInfo.outputPath('two-date-comparison-mobile.png'),
		fullPage: true
	});
});

test('comparison rejects stale range dates and waits for failed or missing generation', async ({
	page
}) => {
	const api = await trackerFixture(page, { fail: 'power' });
	const a = Date.parse('2026-08-01T00:00:00+08:00');
	const b = a + 86_400_000;
	await page.goto(
		`/tracker/timeline?region=wem&start=${a}&end=${b + 86_400_000}&interval=30m&table=0&compare=1&compare-a=${a}&compare-b=${b}`
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
	await trackerFixture(page, { contributions: true, comparisonGrowth: true });
	const start = Date.parse('2026-07-01T00:00:00+10:00');
	const end = Date.parse('2026-09-01T00:00:00+10:00');
	const a = Date.parse('2026-08-01T00:00:00+10:00');
	const b = a + 86_400_000;
	await page.goto(
		`/tracker/timeline?start=${start}&end=${end}&interval=1d&table=0&transform=proportion&hidden=wind&compare=1&compare-a=${a}&compare-b=${b}`
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
	await page.getByRole('radio', { name: 'Detailed', exact: true }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Done', exact: true }).click();
	await expect(panel.getByRole('rowheader', { name: 'Coal (Black)', exact: true })).toBeVisible();
	await expect(panel.getByRole('rowheader', { name: 'Wind', exact: true })).toBeVisible();
	await expect(panel.getByRole('combobox', { name: 'Date A', exact: true })).toHaveValue(String(a));
});

test('timeline cards outline their table column and series highlight their row', async ({
	page
}) => {
	await trackerFixture(page);
	await page.goto('/tracker/timeline?region=nsw1&table=1');
	await page.locator('main[data-hydrated]').waitFor();
	const table = page.locator('#tracker-table-panel');
	const generation = card(page, 'Generation');
	const focusedRows = table.locator('[data-testid="fuel-tech-row"][data-focused]');
	const focusedColumns = table.locator('th[data-focused]');
	await expect(generation.locator('path.path-area').first()).toBeVisible();
	// A series under the pointer: its row and the card's column (Av power).
	const areas = generation.locator('path.path-area');
	await areas.nth((await areas.count()) - 1).hover({ force: true });
	await expect(focusedColumns).toHaveCount(1);
	await expect(focusedColumns).toHaveAttribute('data-column', 'power');
	await expect(focusedRows).toHaveCount(1);
	await page.mouse.move(0, 0);
	await expect(focusedColumns).toHaveCount(0);
	await expect(focusedRows).toHaveCount(0);
	// Intensity isn't a default table column, so Emissions outlines nothing.
	await card(page, 'Emissions').locator('.stratum-chart-area').hover();
	await expect(focusedColumns).toHaveCount(0);
});

test('stacked profile cards outline their table column and area series highlight their row', async ({
	page
}) => {
	await trackerFixture(page);
	await page.goto('/tracker/profile?profile-end=2026-08-31');
	await page.locator('main[data-hydrated]').waitFor();
	const table = page.locator('#tracker-table-panel');
	const stack = card(page, 'Average over 7 full days');
	const focusedRows = table.locator('[data-testid="fuel-tech-row"][data-focused]');
	const focusedColumns = table.locator('th[data-focused]');
	const areas = stack.locator('path.path-area');
	await expect(areas.first()).toBeVisible();
	await areas.nth((await areas.count()) - 1).hover({ force: true });
	await expect(focusedColumns).toHaveAttribute('data-column', 'power');
	await expect(focusedRows).toHaveCount(1);
	// The radial bars read each hour's energy, with no series of their own.
	const dial = page
		.getByRole('group', { name: 'Average by hour', exact: true })
		.getByRole('img', { name: /average by hour of day$/ });
	// The dial sits under the table, possibly below the panel's fold.
	await dial.scrollIntoViewIfNeeded();
	const box = await dial.boundingBox();
	if (!box) throw new Error('dial not laid out');
	await page.mouse.move(box.x + box.width / 2 + 3, box.y + box.height / 2 - 20);
	await expect(focusedColumns).toHaveAttribute('data-column', 'energy');
	await expect(focusedRows).toHaveCount(0);
	await page.mouse.move(0, 0);
	await expect(focusedColumns).toHaveCount(0);
});

test('breakdown linear charts pin a slot on click and share it, with no pan or zoom', async ({
	page
}) => {
	await trackerFixture(page, { contributions: true });
	await page.goto('/tracker/profile?profile-end=2026-08-31&profile-display=breakdown');
	await page.locator('main[data-hydrated]').waitFor();
	const areas = page.locator('.stratum-chart-area');
	await expect(areas.first()).toBeVisible();
	await expect(page.getByRole('button', { name: /pan and zoom/ })).toHaveCount(0);
	await expect(page.getByRole('button', { name: /^Zoom (in|out)$/ })).toHaveCount(0);
	const strips = page.getByTestId('chart-tooltip-strip');
	const readout = page.getByTestId('tracker-range-label');
	// One click pins the slot on every card, the readout and the table.
	const box = await areas.first().boundingBox();
	if (!box) throw new Error('chart not laid out');
	await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.move(0, 0);
	await expect(readout).toHaveText(/^\d\d:\d\d–\d\d:\d\d$/);
	const pinned = await readout.innerText();
	const count = await strips.count();
	for (let i = 0; i < count; i++) await expect(strips.nth(i)).toContainText(pinned);
	// Clicking the pinned slot again releases it everywhere.
	await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.move(0, 0);
	await expect(readout).not.toHaveText(pinned);
	await expect(strips.first()).toHaveText('');
});

test('stacked radial bars and area share the hovered series', async ({ page }) => {
	await trackerFixture(page);
	await page.goto('/tracker/profile?profile-end=2026-08-31');
	await page.locator('main[data-hydrated]').waitFor();
	const table = page.locator('#tracker-table-panel');
	const focusedRows = table.locator('[data-testid="fuel-tech-row"][data-focused]');
	const clock = page.getByRole('group', { name: 'Average by hour', exact: true }).getByRole('img', {
		name: /average by hour of day$/
	});
	const slices = clock.locator(
		'path[fill]:not([fill="transparent"]):not([data-testid="dial-night"])'
	);
	await expect(slices.first()).toBeVisible();
	const layers = (await slices.count()) / 24;
	// A slice of the 12:00 hour with some length to point at.
	let target = -1;
	for (let layer = 0; layer < layers && target < 0; layer++) {
		const box = await slices.nth(12 * layers + layer).boundingBox();
		if (box && box.height > 6) target = layer;
	}
	expect(target).toBeGreaterThanOrEqual(0);
	const box = await slices.nth(12 * layers + target).boundingBox();
	if (!box) throw new Error('slice not laid out');
	// The dial's slice: its row highlights and the other layers fade.
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await expect(focusedRows).toHaveCount(1);
	await expect(slices.nth(12 * layers + target)).toHaveAttribute('opacity', '1');
	await expect(slices.nth(12 * layers + ((target + 1) % layers))).toHaveAttribute('opacity', '0.4');
	await page.mouse.move(0, 0);
	await expect(focusedRows).toHaveCount(0);
	await expect(slices.nth(12 * layers + ((target + 1) % layers))).toHaveAttribute('opacity', '1');
	// The area's series: the dial fades the other layers in every hour.
	const areas = card(page, 'Average over 7 full days').locator('path.path-area');
	await areas.nth((await areas.count()) - 1).hover({ force: true });
	await expect(focusedRows).toHaveCount(1);
	// The hour it syncs to on the dial shows the series alone at full strength.
	await expect(clock.locator('path[opacity="0.4"]').first()).toBeVisible();
});

test('stacked profile area and radial bars share one hover', async ({ page }) => {
	await trackerFixture(page);
	await page.goto('/tracker/profile?profile-end=2026-08-31');
	await page.locator('main[data-hydrated]').waitFor();
	const stack = card(page, 'Average over 7 full days');
	const area = stack.locator('.stratum-chart-area');
	const tooltip = stack.getByTestId('chart-tooltip-strip');
	const dial = page
		.getByRole('group', { name: 'Average by hour', exact: true })
		.getByRole('img', { name: /average by hour of day$/ });
	const dialReadout = page
		.getByRole('group', { name: 'Average by hour', exact: true })
		.getByTestId('dial-readout');
	const readout = page.getByTestId('tracker-range-label');
	await expect(stack.locator('path.path-area').first()).toBeVisible();
	// Hovering the area marks its slot's hour on the dial.
	await area.hover({ position: { x: 200, y: 120 } });
	const slot = (await tooltip.textContent())?.match(/(\d\d):\d\d–\d\d:\d\d/);
	expect(slot).not.toBeNull();
	await expect(dial.getByTestId('radial-hover')).toHaveCount(1);
	await expect(dialReadout).toContainText(`${slot?.[1]}:00–`);
	await page.mouse.move(0, 0);
	await expect(dial.getByTestId('radial-hover')).toHaveCount(0);
	// Hovering the dial's 12:00 hour marks it on the area; the table and readout
	// inspect the whole hour.
	// The dial sits under the table, possibly below the panel's fold.
	await dial.scrollIntoViewIfNeeded();
	const box = await dial.boundingBox();
	if (!box) throw new Error('dial not laid out');
	await page.mouse.move(box.x + box.width / 2 + 3, box.y + box.height / 2 - 20);
	await expect(dialReadout).toContainText('12:00–13:00');
	await expect(tooltip).toContainText('12:00–');
	await expect(readout).toHaveText('12:00–13:00');
	await page.mouse.move(0, 0);
	await expect(tooltip).not.toContainText('12:00–');
});

test('Stratum profiles support hover, keyboard pinning, table filtering and bounded zoom without fetching', async ({
	page
}, testInfo) => {
	const api = await trackerFixture(page, { contributions: true });
	await page.goto('/tracker/profile?profile-end=2026-08-31');
	const stack = card(page, 'Average over 7 full days');
	const table = page.locator('#tracker-table-panel');
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
	const tooltip = stack.getByTestId('chart-tooltip-strip');
	const readout = page.getByTestId('tracker-range-label');
	await expect(readout).toHaveText(/25.*31 Aug 2026/);
	await area.hover({ position: { x: 200, y: 120 } });
	await expect(tooltip).toContainText(/\d\d:\d\d–\d\d:\d\d/);
	await expect(tooltip).not.toContainText('UTC');
	await expect(tooltip).not.toContainText('2000');
	await page.mouse.move(0, 0);
	const inspect = stack.getByRole('button', { name: /^Inspect / });
	await inspect.focus();
	await inspect.press('ArrowRight');
	await expect(tooltip).toContainText('00:30–01:00');
	// The readout and the table follow the inspected half-hour.
	await expect(readout).toHaveText('00:30–01:00');
	await inspect.press('Enter');
	await page.mouse.move(0, 0);
	await expect(tooltip).toContainText('00:30–01:00');
	await inspect.press('Escape');
	await expect(tooltip).not.toContainText('00:30–01:00');
	await expect(readout).toHaveText(/25.*31 Aug 2026/);
	const coal = table.getByTestId('fuel-tech-row').filter({ hasText: 'Coal' });
	await coal.click();
	await expect(stack.locator('path.path-area')).toHaveCount(3);
	await expect(coal).toHaveAttribute('aria-pressed', 'false');
	await expect(page).toHaveURL(/hidden=coal/);
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
	await stack.getByRole('button', { name: 'Disable pan and zoom', exact: true }).click();
	await stack.getByRole('button', { name: 'Zoom out', exact: true }).click();
	await expect(stack.getByRole('button', { name: 'Zoom out', exact: true })).toBeDisabled();
	const resize = page.getByRole('separator', { name: 'Resize chart height' }).first();
	const grip = await resize.boundingBox();
	const beforeHeight = (await area.boundingBox()).height;
	await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
	await page.mouse.down();
	await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2 + 50, { steps: 5 });
	await page.mouse.up();
	await expect.poll(async () => (await area.boundingBox()).height).toBeGreaterThan(beforeHeight);
	// Breakdown swaps the stack for the stacked view's chart per technology, two
	// columns wide, minus those the table hides (coal, above), then spot price.
	// Hovering one inspects that slot in the table and the readout, up to the last.
	const charts = page.getByRole('group', { name: /interactive chart$/ });
	await page.getByRole('button', { name: 'Breakdown', exact: true }).click();
	await expect(page).toHaveURL(/profile-display=breakdown/);
	await expect(charts).toHaveCount(4);
	await expect(charts.last()).toHaveAccessibleName('Spot price interactive chart');
	await expect(card(page, 'Market')).toContainText('Spot price');
	await expect(navPill(page, 'Fuel technologies')).toHaveCount(0);
	const [left, right] = await Promise.all([
		charts.nth(0).boundingBox(),
		charts.nth(1).boundingBox()
	]);
	expect(right.x).toBeGreaterThan(left.x + left.width);
	expect(Math.abs(right.y - left.y)).toBeLessThan(2);
	// Percentile bands by default: the 10–90% and 25–75% spread (an invisible
	// base and four bands) with a dark median. The strip reads the slot's
	// average; the table swaps its columns for each technology's percentiles.
	await expect(styleButton(page, 'Percentile bands')).toHaveAttribute('aria-pressed', 'true');
	await expect(page).not.toHaveURL(/profile-style/);
	await expect(charts.first().locator('path.path-area')).toHaveCount(5);
	await expect(charts.first().locator('path.overlay-line')).toHaveCount(1);
	await expect(charts.first().locator('path.overlay-line')).toHaveAttribute('stroke', '#222222');
	await expect(charts.last().locator('path.overlay-line')).toHaveCount(1);
	const bandArea = charts.first().locator('.stratum-chart-area');
	await bandArea.scrollIntoViewIfNeeded();
	await bandArea.hover({ position: { x: 200, y: 100 } });
	const strip = charts.first().getByTestId('chart-tooltip-strip');
	await expect(strip).toContainText('Av.');
	await expect(strip).not.toContainText('Median');
	// Every breakdown chart follows the hovered slot.
	const slot = (await strip.innerText()).match(/\d\d:\d\d–\d\d:\d\d/)?.[0];
	expect(slot).toBeTruthy();
	await expect(charts.nth(1).getByTestId('chart-tooltip-strip')).toContainText(
		/** @type {string} */ (slot)
	);
	await expect(charts.last().getByTestId('chart-tooltip-strip')).toContainText(
		/** @type {string} */ (slot)
	);
	const headers = table.getByRole('columnheader');
	for (const name of ['10%', '25%', 'Median', '75%', '90%'])
		await expect(headers.filter({ hasText: name })).toHaveCount(1);
	await expect(headers.filter({ hasText: 'Energy' })).toHaveCount(0);
	// Charging (a constant −400 MW load) reads as its 400 MW magnitude.
	await expect(table.getByTestId('fuel-tech-row').filter({ hasText: 'Charging' })).toContainText(
		'400'
	);
	await page.mouse.move(0, 0);
	const seriesArea = charts.first().locator('.stratum-chart-area');
	await seriesArea.scrollIntoViewIfNeeded();
	const series = await seriesArea.boundingBox();
	await page.mouse.move(series.x + series.width - 2, series.y + series.height / 2);
	await expect(readout).toHaveText('23:30–24:00');
	await page.mouse.move(0, 0);
	// The table's row toggles show and hide the charts.
	const wind = table.getByTestId('fuel-tech-row').filter({ hasText: 'Wind' });
	await wind.click();
	await expect(charts).toHaveCount(3);
	await expect(page.getByRole('heading', { name: 'Wind', exact: true })).toHaveCount(0);
	await coal.click();
	await expect(charts).toHaveCount(4);
	await expect(page.getByRole('heading', { name: 'Coal', exact: true })).toBeVisible();
	// Spot price loads only for the breakdown.
	expect([...api.requests].sort()).toEqual(['power', 'price', 'renewables']);
	// "Show today" (off by default) adds the current day so far as a thicker
	// OE red line, fetched only once shown.
	const showToday = page.getByRole('switch', { name: 'Show today' });
	await expect(showToday).toHaveAttribute('aria-checked', 'false');
	await showToday.click();
	await expect(page).toHaveURL(/profile-today=1/);
	const todayLine = charts.first().locator('path.overlay-line[stroke="#C74523"]');
	await expect(todayLine).toHaveCount(1);
	await expect(todayLine).toHaveAttribute('stroke-width', '2.5');
	await expect(charts.last().locator('path.overlay-line[stroke="#C74523"]')).toHaveCount(1);
	// The strip reads today's value, in OE red, before the slot's average.
	await charts
		.first()
		.locator('.stratum-chart-area')
		.hover({ position: { x: 8, y: 100 } });
	const todayStrip = charts.first().getByTestId('chart-tooltip-strip');
	await expect(todayStrip).toContainText(/Today.*Av\./);
	await expect(todayStrip.locator('strong').first()).toHaveCSS('color', 'rgb(199, 69, 35)');
	await page.mouse.move(0, 0);
	// Multi-line: the average area with the 7 days, the dark average and today.
	await styleButton(page, 'Multi-line').click();
	await expect(page).toHaveURL(/profile-style=lines/);
	await expect(charts).toHaveCount(4);
	await expect(charts.first().locator('path.path-area')).toHaveCount(1);
	await expect(charts.first().locator('path.overlay-line')).toHaveCount(9);
	await expect(charts.first().locator('path.overlay-line[stroke="#222222"]')).toHaveCount(1);
	await expect(charts.last().locator('path.overlay-line')).toHaveCount(9);
	// Its table reads the ridgeline's Average-and-dates columns, not Energy.
	await expect(table.locator('th[data-column="average"]')).toHaveCount(1);
	await expect(table.getByRole('columnheader').filter({ hasText: 'Energy' })).toHaveCount(0);
	// The Breakdown options bar: Show today, a divider, then the style switcher's
	// icons, linear styles before radial.
	const breakdownOptions = page.getByRole('region', { name: 'Breakdown options', exact: true });
	await expect(breakdownOptions.getByRole('separator')).toHaveCount(1);
	expect(
		await breakdownOptions
			.getByRole('button')
			.evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')))
	).toEqual(['Multi-line', 'Percentile bands', 'Ridgeline', 'Radial bars', 'Radial heatmap']);
	await expect(styleButton(page, 'Multi-line')).toHaveAttribute('aria-pressed', 'true');
	// Each icon names its style in the app's tooltip, not the browser's title.
	await expect(styleButton(page, 'Ridgeline')).not.toHaveAttribute('title');
	await styleButton(page, 'Ridgeline').hover();
	await expect(page.locator('[data-tooltip-content]')).toContainText('Ridgeline');
	await page.mouse.move(0, 0);
	// Radial bars: each series' hourly averages around a 24-hour dial.
	await styleButton(page, 'Radial bars').click();
	await expect(page).toHaveURL(/profile-style=radial/);
	await expect(charts).toHaveCount(0);
	const clocks = page.getByRole('img', { name: /average by hour of day$/ });
	await expect(clocks).toHaveCount(4);
	await expect(clocks.first().locator('path[fill="transparent"]')).toHaveCount(24);
	await expect(clocks.first().locator('path[stroke="#C74523"]')).toHaveCount(1);
	// The whole hour sector takes the hover, even inside the hub where no bar is:
	// just right of straight up is 12:00–13:00 (noon at the top, clockwise).
	const dial = await clocks.first().boundingBox();
	await page.mouse.move(dial.x + dial.width / 2 + 3, dial.y + dial.height / 2 - 20);
	await expect(page.getByTestId('dial-readout').first()).toContainText('12:00–13:00');
	await expect(clocks.first().getByTestId('radial-hover')).toHaveCount(1);
	// The hovered hour's time reads on the arc, in place of the fixed noon label.
	await expect(clocks.first().getByTestId('dial-hover-time')).toHaveText('12:00');
	await expect(
		clocks
			.first()
			.locator('text')
			.filter({ hasText: /^12:00$/ })
	).toHaveCount(1);
	// Today's value sits centred below each dial, not in the readout band.
	const dialToday = page.getByTestId('dial-today');
	await expect(dialToday).toHaveCount(4);
	await expect(page.getByTestId('dial-readout').first()).not.toContainText('Today');
	await page.mouse.move(dial.x + dial.width / 2 - 3, dial.y + dial.height / 2 + 20);
	await expect(page.getByTestId('dial-readout').first()).toContainText('00:00–01:00');
	await expect(dialToday.first()).toHaveText(/^Today \S+ MW$/);
	await expect(dialToday.first()).toHaveCSS('text-align', 'center');
	// With nothing hovered, both read the average across the hours.
	await page.mouse.move(0, 0);
	await expect(page.getByTestId('dial-readout').first()).toContainText('Av.');
	await expect(dialToday.first()).toHaveText(/^Today Av\. \S+ MW$/);
	await expect(dialToday.first().locator('strong')).toHaveCSS('font-weight', '600');
	await page.mouse.move(dial.x + dial.width / 2 + 3, dial.y + dial.height / 2 - 20);
	// The hovered hour drives the table and the range readout too.
	await expect(readout).toHaveText('12:00–13:00');
	await expect(table.getByTestId('fuel-tech-row').filter({ hasText: 'Coal' })).toContainText('100');
	// The dials share the hovered hour.
	await expect(page.getByTestId('dial-readout').nth(1)).toContainText('12:00–13:00');
	// Loads read as positive on the dial: charging's 400 MW grows outward.
	const charging = page.getByRole('img', { name: /Charging.* average by hour of day$/ });
	await expect(charging).toHaveCount(1);
	const chargingValues = page.getByRole('table', { name: /Charging.* average by hour \(MW\)$/ });
	await expect(chargingValues.locator('tbody tr').first().locator('td').first()).toHaveText('400');
	// Ridgeline: one offset curve per day, today at the front in OE red, on the
	// shared breakdown hover.
	await styleButton(page, 'Ridgeline').click();
	await expect(page).toHaveURL(/profile-style=ridgeline/);
	const ridgelines = page.getByRole('img', { name: /one curve per day$/ });
	await expect(ridgelines).toHaveCount(4);
	await expect(ridgelines.first().locator('path[data-ridge]')).toHaveCount(8);
	// Only each ridge's top carries the outline; its ends and baseline don't.
	await expect(ridgelines.first().locator('path[data-ridge][stroke]')).toHaveCount(0);
	await expect(ridgelines.first().locator('path[stroke="#C74523"]')).toHaveCount(1);
	const ridgeBox = await ridgelines.first().boundingBox();
	await page.mouse.move(ridgeBox.x + ridgeBox.width / 2, ridgeBox.y + ridgeBox.height / 2);
	await expect(readout).toHaveText(/^\d\d:\d\d–\d\d:\d\d$/);
	const ridgeSlot = await readout.innerText();
	await expect(page.getByTestId('chart-tooltip-strip').nth(1)).toContainText(ridgeSlot);
	await expect(page.getByTestId('chart-tooltip-strip').first()).toContainText('Av.');
	await page.mouse.move(0, 0);
	// The table shows each technology's average and every day.
	const ridgeHeaders = table.getByRole('columnheader');
	await expect(ridgeHeaders.filter({ hasText: 'Average' })).toHaveCount(1);
	await expect(ridgeHeaders.filter({ hasText: /^\d{1,2} Aug/ })).toHaveCount(7);
	await expect(ridgeHeaders.filter({ hasText: 'Energy' })).toHaveCount(0);
	// Hovering a day's ridge scrolls the table to that day's column and marks it:
	// just above 31 Aug's baseline (the last day, before today's ridge).
	const lastBaseline = await ridgelines.first().locator('line').nth(6).boundingBox();
	await page.mouse.move(lastBaseline.x + lastBaseline.width / 2, lastBaseline.y - 3);
	const lastDay = table.locator('th[data-column="2026-08-31"]');
	await expect(lastDay).toHaveClass(/bg-warm-grey/);
	await expect(lastDay).toBeInViewport();
	// That day's ridge is highlighted on every ridgeline.
	await expect(ridgelines.first().locator('path[data-active]')).toHaveCount(1);
	await expect(ridgelines.nth(1).locator('path[data-active]')).toHaveCount(1);
	await page.mouse.move(0, 0);
	await expect(lastDay).not.toHaveClass(/bg-warm-grey/);
	await expect(ridgelines.first().locator('path[data-active]')).toHaveCount(0);
	// Radial heatmap: each ring a day on the 24-hour dial (cells on a canvas),
	// sharing the slot hover and the day's table column with the other cards.
	await styleButton(page, 'Radial heatmap').click();
	await expect(page).toHaveURL(/profile-style=heatmap/);
	const heatmaps = page.getByRole('img', { name: /each ring is a day/ });
	await expect(heatmaps).toHaveCount(4);
	await expect(page.locator('[data-chart-area] canvas[data-png-layer]')).toHaveCount(4);
	// The heatmap has no today ring: its toggle is disabled and shows off,
	// while the URL keeps the choice for the other styles.
	await expect(showToday).toBeDisabled();
	await expect(showToday).toHaveAttribute('aria-checked', 'false');
	await expect(page).toHaveURL(/profile-today=1/);
	await expect(heatmaps.first().locator('circle[stroke="#C74523"]')).toHaveCount(0);
	// Heatmap cards are mini cards, titled with an h6 like the scenarios' mini
	// charts.
	await expect(page.locator('h6').filter({ hasText: /^Coal$/ })).toBeVisible();
	// Enlarge opens a card in the lightbox; ← / → step through the cards, and
	// Escape closes it.
	await page.getByRole('button', { name: 'Enlarge Coal', exact: true }).click();
	const lightbox = page.getByRole('dialog');
	await expect(lightbox.getByRole('heading', { name: 'Coal', exact: true })).toBeVisible();
	await expect(lightbox).toContainText('1 / 4');
	await expect(lightbox.getByRole('img', { name: /each ring is a day/ })).toHaveCount(1);
	await page.keyboard.press('ArrowRight');
	await expect(lightbox.getByRole('heading', { name: 'Imports', exact: true })).toBeVisible();
	await lightbox.getByRole('button', { name: 'Previous chart' }).click();
	await page.keyboard.press('ArrowLeft');
	await expect(lightbox).toContainText('4 / 4');
	await page.keyboard.press('Escape');
	await expect(lightbox).toHaveCount(0);
	let heat = await heatmaps.first().boundingBox();
	// Just right of straight up, in the outer ring (the latest day): 12:00–12:30.
	// Re-measure until the layout settles after the lightbox closes.
	await expect(async () => {
		heat = await heatmaps.first().boundingBox();
		await page.mouse.move(heat.x + heat.width / 2 + 3, heat.y + 52);
		await expect(readout).toHaveText('12:00–12:30', { timeout: 1000 });
	}).toPass();
	await expect(heatmaps.first().getByTestId('dial-hover-time')).toHaveText('12:00');
	await expect(table.locator('th[data-column="2026-08-31"]')).toHaveClass(/bg-warm-grey/);
	await expect(page.getByTestId('dial-readout').nth(1)).toContainText('12:00–12:30');
	// The innermost ring is the oldest day, and its column comes into view.
	// Mid-way through the innermost of its seven rings, from the dial's
	// geometry: a 48px margin and a hub at 22% of the radius.
	const outer = heat.width / 2 - 48;
	const firstRing = 0.22 * outer + (0.78 * outer) / 7 / 2;
	await page.mouse.move(heat.x + heat.width / 2 + 3, heat.y + heat.height / 2 - firstRing);
	await expect(table.locator('th[data-column="2026-08-25"]')).toHaveClass(/bg-warm-grey/);
	await page.mouse.move(0, 0);
	await styleButton(page, 'Percentile bands').click();
	await expect(page).not.toHaveURL(/profile-style/);
	await expect(showToday).toBeEnabled();
	await expect(showToday).toHaveAttribute('aria-checked', 'true');
	await page.getByRole('button', { name: 'Stacked', exact: true }).click();
	await expect(showToday).toHaveCount(0);
	await expect(charts).toHaveCount(1);
	await page.screenshot({
		path: testInfo.outputPath('stratum-profile-interaction.png'),
		fullPage: true
	});
});

test('average-day stack includes every technology and persists beside price without duplicate power requests', async ({
	page
}, testInfo) => {
	const api = await trackerFixture(page, { contributions: true });
	await page.goto('/tracker/profile?profile-end=2026-08-31&hidden=coal');
	const stack = card(page, 'Average over 7 full days');
	const table = page.locator('#tracker-table-panel');
	await expect(stack.locator('.stratum-chart')).toBeVisible();
	// Profile shares Timeline's URL-owned visibility: the linked hidden source
	// stays out of the stack but keeps its row and values in the table.
	await expect(stack.locator('path.path-area')).toHaveCount(3);
	const coal = table.getByTestId('fuel-tech-row').filter({ hasText: 'Coal' });
	await expect(coal).toHaveAttribute('aria-pressed', 'false');
	await expect(coal).toContainText('100');
	await expect(table.getByTestId('fuel-tech-row')).toHaveCount(4);
	// Contribution defaults to a share of the average day's gross demand (100 MW
	// in the fixture), and its header switches to source generation (coal 100 of
	// 300 MW).
	const contribution = table.getByRole('columnheader', { name: /^Contribution/ });
	await expect(contribution).toContainText('demand');
	await expect(coal).toContainText('100.0%');
	await contribution.getByRole('button').click();
	await expect(contribution).toContainText('generation');
	await expect(page).toHaveURL(/contribution=generation/);
	await expect(coal).toContainText('33.3%');
	await contribution.getByRole('button').click();
	await expect(contribution).toContainText('demand');
	await table.getByRole('button', { name: 'Show all', exact: true }).click();
	await expect(stack.locator('path.path-area')).toHaveCount(4);
	expect(api.requests.filter((metric) => metric === 'power')).toHaveLength(1);
	// The breakdown and its options stay out of the stacked display.
	await expect(navPill(page, 'Fuel technologies')).toHaveCount(0);
	await expect(navPill(page, 'Power')).toHaveCount(0);
	await expect(navPill(page, 'Simplified')).toHaveCount(0);
	await table
		.getByRole('columnheader', { name: /^Technology/ })
		.getByRole('button')
		.click();
	await page
		.getByRole('listbox', { name: 'Fuel tech grouping' })
		.getByRole('option', { name: 'Detailed', exact: true })
		.click();
	await expect(table.getByRole('columnheader', { name: /Detailed/ })).toBeVisible();
	await expect(
		table.getByTestId('fuel-tech-row').filter({ hasText: 'Coal (Black)' })
	).toHaveAttribute('aria-pressed', 'true');
	// With the table closed, its rail keeps the grouping reachable.
	await page.getByRole('button', { name: 'Hide fuel tech table' }).click();
	await page.getByRole('button', { name: 'Fuel technology options', exact: true }).click();
	await expect(page.getByRole('dialog', { name: 'Fuel technology options' })).toBeVisible();
	await page.keyboard.press('Escape');
	await page.screenshot({ path: testInfo.outputPath('average-day-stack.png'), fullPage: true });
});

test('Stacked shows the stacked area beside radial bars that stack every visible technology by hour', async ({
	page
}) => {
	const api = await trackerFixture(page, { contributions: true });
	await page.goto('/tracker/profile?profile-end=2026-08-31');
	const table = page.locator('#tracker-table-panel');
	const readout = page.getByTestId('tracker-range-label');
	// Both stacked charts show (the dial in the table panel), with no stacked style to pick.
	await expect(card(page, 'Average over 7 full days').locator('path.path-area')).toHaveCount(4);
	await expect(navPill(page, 'Stacked area')).toHaveCount(0);
	const stack = page.getByRole('group', { name: 'Average by hour', exact: true });
	const clock = stack.getByRole('img', { name: /average by hour of day$/ });
	await expect(clock).toHaveCount(1);
	// One slice per technology per hour, sources outward and loads inward.
	const slices = clock.locator(
		'path[fill]:not([fill="transparent"]):not([data-testid="dial-night"])'
	);
	await expect(slices).toHaveCount(4 * 24);
	// Each hour's net total across the layers reads as energy (in the dial's
	// visually hidden table; hovering shows no browser tooltip).
	await expect(clock.locator('title')).toHaveCount(1);
	const stackValues = page.getByRole('table', { name: /average by hour \(MWh\)$/ });
	const netAt = (/** @type {number} */ row) =>
		stackValues.locator('tbody tr').nth(row).locator('td').first();
	await expect(netAt(0)).toHaveText('200');
	// Noon sits at the top, and the window's average night is shaded behind,
	// from sunset round to sunrise at the NEM capitals.
	await expect(clock.getByTestId('dial-tick')).toHaveCount(4);
	// The stacked radial bars sit in the table panel, with no enlarge mode.
	await expect(stack.getByRole('button', { name: /^Enlarge / })).toHaveCount(0);
	await expect(clock.getByTestId('dial-night').locator('title')).toHaveText(
		/^Night 1[78]:\d\d–0[67]:\d\d, average sunset to sunrise at the NEM capitals$/
	);
	// The table's last footnote says where the night comes from.
	await expect(table.locator('footer li').last()).toHaveText(
		/^Night shading: .* a plain average of Sydney, Brisbane, Melbourne, Adelaide and Hobart, in market time \(AEST all year\)\.$/
	);
	// The dial sits under the table, possibly below the panel's fold.
	await clock.scrollIntoViewIfNeeded();
	const dial = await clock.boundingBox();
	await page.mouse.move(dial.x + dial.width / 2 + 3, dial.y + dial.height / 2 - 20);
	await expect(stack.getByTestId('dial-readout')).toContainText('12:00–13:00');
	await expect(stack.getByTestId('dial-readout')).toContainText('MWh net');
	await expect(readout).toHaveText('12:00–13:00');
	await expect(table.getByTestId('fuel-tech-row').filter({ hasText: 'Coal' })).toContainText('100');
	await page.mouse.move(0, 0);
	await expect(readout).toHaveText(/25.*31 Aug 2026/);
	// Table row toggles take a technology out of the dial.
	await table.getByTestId('fuel-tech-row').filter({ hasText: 'Coal' }).click();
	await expect(slices).toHaveCount(3 * 24);
	await expect(netAt(0)).toHaveText('100');
	// The toggle hides it from the stacked area too, and one power request
	// serves both charts.
	await expect(card(page, 'Average over 7 full days').locator('path.path-area')).toHaveCount(3);
	expect(api.requests.filter((metric) => metric === 'power')).toHaveLength(1);
	// An old link with the retired stacked style still opens both charts.
	await page.goto('/tracker/profile?profile-end=2026-08-31&profile-stack=radial');
	await expect(
		page.getByRole('group', { name: 'Average by hour', exact: true }).getByRole('img')
	).toHaveCount(1);
	await expect(card(page, 'Average over 7 full days').locator('path.path-area')).toHaveCount(4);
});

test('time-of-day profiles keep requests bounded and reproduce selections and CSV', async ({
	page
}) => {
	const api = await trackerFixture(page);
	await page.goto('/tracker/profile?region=wem&profile-display=breakdown&profile-end=2026-08-31');
	// The WEM fixture has coal and wind: a chart each, then spot price.
	const charts = page.getByRole('group', { name: /interactive chart$/ });
	await expect(charts).toHaveCount(3);
	await expect(page.getByTestId('tracker-range-label')).toHaveText(/25.*31 Aug 2026/);
	expect([...api.requests].sort()).toEqual(['power', 'price', 'renewables']);
	for (const [from, days] of [
		[7, 14],
		[14, 28]
	]) {
		await pickNavOption(page, 'Window', `${from} days`, `${days} days`);
		await expect(navPill(page, `${days} days`)).toBeVisible();
		// The wider window's missing earlier days have loaded.
		await expect(page.getByRole('region', { name: 'Profile analysis' })).toHaveAttribute(
			'aria-busy',
			'false'
		);
		await expect(charts.first().locator('path.path-area')).toHaveCount(5);
	}
	// Every request stays inside the selected complete days: widening the window
	// fetches only the missing earlier days, never a speculative buffer.
	const windowEnd = Date.parse('2026-09-01T00:00:00+08:00');
	for (const url of api.urls) {
		const params = new URL(url).searchParams;
		const start = Date.parse(`${params.get('date_start')}+08:00`);
		const end = Date.parse(`${params.get('date_end')}+08:00`);
		expect(end - start).toBeLessThanOrEqual(28 * 86_400_000);
		expect(params.get('interval')).toBe('5m');
		expect(end).toBeLessThanOrEqual(windowEnd);
		expect(start).toBeGreaterThanOrEqual(windowEnd - 28 * 86_400_000);
	}
	// 5-minute slots re-average the same native readings: no new request.
	const fetched = api.requests.length;
	await pickNavOption(page, 'Interval', '30 min', '5 min');
	await expect(page).toHaveURL(/profile-interval=5m/);
	expect(api.requests).toHaveLength(fetched);
	const csv = await readFile(await (await download(page, 'Profile')).path(), 'utf8');
	expect(csv.trim().split(/\r?\n/)).toHaveLength(289);
	expect(csv).toContain(',00:05,');
	// Each series' average and day count, then every day's value; spot price last.
	expect(csv).toMatch(/average \(MW\),[^,]+ days,[^,]+ 2026-08-04 \(MW\)/);
	expect(csv).toContain('Spot price average ($/MWh),Spot price days,Spot price 2026-08-04 ($/MWh)');
	expect(csv).toMatch(/AWST \(UTC\+08:00\),00:00,(100|200),28,/);
	// The last day uses the app's date picker; its calendar's reset returns to
	// the latest complete days.
	await page.getByRole('button', { name: 'Open calendar' }).click();
	const calendar = page.locator('[data-calendar-root]');
	await expect(calendar).toHaveAttribute('aria-label', /Last day/);
	const latest = page.getByRole('button', { name: 'Latest complete days' });
	await expect(latest).toBeEnabled();
	await latest.click();
	await expect(calendar).toHaveCount(0);
	await expect(page).not.toHaveURL(/profile-end/);
	await page.goBack();
	await expect(page).toHaveURL(/profile-end=2026-08-31/);
	const url = await copyTrackerLink(page);
	expect(new URL(url).pathname).toBe('/tracker/profile');
	expect(new URL(url).searchParams.get('profile-days')).toBe('28');
	await page.goto(url);
	await expect(navPill(page, '28 days')).toBeVisible();
	await expect(charts).toHaveCount(3);
});

test('time-of-day switches reset settings, restore history and fit narrow screens', async ({
	page
}, testInfo) => {
	await trackerFixture(page);
	await page.goto(
		'/tracker/profile?profile-end=2026-08-31&profile-days=14&range=30d&interval=1h&hidden=coal&transform=proportion'
	);
	const original = page.url();
	const stack = card(page, 'Average over 14 full days').locator('.stratum-chart');
	await expect(stack).toBeVisible();
	await page.getByRole('button', { name: 'Timeline', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Timeline', exact: true })).toBeVisible();
	await expect(card(page, 'Generation')).toBeVisible();
	expect(new URL(page.url()).search).toBe('');
	await page.goBack();
	await expect(page.getByRole('button', { name: 'Profile', exact: true })).toBeVisible();
	await expect(page).toHaveURL(original);
	await expect(navPill(page, '14 days')).toBeVisible();
	await expect(stack).toBeVisible();
	await page.setViewportSize({ width: 390, height: 844 });
	await expect(navPill(page, '14 days')).toBeVisible();
	await expectNoHorizontalScroll(page);
	await page.screenshot({ path: testInfo.outputPath('time-of-day-mobile.png'), fullPage: true });
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.screenshot({ path: testInfo.outputPath('time-of-day-desktop.png'), fullPage: true });
});

/** Pick the Profile's last day in the app's date picker: open its calendar,
 * step back a month and choose the day.
 * @param {import('@playwright/test').Page} page @param {string} date */
async function pickProfileLastDay(page, date) {
	await page.getByRole('button', { name: 'Open calendar' }).click();
	const calendar = page.locator('[data-calendar-root]');
	await calendar.getByRole('button', { name: /previous/i }).click();
	await calendar.locator(`[data-bits-day][data-value="${date}"]`).click();
	await expect(calendar).toHaveCount(0);
}

/** The options menu offers only the profile CSV in Profile, enabled once it can export.
 * @param {import('@playwright/test').Page} page @param {boolean} enabled */
async function expectProfileDownload(page, enabled) {
	const menu = await openOptions(page);
	const item = menu.getByRole('button', { name: 'Profile', exact: true });
	await (enabled ? expect(item).toBeEnabled() : expect(item).toBeDisabled());
	await expect(menu.getByRole('button', { name: /workbook/ })).toHaveCount(0);
	await page.getByRole('button', { name: 'Options', exact: true }).click();
	await expect(menu).toBeHidden();
}

test('time-of-day failures and empty results remain explicit and never export a pending series', async ({
	page
}) => {
	const api = await trackerFixture(page, { fail: 'power' });
	await page.goto('/tracker/profile?profile-display=breakdown&profile-end=2026-08-31');
	await expect(page.getByRole('alert')).toContainText('Fixture failure');
	await expectProfileDownload(page, false);
	api.recover();
	await page.getByRole('button', { name: 'Retry profile' }).click();
	await expect(page.getByRole('alert')).toHaveCount(0);
	await expect(page.getByRole('group', { name: /interactive chart$/ }).first()).toBeVisible();
	await expectProfileDownload(page, true);
	await trackerFixture(page, { empty: 'power' });
	// Use a new window so the successful response cache cannot satisfy it.
	await pickProfileLastDay(page, '2026-07-31');
	// No technology has data in this window; spot price still charts and exports.
	await expect(page.getByRole('group', { name: /interactive chart$/ }).last()).toHaveAccessibleName(
		'Spot price interactive chart'
	);
	await expectProfileDownload(page, true);
});

test('copied analytical links restore hidden sources, contribution, transforms and emissions exclusions', async ({
	page,
	context
}) => {
	await trackerFixture(page, { distinctEmissions: true });
	await page.goto('/tracker/timeline?region=nsw1&table=1');
	await trackerReady(page);
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
	await trackerFixture(reopened, { distinctEmissions: true });
	await reopened.goto(copied);
	await trackerReady(reopened);
	await expect(
		card(reopened, 'Generation').getByText('% of generation', { exact: true })
	).toBeVisible();
	await expect(await hoverGeneration(reopened)).not.toContainText('Coal');
	await trackerReady(reopened);
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
	await trackerReady(reopened);
	await expect(
		card(reopened, 'Generation').getByText('% of generation', { exact: true })
	).toBeVisible();
	await expect(await hoverGeneration(reopened)).not.toContainText('Coal');
	await reopened.close();
});

test('analytical history restores grouping visibility and transform without echo entries', async ({
	page
}) => {
	await trackerFixture(page);
	await page.goto('/tracker/timeline?region=nsw1&table=1');
	await trackerReady(page);
	const initialHistory = await page.evaluate(() => history.length);
	await percentageView(page);
	await page.getByTestId('fuel-tech-row').filter({ hasText: 'Coal' }).first().click();
	await page.getByRole('button', { name: 'Fuel technology options', exact: true }).click();
	await page.getByRole('radio', { name: 'Detailed', exact: true }).click();
	await page.getByRole('dialog').getByRole('button', { name: 'Done', exact: true }).click();
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

test('solo selections are atomic', async ({ page }) => {
	await trackerFixture(page);
	await page.goto(
		'/tracker/timeline?region=nsw1&table=1&hidden=coal&contribution=generation&transform=proportion'
	);
	await trackerReady(page);
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
});

test('timeline tooltip stays above the chart and table inspection follows contribution basis', async ({
	page
}, testInfo) => {
	await trackerFixture(page, { contributions: true });
	await page.goto('/tracker/timeline?region=nsw1&contribution=generation&table=1');
	await chartsSettled(page);
	const generation = card(page, 'Generation');
	const wind = page.getByTestId('fuel-tech-row').filter({ hasText: 'Wind' }).first();
	let tooltip = await hoverGeneration(page);
	await expect(tooltip).toContainText('MW');
	await expect(wind.locator('td').nth(3)).toHaveText('66.7%');
	await expect(page.getByTestId('chart-floating-tooltip')).toHaveCount(0);
	const plot = await generation.locator('.stratum-chart-area').boundingBox();
	const strip = await tooltip.boundingBox();
	expect(strip.y + strip.height).toBeLessThanOrEqual(plot.y);
	await page.screenshot({ path: testInfo.outputPath('timeline-tooltip-strip.png') });
	await contributionBasis(page, '% demand');
	tooltip = await hoverGeneration(page);
	await expect(wind.locator('td').nth(3)).toHaveText('200.0%');
	await page.mouse.move(0, 0);
	await expect(tooltip).toHaveText('');
	await expect(page.getByTestId('tracker-range-status')).toHaveAttribute(
		'data-inspecting',
		'false'
	);
	await page.getByRole('button', { name: 'Hide fuel tech table', exact: true }).click();
	await page.setViewportSize({ width: 390, height: 844 });
	tooltip = await hoverGeneration(page);
	await expect(tooltip).toContainText('MW');
	await expectNoHorizontalScroll(page);
	await page.screenshot({ path: testInfo.outputPath('timeline-tooltip-strip-mobile.png') });
});

test('timeline strip follows keyboard inspection in line mode', async ({ page }) => {
	await trackerFixture(page, { contributions: true });
	await page.goto('/tracker/timeline?region=nsw1&table=0');
	const generation = card(page, 'Generation');
	await chartsSettled(page);
	await generation.getByRole('button', { name: 'Toggle chart options' }).click();
	await generation.getByRole('tab', { name: 'Line', exact: true }).click();
	await generation.getByRole('heading', { name: 'Generation', exact: true }).click();
	await page.getByTestId('metric-generation-min').focus();
	await expect(generation.getByTestId('chart-tooltip-strip')).not.toHaveText('');
	await expect(page.getByTestId('chart-floating-tooltip')).toHaveCount(0);
});

test('percentage shares stay stable when hiding series and exports keep raw units', async ({
	page
}) => {
	await trackerFixture(page, { contributions: true });
	await page.goto('/tracker/timeline?region=nsw1&contribution=generation');
	await trackerReady(page);
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
	await trackerReady(page);
	const csv = await download(page, 'Generation');
	const content = await readFile(await csv.path(), 'utf8');
	expect(content).toContain('(MW)');
	expect(content).not.toContain('66.7');
	await generation.getByRole('button', { name: 'Toggle chart options' }).click();
	await generation.getByRole('tab', { name: 'Absolute', exact: true }).click();
	await generation.getByRole('button', { name: 'Toggle chart options' }).click();
	tooltip = await hoverGeneration(page);
	await expect(tooltip).toContainText('MW');
});

test('demand percentage data loads with the table closed and overlays share its units', async ({
	page
}) => {
	const source = await trackerFixture(page, { hold: 'renewables', contributions: true });
	await page.goto(
		'/tracker/timeline?region=nsw1&contribution=generation&table=0&overlay=demand,curtailment-solar'
	);
	await trackerReady(page);
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
	await expect(tooltip).toContainText('%');
	await expect(tooltip).not.toContainText('MW');
	await expect(generation.locator('path.overlay-line')).toHaveCount(1);
	await expect(generation.locator('path.overlay-area')).toHaveCount(1);
	expect(source.requests).not.toContain('market_value');
});

test('failed demand percentages stay unavailable and retry without reopening the table', async ({
	page
}) => {
	const source = await trackerFixture(page, { fail: 'renewables' });
	await page.goto('/tracker/timeline?region=nsw1&table=0');
	await trackerReady(page);
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

test('selected units survive pointer and keyboard resizing', async ({ page }) => {
	await trackerFixture(page);
	await page.goto('/tracker/timeline?region=nsw1&table=0');
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
	const source = await trackerFixture(page, { fail: 'price' });
	await page.goto('/tracker/timeline?region=nsw1&table=0');
	await expect(card(page, 'Market').getByRole('button', { name: 'Retry' })).toBeVisible();
	await expect(card(page, 'Market')).toContainText('Fixture failure');
	await expect(page.getByTestId('tracker-loading')).toHaveCount(0);
	source.recover();
	await card(page, 'Market').getByRole('button', { name: 'Retry' }).click();
	await expect(card(page, 'Market').getByRole('button', { name: 'Retry' })).toBeHidden();
	await trackerReady(page);
	expect(source.requests.filter((metric) => metric === 'price').length).toBeGreaterThanOrEqual(2);
	expect(source.requests).toContain('renewables');
	expect(source.requests).not.toContain('market_value');
	// The metrics strip needs the curtailment pair even with the table and overlays closed.
	expect(source.requests).toContain('curtailment');
});

test('a transient date-range data failure recovers without a manual retry', async ({ page }) => {
	const source = await trackerFixture(page, { failOnce: 'price' });
	await page.goto('/tracker/timeline?region=sa1&range=30d&interval=1d&table=0');
	await trackerReady(page);
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
	const source = await trackerFixture(page);
	await page.goto('/tracker/timeline?region=sa1&table=0');
	await trackerReady(page);
	await expect.poll(() => page.evaluate(() => window.flushTrackerIdle())).toBeGreaterThan(0);
	await trackerReady(page);
	await expect.poll(() => source.urls.length).toBeGreaterThan(3);
	for (const href of source.urls) {
		const params = new URL(href).searchParams;
		expect(params.get('interval')).toBe('5m');
		const start = Date.parse(params.get('date_start') + '+10:00');
		const end = Date.parse(params.get('date_end') + '+10:00');
		expect(end - start).toBeLessThanOrEqual(10 * 86_400_000 + 300_000);
	}
	await page.getByRole('button', { name: '30D', exact: true }).click();
	await trackerReady(page);
	await expect
		.poll(() => source.urls.some((href) => new URL(href).searchParams.get('interval') === '1d'))
		.toBe(true);
	await page.evaluate(() => window.flushTrackerIdle());
	expect(source.urls.some((href) => new URL(href).searchParams.get('interval') === '1M')).toBe(
		false
	);
	await page.getByRole('button', { name: 'All', exact: true }).click();
	await trackerReady(page);
	await expect
		.poll(() => source.urls.some((href) => new URL(href).searchParams.get('interval') === '1M'))
		.toBe(true);
	await page.getByRole('button', { name: '3D', exact: true }).click();
	await trackerReady(page);
	await expect(card(page, 'Generation').getByText('Power', { exact: true })).toBeVisible();
});

test('explicit ranges push history and back/forward restore the range', async ({ page }) => {
	await trackerFixture(page);
	await page.goto('/tracker/timeline?region=nsw1&table=0');
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
	const source = await trackerFixture(page, { hold: 'price' });
	await page.goto('/tracker/timeline?region=nsw1&table=0');
	// The generation snapshot publishes independently of the held market response.
	// A client request proves hydration without waiting on the held chart.
	await expect.poll(() => source.requests.includes('power')).toBe(true);
	const menu = await openOptions(page);
	await expect(
		menu.getByRole('button', { name: 'Everything (one workbook)', exact: true })
	).toBeDisabled();
	await expect(menu.getByRole('button', { name: 'Generation', exact: true })).toBeEnabled();
	const independent = page.waitForEvent('download');
	await menu.getByRole('button', { name: 'Generation', exact: true }).click();
	expect((await independent).suggestedFilename()).toContain('generation');
	source.release();
	await trackerReady(page);
	// Wait for publication through a visible table after opening it.
	await page.getByRole('button', { name: 'Show fuel tech table' }).click();
	await expect(page.getByTestId('fuel-tech-row').first()).toBeVisible();
	await trackerReady(page);
	const csv = await download(page, 'Generation');
	const content = await readFile(await csv.path(), 'utf8');
	expect(content).toContain('(MW)');
	expect(content.split('\n').length).toBeGreaterThan(2);
	expect(content).toMatch(/\+10:00/);
	await trackerReady(page);
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
	await trackerFixture(page, { empty: 'price' });
	await page.goto('/tracker/timeline?region=wem&table=0');
	await expect(card(page, 'Market').getByText('No data for this range.')).toBeVisible();
	await expect(page.getByTestId('tracker-loading')).toHaveCount(0);
	await expect(card(page, 'Market').getByRole('button', { name: 'Retry' })).toHaveCount(0);
	await trackerReady(page);
	const csv = await download(page, 'Generation');
	expect(await readFile(await csv.path(), 'utf8')).toContain('+08:00');
});

test('reopening the table waits for its providers before enabling its export', async ({ page }) => {
	const source = await trackerFixture(page, { hold: 'market_value' });
	await page.goto('/tracker/timeline?region=nsw1&table=0');
	await trackerReady(page);
	await page.getByRole('button', { name: 'Show fuel tech table' }).click();
	await openOptions(page);
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

test('phone/tablet layouts remain usable', async ({ page }, testInfo) => {
	await trackerFixture(page);
	for (const width of [390, 820, 1440]) {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/tracker/timeline?region=nsw1');
		await trackerReady(page);
		if (width === 390)
			await expect(page.getByRole('button', { name: 'Show fuel tech table' })).toBeVisible();
		else await expect(page.getByTestId('fuel-tech-row').first()).toBeVisible();
		await expectNoHorizontalScroll(page);
		await page.screenshot({ path: testInfo.outputPath(`tracker-${width}.png`) });
	}
});

test('frontend options reuse cached responses without flashing loading overlays', async ({
	page
}, testInfo) => {
	const source = await trackerFixture(page);
	await page.goto('/tracker/timeline?region=nsw1&table=1');
	await expect(page.getByTestId('fuel-tech-row').first()).toBeVisible();
	await chartsSettled(page);
	await page.evaluate(() => {
		performance.clearMeasures();
		document.documentElement.dataset.loadingFlashes = '0';
		new MutationObserver((records) => {
			const activations = records.filter(
				(record) =>
					record.oldValue === 'false' &&
					record.target.getAttribute('data-testid') === 'tracker-loading-overlay'
			);
			document.documentElement.dataset.loadingFlashes = String(
				Number(document.documentElement.dataset.loadingFlashes) + activations.length
			);
		}).observe(document.body, {
			subtree: true,
			attributes: true,
			attributeFilter: ['data-active'],
			attributeOldValue: true
		});
	});
	for (const label of ['Detailed', 'Simplified', 'Detailed', 'Simplified']) {
		await page.getByRole('button', { name: 'Fuel technology options', exact: true }).click();
		await page.getByRole('radio', { name: label, exact: true }).click();
		await page.getByRole('dialog').getByRole('button', { name: 'Done', exact: true }).click();
		await expect(page.getByRole('columnheader', { name: /Technology/ })).toContainText(label);
		await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
	}
	await contributionBasis(page, '% generation');
	await percentageView(page);
	await page.getByTestId('fuel-tech-row').filter({ hasText: 'Coal' }).first().click();
	await page.getByRole('button', { name: 'Fuel technology options', exact: true }).click();
	await page.getByRole('dialog').getByRole('checkbox', { name: 'Energy', exact: true }).uncheck();
	await page.getByRole('dialog').getByRole('button', { name: 'Done', exact: true }).click();
	await chartsSettled(page);
	await expect(page.locator('html')).toHaveAttribute('data-loading-flashes', '0');
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
	await trackerFixture(page);
	await page.goto('/tracker/timeline?region=nsw1&table=0');
	await trackerReady(page);
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
	await trackerFixture(page);
	await page.goto('/tracker/timeline?region=nsw1&range=all&interval=12mr&filter=jan&table=0');
	await trackerReady(page);
	const csv = await download(page, 'Generation');
	const content = await readFile(await csv.path(), 'utf8');
	const dates = content.split('\n').filter((line) => /^\d{4}-/.test(line));
	expect(dates.length).toBeGreaterThan(5);
	for (const line of dates) expect(line).toMatch(/^\d{4}-01-/);
	expect(content).toContain('(MWh)');
});

test('timeline chart hover updates table values and restores window totals on exit', async ({
	page
}) => {
	await trackerFixture(page, { comparisonGrowth: true, contributions: true });
	const start = Date.parse('2026-08-01T00:00:00+10:00');
	await page.goto(
		`/tracker/timeline?region=nsw1&start=${start}&end=${start + 2 * 86_400_000}&interval=30m`
	);
	await chartsSettled(page);
	const coal = page.getByTestId('fuel-tech-row').filter({ hasText: 'Coal' }).first();
	const original = await coal.textContent();
	const rangeStatus = page.getByTestId('tracker-range-status');
	const rangeLabel = page.getByTestId('tracker-range-label');
	await expect(rangeStatus).toHaveAttribute('data-inspecting', 'false');
	const rangeText = await rangeLabel.textContent();
	for (const name of ['Generation', 'Market', 'Emissions']) {
		const chart = card(page, name);
		await chart.scrollIntoViewIfNeeded();
		const box = await chart.locator('.stratum-chart-area').boundingBox();
		await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.5);
		await expect(chart.getByTestId('chart-tooltip-strip')).toBeVisible();
		await expect(rangeStatus).toHaveAttribute('data-inspecting', 'true');
		await expect(rangeLabel).not.toHaveText(rangeText);
		await expect(coal.locator('td').nth(2)).toHaveText('100');
		await expect(coal).not.toHaveText(original);
		await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.5);
		await expect(coal.locator('td').nth(2)).toHaveText('200');
		await page.mouse.move(0, 0);
		await expect(rangeStatus).toHaveAttribute('data-inspecting', 'false');
		await expect(rangeLabel).toHaveText(rangeText);
		await expect(coal).toHaveText(original);
	}
});

for (const interval of ['30m', '1d']) {
	test(`first table toggle recalculates intensity without a fetch at ${interval}`, async ({
		page
	}) => {
		const source = await trackerFixture(page, { distinctEmissions: true });
		const start = Date.parse('2026-08-01T00:00:00+10:00');
		await page.goto(
			`/tracker/timeline?region=nsw1&start=${start}&end=${start + 2 * 86_400_000}&interval=${interval}`
		);
		await chartsSettled(page);
		const emissions = card(page, 'Emissions');
		const value = emissions.getByTestId('chart-tooltip-strip').locator('strong').first();
		await emissions.locator('.stratum-chart-area').hover();
		await expect(value).toBeVisible();
		const original = await value.textContent();
		// A row click must use loaded components even if the HTTP response LRU
		// no longer contains the response and a replacement fetch cannot finish.
		await page.evaluate(async () => {
			const { clearCompletedResponses } =
				await import('/src/lib/components/charts/v2/ChartDataManager.svelte.js');
			clearCompletedResponses();
			document.documentElement.dataset.loadingFlashes = '0';
			new MutationObserver((records) => {
				const activated = records.filter(
					(record) =>
						record.oldValue === 'false' &&
						record.target.getAttribute('data-testid') === 'tracker-loading-overlay'
				);
				document.documentElement.dataset.loadingFlashes = String(
					Number(document.documentElement.dataset.loadingFlashes) + activated.length
				);
			}).observe(document.body, {
				subtree: true,
				attributes: true,
				attributeFilter: ['data-active'],
				attributeOldValue: true
			});
		});
		source.hold('emissions_intensity');
		const requests = source.requests.filter((metric) => metric === 'emissions_intensity').length;
		const coal = page.getByTestId('fuel-tech-row').filter({ hasText: 'Coal' }).first();
		await coal.click();
		await expect(coal).toHaveAttribute('aria-pressed', 'false');
		await emissions.locator('.stratum-chart-area').hover();
		await expect(value).not.toHaveText(original);
		await expect(value).toHaveText(/^0(?:\.0+)?\s+kgCO₂e\/MWh$/);
		await coal.click();
		await emissions.locator('.stratum-chart-area').hover();
		await expect(value).toHaveText(original);
		await expect(page.locator('html')).toHaveAttribute('data-loading-flashes', '0');
		expect(source.requests.filter((metric) => metric === 'emissions_intensity')).toHaveLength(
			requests
		);
		source.release();
	});
}
