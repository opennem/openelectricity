import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import {
	card,
	collectPageErrors,
	download,
	expectNoHorizontalScroll,
	hydrated,
	openOptions,
	regionRow,
	regionsFixture,
	regionsReady,
	regionsTable
} from './helpers/tracker.js';

test('defaults, region colours, complete rolling values and synchronised keyboard inspection', async ({
	page
}) => {
	const errors = collectPageErrors(page);
	const data = await regionsFixture(page);
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto('/tracker?view=regions');
	await regionsReady(page);
	await expect(page.getByRole('heading', { name: 'Carbon intensity', exact: true })).toBeVisible();
	await expect(
		page.getByRole('heading', { name: 'Renewables proportion', exact: true })
	).toBeVisible();
	await expect(regionRow(page, 'New South Wales')).toContainText('150');
	await expect(
		page.getByRole('button', { name: 'Compare New South Wales', exact: true })
	).toHaveAttribute('aria-pressed', 'true');
	await expect(
		page
			.getByRole('button', { name: 'Compare New South Wales', exact: true })
			.locator('span')
			.first()
	).toHaveCSS('background-color', 'rgb(160, 120, 215)');
	expect(new Set(data.requests.map((request) => request.region)).size).toBe(6);
	await page.getByRole('button', { name: 'Inspect carbon intensity values' }).focus();
	await page.keyboard.press('ArrowLeft');
	await page.keyboard.press('Enter');
	await expect(page.getByRole('button', { name: 'Clear pinned period' })).toBeVisible();
	await page.getByRole('button', { name: 'Clear pinned period' }).click();
	await page.screenshot({ path: 'test-results/tracker-regions-desktop.png', fullPage: true });
	expect(errors).toEqual([]);
});

test('metric and percentage switches reuse requests, preserve URL state and export data', async ({
	page
}) => {
	const data = await regionsFixture(page);
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto('/tracker?view=regions');
	await regionsReady(page);
	const count = data.requests.length;
	await expect(
		page.getByRole('heading', { name: 'Renewables proportion', exact: true })
	).toBeVisible();
	await page.getByRole('button', { name: '% demand', exact: true }).click();
	await page.getByRole('option', { name: '% generation', exact: true }).click();
	await expect(regionRow(page, 'New South Wales')).toContainText('75');
	expect(data.requests.length).toBe(count);
	const file = await download(page, 'Region comparison');
	const csv = await readFile(await file.path(), 'utf8');
	expect(csv).toContain('source generation (%)');
	expect(csv).toContain('New South Wales');
	await page.reload();
	await regionsReady(page);

	await expect(regionRow(page, 'New South Wales')).toContainText('75');
});

test('regional toggles, national sums, failure isolation and retry', async ({ page }) => {
	const data = await regionsFixture(page, { fail: 'wem' });
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto('/tracker?view=regions&compare-interval=1M&compare-charts=intensity,generation');
	await expect(
		page.getByRole('button', { name: 'Retry Western Australia (SWIS)', exact: true })
	).toBeVisible();
	await page.getByRole('button', { name: 'Compare Western Australia (SWIS)', exact: true }).click();
	await regionsReady(page);
	await page.getByRole('button', { name: 'Compare All Regions (NEM + WEM)', exact: true }).click();
	await expect(
		page.getByRole('button', { name: 'Retry All Regions (NEM + WEM)', exact: true })
	).toBeVisible();
	data.recover();
	await page.getByRole('button', { name: 'Retry All Regions (NEM + WEM)', exact: true }).click();
	await expect(regionRow(page, 'All Regions (NEM + WEM)')).toContainText('250');
	await expect(regionRow(page, 'All Regions (NEM + WEM)')).toContainText('56.4');
	await expect(
		page.getByRole('button', { name: 'Retry All Regions (NEM + WEM)', exact: true })
	).toHaveCount(0);
});

test('view clicks reset query settings while history restores each view and its top-nav filters', async ({
	page
}) => {
	await regionsFixture(page);
	await page.setViewportSize({ width: 1440, height: 1000 });
	const original =
		'/tracker?view=regions&range=30d&compare-interval=1M&compare-charts=intensity&unknown=1';
	await page.goto(original);
	await regionsReady(page);
	const nav = page.getByTestId('tracker-top-nav');
	await expect(nav.getByRole('button', { name: 'Monthly', exact: true })).toBeVisible();
	await expect(nav.getByRole('separator')).toHaveCount(1);
	await nav.getByRole('button', { name: 'Profile', exact: true }).click();
	await expect(page).toHaveURL(/\/tracker\?view=average$/);
	await expect(nav.getByRole('combobox', { name: 'View', exact: true })).toHaveValue('average');
	await nav.getByRole('combobox', { name: 'Window', exact: true }).selectOption('28');
	await nav.getByRole('combobox', { name: 'View', exact: true }).selectOption('daily');
	await nav.getByRole('button', { name: 'Timeline', exact: true }).click();
	await expect(page).toHaveURL(/\/tracker$/);
	await page.goBack();
	await expect(nav.getByRole('combobox', { name: 'View', exact: true })).toHaveValue('daily');
	await expect(nav.getByRole('combobox', { name: 'Window', exact: true })).toHaveValue('28');
	await page.goBack();
	await page.goBack();
	await page.goBack();
	await expect(page).toHaveURL(original);
	await expect(nav.getByRole('button', { name: 'Monthly', exact: true })).toBeVisible();
	await page.goForward();
	await expect(nav.getByRole('combobox', { name: 'Window', exact: true })).toHaveValue('7');
	await nav.getByRole('button', { name: 'Compare', exact: true }).click();
	await expect(page).toHaveURL(/\/tracker\?view=regions$/);
	await regionsReady(page);
	await expect(nav.getByRole('button', { name: '12-month rolling', exact: true })).toBeVisible();
	await expect(page.getByRole('group', { name: /comparison chart$/ })).toHaveCount(2);
	await expect(nav.locator('[data-view="regions"]')).toHaveCSS('opacity', '1');
	await page.screenshot({ path: 'test-results/tracker-top-nav.png' });
});

test('mobile panel, keyboard dismissal and responsive chart layout', async ({ page }) => {
	await regionsFixture(page);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/tracker?view=regions');
	await expect(
		page.getByText('Complete periods · monthly source data', { exact: true })
	).toBeVisible();
	await expect(regionsTable(page)).toHaveCount(0);
	await page.getByRole('button', { name: 'Show regions table' }).click();
	await expect(regionsTable(page)).toBeVisible();
	await page.screenshot({ path: 'test-results/tracker-regions-mobile-table.png', fullPage: true });
	await page.keyboard.press('Escape');
	await expect(page.getByRole('button', { name: 'Show regions table' })).toBeFocused();
	await page.screenshot({ path: 'test-results/tracker-regions-mobile.png', fullPage: true });
	await expectNoHorizontalScroll(page);
});

test('chart and region panel resizing and PNG export', async ({ page }) => {
	await regionsFixture(page);
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto('/tracker?view=regions');
	await regionsReady(page);
	const handle = page.getByRole('separator', { name: 'Resize regions panel' });
	const before = Number(await handle.getAttribute('aria-valuenow'));
	await handle.focus();
	await page.keyboard.press('ArrowLeft');
	expect(Number(await handle.getAttribute('aria-valuenow'))).toBeGreaterThan(before);
	await openOptions(page);
	await page.getByRole('button', { name: 'Export PNG', exact: true }).click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await expect(page.getByRole('dialog')).toContainText('Carbon intensity');
});

test('late responses cannot restore a deselected region; interval and zoom choices survive history', async ({
	page
}) => {
	const data = await regionsFixture(page, { hold: 'wem' });
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto('/tracker?view=regions');
	await expect(regionRow(page, 'Western Australia (SWIS)')).toContainText('…');
	await page.getByRole('button', { name: 'Compare Western Australia (SWIS)', exact: true }).click();
	await regionsReady(page);
	data.release();
	await expect(
		page.getByRole('button', { name: 'Compare Western Australia (SWIS)', exact: true })
	).toHaveAttribute('aria-pressed', 'false');
	await expect(regionRow(page, 'Western Australia (SWIS)')).toContainText('—');
	await page.getByRole('button', { name: '12-month rolling', exact: true }).click();
	await page.getByRole('option', { name: 'Financial year', exact: true }).click();
	await expect(page).toHaveURL(/compare-interval=fy/);
	await expect(page.getByText('2025–26 financial year', { exact: true })).toBeVisible();
	await page.getByRole('group', { name: 'Carbon intensity comparison chart' }).hover();
	await page.getByRole('button', { name: 'Zoom in', exact: true }).first().click();
	await expect(page).toHaveURL(/compare-start=/);
	await page.getByRole('button', { name: 'All history', exact: true }).click();
	await expect(page).not.toHaveURL(/compare-start=/);
	await page.goBack();
	await expect(page).toHaveURL(/compare-start=/);
});

test('empty results display a clear state and disable CSV and workbook exports', async ({
	page
}) => {
	await regionsFixture(page, { empty: true });
	await page.goto('/tracker?view=regions');
	await expect(
		page.getByText('No completed regional data available for this selection.')
	).toBeVisible();
	await openOptions(page);
	await expect(page.getByRole('button', { name: 'Region comparison', exact: true })).toBeDisabled();
	await expect(
		page.getByRole('button', { name: 'Everything (one workbook)', exact: true })
	).toBeDisabled();
});

test('live comparison renders regional history and exports a workbook', async ({ page }) => {
	test.skip(process.env.OE_TRACKER_LIVE !== '1', 'Requires the local OE API connection');
	test.setTimeout(90000);
	const errors = collectPageErrors(page);
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto('/tracker?view=regions');
	await expect(
		page.getByText('Complete periods · monthly source data', { exact: true })
	).toBeVisible({ timeout: 60000 });
	await expect(page.getByRole('alert')).toHaveCount(0);
	await expect(regionRow(page, 'New South Wales').getByRole('cell').nth(1)).not.toContainText('—');
	await expect(
		page
			.getByRole('group', { name: 'Volume-weighted price comparison chart', exact: true })
			.locator('.path-line')
	).toHaveCount(6);
	await expect(
		page
			.getByRole('group', { name: 'Net imports proportion comparison chart', exact: true })
			.locator('.path-line')
	).toHaveCount(6);
	await page.screenshot({ path: 'test-results/tracker-regions-live.png', fullPage: true });
	const latestPeriod = await page
		.getByRole('status')
		.filter({ hasText: /12 months to/ })
		.innerText();
	await inspectLatestPoints(page, latestPeriod);
	const workbook = await download(page, 'Everything (one workbook)');
	expect(workbook.suggestedFilename()).toMatch(
		/^tracker-regions-[a-z0-9]+-\d{4}-\d{2}-to-\d{4}-\d{2}\.xlsx$/
	);
	expect(errors).toEqual([]);
});

async function inspectLatestPoints(page, expected) {
	for (const name of [
		'Carbon intensity comparison chart',
		'Renewables proportion comparison chart'
	]) {
		const chart = page.getByRole('group', { name, exact: true });
		await chart.scrollIntoViewIfNeeded();
		await expect(chart.locator('.path-line')).toHaveCount(6);
		let lastPoint;
		for (const path of await chart.locator('.path-line').all()) {
			await expect(path).toHaveAttribute('d', /^M/);
			const point = await path.evaluate((element) => {
				const position = element.getPointAtLength(element.getTotalLength());
				const screen = new DOMPoint(position.x, position.y).matrixTransform(element.getScreenCTM());
				return { x: screen.x, y: screen.y };
			});
			lastPoint = point;
			await page.mouse.move(point.x - 100, point.y + 50);
			await page.mouse.move(point.x, point.y);
			await expect(chart.getByTestId('chart-floating-tooltip')).toContainText(expected);
			const hoverLine = chart.locator('.line-x');
			await expect(hoverLine).toHaveCount(1);
			await expect
				.poll(async () => {
					const x = await hoverLine.evaluate(
						(element) =>
							new DOMPoint(Number(element.getAttribute('x1')), 0).matrixTransform(
								element.getScreenCTM()
							).x
					);
					return Math.abs(x - point.x);
				})
				.toBeLessThan(1);
		}
		await chart.getByRole('button', { name: /Inspect .* values/ }).focus();
		await page.keyboard.press('Enter');
		await page.mouse.move(1, 1);
		await expect(page.getByRole('button', { name: 'Clear pinned period' })).toBeVisible();
		await expect(chart.locator('.line-x')).toHaveCount(1);
		const pinnedX = await chart
			.locator('.line-x')
			.evaluate(
				(element) =>
					new DOMPoint(Number(element.getAttribute('x1')), 0).matrixTransform(
						element.getScreenCTM()
					).x
			);
		expect(Math.abs(pinnedX - lastPoint.x)).toBeLessThan(1);
		await page.screenshot({
			path: `test-results/tracker-regions-alignment-${name.startsWith('Carbon') ? 'intensity' : 'renewables'}.png`,
			fullPage: true
		});
		await page.getByRole('button', { name: 'Clear pinned period' }).click();
	}
}

for (const [interval, expected] of [
	['12mr', '12 months to Aug 2026'],
	['1M', 'Aug 2026'],
	['1y', '2025'],
	['fy', '2025–26 financial year']
]) {
	test(`pointer inspection reaches the latest plotted point for ${interval}`, async ({ page }) => {
		await regionsFixture(page);
		await page.setViewportSize({ width: 1440, height: 1000 });
		await page.goto(`/tracker?view=regions&compare-interval=${interval}`);
		await regionsReady(page);
		await inspectLatestPoints(page, expected);
	});
}

test('two charts start visible and the multiselect controls charts, table and exports without refetching', async ({
	page
}) => {
	const data = await regionsFixture(page);
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto('/tracker?view=regions');
	await regionsReady(page);
	await expect(page.getByRole('group', { name: /comparison chart$/ })).toHaveCount(2);
	const requests = data.requests.length;
	await page.getByRole('button', { name: /^Charts/ }).click();
	const selector = page
		.locator('div.fixed')
		.filter({ has: page.getByRole('button', { name: 'Apply', exact: true }) });
	await expect(selector.getByText('2 selected', { exact: true })).toBeVisible();
	await expect(selector).toHaveCSS('opacity', '1');
	await page.screenshot({ path: 'test-results/tracker-chart-multiselect.png' });
	for (const name of ['Carbon intensity', 'Renewables']) {
		await selector.getByRole('button', { name, exact: true }).click();
	}
	await expect(page.getByRole('group', { name: /comparison chart$/ })).toHaveCount(2);
	await selector.getByRole('button', { name: 'Apply', exact: true }).click();
	await expect(page.getByText('No charts selected. Use Charts to show comparisons.')).toBeVisible();
	await expect(regionsTable(page).getByRole('columnheader')).toHaveCount(1);
	await page.getByRole('button', { name: /^Charts/ }).click();
	await selector.getByRole('button', { name: 'Wind value', exact: true }).click();
	await expect(selector.getByRole('button', { name: 'Prices', exact: true })).toBeVisible();
	await expect(
		selector.getByRole('button', {
			name: 'Volume-weighted price (inflation adjusted)',
			exact: true
		})
	).toHaveCount(0);
	await selector.getByRole('button', { name: 'Volume-weighted price', exact: true }).click();
	await selector.getByRole('button', { name: 'Apply', exact: true }).click();
	await expect(selector).toHaveCount(0);
	await expect(
		page.getByRole('heading', { name: 'Wind value', exact: true, level: 3 })
	).toBeVisible();
	await expect(regionsTable(page).getByRole('columnheader')).toHaveCount(3);
	const adjusted = page.getByRole('switch', { name: 'Inflation adjusted', exact: true });
	await expect(adjusted).toBeChecked();
	await expect(page.getByRole('link', { name: 'ABS All Groups CPI' })).toBeVisible();
	const realCsv = await readFile(await (await download(page, 'Region comparison')).path(), 'utf8');
	expect(realCsv).toContain('Volume-weighted price (inflation adjusted)');
	expect(realCsv).toContain('dollars');
	await page.setViewportSize({ width: 390, height: 844 });
	await expect(adjusted).toBeVisible();
	await expectNoHorizontalScroll(page);
	await page.screenshot({ path: 'test-results/tracker-abs-cpi-mobile.png', fullPage: true });
	await page.setViewportSize({ width: 1440, height: 1000 });
	await adjusted.focus();
	await page.keyboard.press('Space');
	await expect(adjusted).not.toBeChecked();
	await expect(
		page.getByRole('heading', { name: 'Volume-weighted price', exact: true })
	).toBeVisible();
	await page.goBack();
	await expect(adjusted).toBeChecked();
	await page.goForward();
	await expect(adjusted).not.toBeChecked();
	await expect(regionRow(page, 'New South Wales')).toContainText('50');
	expect(data.requests.length).toBe(requests);
	const csv = await readFile(await (await download(page, 'Region comparison')).path(), 'utf8');
	expect(csv.split('\n')[0]).toBe('Period,Region,Wind value ($/MWh),Volume-weighted price ($/MWh)');
	await page.reload();
	await expect(
		page.getByRole('heading', { name: 'Wind value', exact: true, level: 3 })
	).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Carbon intensity', exact: true })).toHaveCount(0);
	await expect(adjusted).not.toBeChecked();
	await page.getByRole('button', { name: /^Charts/ }).click();
	await page.getByRole('button', { name: 'Select all', exact: true }).click();
	await selector.getByRole('button', { name: 'Apply', exact: true }).click();
	await expect(page.getByRole('group', { name: /comparison chart$/ })).toHaveCount(14);
	await page.getByRole('button', { name: /^Charts/ }).click();
	await selector.getByRole('button', { name: 'Reset', exact: true }).click();
	await selector.getByRole('button', { name: 'Apply', exact: true }).click();
	await expect(page.getByRole('group', { name: /comparison chart$/ })).toHaveCount(2);
});

test('comparison Y axis rescales on zoom and pan as an offscreen peak enters or leaves', async ({
	page
}) => {
	await regionsFixture(page, { spike: true });
	await page.setViewportSize({ width: 1440, height: 1000 });
	// Monthly opens on the latest five years; the spike sits in 2020, so open on all history.
	await page.goto(
		`/tracker?view=regions&compare-charts=generation&compare-regions=nsw1&compare-interval=1M&compare-start=${Date.UTC(2020, 0)}&compare-end=${Date.UTC(2026, 8)}`
	);
	const chart = page.getByRole('group', {
		name: 'Renewables generation comparison chart',
		exact: true
	});
	await expect(chart.locator('.path-line')).toHaveAttribute('d', /^M/);
	const maximumTick = () =>
		chart
			.locator('.y-axis .tick text')
			.evaluateAll((nodes) =>
				Math.max(...nodes.map((node) => Number(node.textContent.replace(/[^0-9.-]/g, ''))))
			);
	await expect.poll(maximumTick).toBeGreaterThan(50);
	await chart.hover();
	await chart.getByRole('button', { name: 'Zoom in', exact: true }).click();
	await expect.poll(maximumTick).toBeLessThan(5);
	// Engage pan interaction, then drag the time window back to the early peak.
	await chart.locator('.stratum-chart-area').click();
	await expect(chart.locator('[style*="touch-action: none"]').first()).toBeVisible();
	const box = await chart.locator('.stratum-chart-area').boundingBox();
	await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.5);
	await page.mouse.down();
	await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.5, { steps: 12 });
	await page.mouse.up();
	await expect.poll(maximumTick).toBeGreaterThan(50);
});

test('comparison charts reuse timeline options, retain curve and units, and share pan engagement', async ({
	page
}) => {
	await regionsFixture(page);
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto('/tracker?view=regions&compare-charts=intensity,generation');
	await regionsReady(page);
	const intensity = page.getByRole('group', {
		name: 'Carbon intensity comparison chart',
		exact: true
	});
	// Rolling months open on the latest five years, so zoom out is still available
	// until the reset control shows all history.
	await expect(intensity.getByRole('button', { name: 'Zoom out', exact: true })).toBeEnabled();
	await expect(page.getByRole('button', { name: 'Last 5 years', exact: true })).toBeVisible();
	const zoomOut = intensity.getByRole('button', { name: 'Zoom out', exact: true });
	while (await zoomOut.isEnabled()) await zoomOut.click();
	const energy = page.getByRole('group', {
		name: 'Renewables generation comparison chart',
		exact: true
	});
	await expect(
		intensity.getByRole('button', { name: 'Enable pan and zoom', exact: true })
	).toBeVisible();
	await expect(intensity.getByRole('button', { name: 'Zoom out', exact: true })).toBeDisabled();
	await intensity.getByRole('button', { name: 'Toggle chart options' }).click();
	await expect(intensity.getByRole('tab', { name: 'Stacked Area', exact: true })).toHaveCount(0);
	await expect(intensity.getByRole('tab', { name: 'Proportion', exact: true })).toHaveCount(0);
	await intensity.getByRole('tab', { name: 'Smooth', exact: true }).click();
	await expect(intensity.locator('.path-line').first()).toHaveAttribute('d', /C/);
	await intensity.getByRole('button', { name: 'Toggle chart options' }).click();
	await intensity.getByRole('button', { name: 'Zoom in', exact: true }).click();
	await intensity.getByRole('button', { name: 'Toggle chart options' }).click();
	await expect(intensity.getByRole('tab', { name: 'Smooth', exact: true })).toHaveAttribute(
		'aria-selected',
		'true'
	);
	await intensity.getByRole('tab', { name: 'Step', exact: true }).click();
	await intensity.getByRole('button', { name: 'Toggle chart options' }).click();
	await intensity.getByRole('button', { name: 'Zoom out', exact: true }).click();
	await intensity.getByRole('button', { name: 'Toggle chart options' }).click();
	await expect(intensity.getByRole('tab', { name: 'Step', exact: true })).toHaveAttribute(
		'aria-selected',
		'true'
	);
	await intensity.getByRole('button', { name: 'Toggle chart options' }).click();
	await energy.getByRole('button', { name: 'Toggle chart options' }).click();
	await energy.getByRole('tab', { name: 'MWh', exact: true }).click();
	await energy.getByRole('button', { name: 'Toggle chart options' }).click();
	await energy.getByRole('button', { name: 'Zoom in', exact: true }).click();
	await expect(energy.getByRole('button', { name: 'MWh', exact: true })).toBeVisible();
	await energy.getByRole('button', { name: 'Enable pan and zoom', exact: true }).click();
	await expect(
		intensity.getByRole('button', { name: 'Disable pan and zoom', exact: true })
	).toBeVisible();
	await expect(energy.getByRole('button', { name: 'Zoom in', exact: true })).toHaveCount(0);
	await expect(energy.locator('xpath=ancestor::section[1]')).toHaveClass(/border-dark-grey/);
	await page.keyboard.press('Escape');
	await expect(
		energy.getByRole('button', { name: 'Enable pan and zoom', exact: true })
	).toBeVisible();
	await energy.getByRole('button', { name: 'Enable pan and zoom', exact: true }).click();
	await page.getByRole('heading', { name: 'Regions', exact: true }).click();
	await expect(
		energy.getByRole('button', { name: 'Enable pan and zoom', exact: true })
	).toBeVisible();
	await energy.getByRole('button', { name: 'Toggle chart options' }).click();
	await expect(energy.locator('.backdrop-blur-md')).toHaveCSS('opacity', '1');
	await page.screenshot({ path: 'test-results/tracker-comparison-chart-options.png' });
});

test('fuel chart toggles share one picker entry and persist presentation through history', async ({
	page
}) => {
	const data = await regionsFixture(page);
	await page.goto('/tracker?view=regions');
	await regionsReady(page);
	const requests = data.requests.length;
	await page.getByRole('tab', { name: 'Generation', exact: true }).click();
	await expect(
		page.getByRole('heading', { name: 'Renewables generation', exact: true })
	).toBeVisible();
	await expect(regionRow(page, 'New South Wales')).toContainText('31.2');
	await expect(page).toHaveURL(/compare-charts=intensity%2Cgeneration/);
	await page.getByRole('button', { name: /^Charts/ }).click();
	const picker = page
		.locator('div.fixed')
		.filter({ has: page.getByRole('button', { name: 'Apply', exact: true }) });
	await expect(picker.getByRole('button', { name: 'Renewables', exact: true })).toHaveCount(1);
	await picker.getByRole('button', { name: 'Wind', exact: true }).click();
	await picker.getByRole('button', { name: 'Apply', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Wind proportion', exact: true })).toBeVisible();
	await expect(
		page.getByRole('heading', { name: 'Renewables generation', exact: true })
	).toBeVisible();
	expect(data.requests.length).toBe(requests);
	await expect(picker).toHaveCount(0);
	await page.screenshot({ path: 'test-results/tracker-comparison-combined.png', fullPage: true });
	await page.reload();
	await regionsReady(page);
	await expect(
		page.getByRole('heading', { name: 'Renewables generation', exact: true })
	).toBeVisible();
	await page.goBack();
	await expect(page.getByRole('group', { name: /comparison chart$/ })).toHaveCount(2);
	await page.goBack();
	await expect(
		page.getByRole('heading', { name: 'Renewables proportion', exact: true })
	).toBeVisible();
});

test('stripes display shares hover and pinning with the table, exports PNG and restores through history', async ({
	page
}) => {
	const errors = collectPageErrors(page);
	const data = await regionsFixture(page);
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto('/tracker?view=regions');
	await regionsReady(page);
	const requests = data.requests.length;
	await page.getByRole('button', { name: 'Stripes', exact: true }).click();
	await expect(page).toHaveURL(/compare-display=stripes/);
	const intensity = card(page, 'Carbon intensity');
	const stripes = intensity.locator('svg[data-png-layer]');
	await expect(stripes).toBeVisible();
	await expect(intensity.locator('.stratum-chart')).toHaveCount(0);
	await expect(intensity.getByTestId('stripes-legend')).toContainText('kgCO₂e/MWh');
	await expect(intensity.locator('text', { hasText: 'NSW' })).toBeVisible();
	expect(data.requests.length).toBe(requests);
	// Hovering a column inspects that period in the Regions table.
	const period = page.getByRole('status').filter({ hasText: /12 months to/ });
	const resting = (await period.textContent()) ?? '';
	const box = await stripes.boundingBox();
	if (!box) throw new Error('Stripes have no size');
	await page.mouse.move(box.x + 96 + (box.width - 96) * 0.3, box.y + 20);
	await expect(period).not.toHaveText(resting);
	await expect(intensity.getByTestId('chart-floating-tooltip')).toContainText('NSW');
	await page.mouse.down();
	await page.mouse.up();
	await expect(page.getByRole('button', { name: 'Clear pinned period' })).toBeVisible();
	await page.getByRole('button', { name: 'Clear pinned period' }).click();
	await page.mouse.move(0, 0);
	await expect(period).toHaveText(resting);
	// Keyboard inspection works exactly as it does on the line charts.
	await page.getByRole('button', { name: 'Inspect carbon intensity values' }).focus();
	await page.keyboard.press('ArrowLeft');
	await expect(period).not.toHaveText(resting);
	await page.keyboard.press('Escape');
	await expect(period).toHaveText(resting);
	// The stripes card is a ready PNG export.
	const menu = await openOptions(page);
	await menu.getByRole('button', { name: 'Export PNG', exact: true }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog.getByRole('checkbox', { name: /Carbon intensity/ })).toBeEnabled();
	await page.keyboard.press('Escape');
	await expect(dialog).toHaveCount(0);
	await page.screenshot({ path: 'test-results/tracker-regions-stripes.png', fullPage: true });
	// History restores the display either way.
	await page.goBack();
	await expect(page).not.toHaveURL(/compare-display/);
	await expect(card(page, 'Carbon intensity').locator('.stratum-chart')).toHaveCount(1);
	await page.goForward();
	await expect(card(page, 'Carbon intensity').locator('svg[data-png-layer]')).toBeVisible();
	await page.setViewportSize({ width: 390, height: 800 });
	await expectNoHorizontalScroll(page);
	expect(errors).toEqual([]);
});

test('daily interval is a sliding one-year window fetched with a three-month buffer', async ({
	page
}) => {
	const errors = collectPageErrors(page);
	const data = await regionsFixture(page);
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto('/tracker?view=regions&compare-display=stripes&compare-interval=1d');
	await hydrated(page);
	await expect(
		page.getByText('Complete periods · daily source data', { exact: true })
	).toBeVisible();
	const daily = () => data.requests.filter((request) => request.interval === '1d');
	const window = page.getByTestId('comparison-window');
	await expect(window).toHaveText('11 Sept 2025 – 10 Sept 2026');
	// Six regions × four sources, less flows for the closed WEM network.
	await expect.poll(() => daily().length).toBe(23);
	expect(new Set(daily().map((request) => request.dateStart))).toEqual(
		new Set(['2025-06-01T00:00:00'])
	);
	await expect(page.getByRole('button', { name: 'Next year' })).toBeDisabled();
	await expect(page.getByRole('button', { name: 'Latest' })).toHaveCount(0);
	const intensity = card(page, 'Carbon intensity');
	const stripes = intensity.locator('svg[data-png-layer]');
	await expect(stripes.locator('text', { hasText: 'Jan 2026' })).toBeVisible();
	await expect(stripes.locator('text', { hasText: 'Aug' })).toBeVisible();
	// Hovering inspects a single day.
	const box = await stripes.boundingBox();
	if (!box) throw new Error('Stripes have no size');
	await page.mouse.move(box.x + 96 + (box.width - 96) * 0.5, box.y + 20);
	await expect(page.getByRole('status').filter({ hasText: /^\d{1,2} \w+ 2026/ })).toBeVisible();
	await page.mouse.move(0, 0);
	// Stepping back a year fetches only the months the buffer does not hold.
	await page.getByRole('button', { name: 'Previous year' }).click();
	await expect(window).toHaveText('11 Sept 2024 – 10 Sept 2025');
	await expect
		.poll(() => daily().filter((request) => request.dateStart === '2024-06-01T00:00:00').length)
		.toBe(23);
	expect(daily().length).toBe(46);
	await expect(page.getByRole('button', { name: 'Latest' })).toBeVisible();
	// Keyboard moves from the navigator: month, six months, year boundary, latest.
	await page.getByRole('button', { name: 'Previous year' }).focus();
	await page.keyboard.press('ArrowRight');
	await expect(window).toHaveText('11 Oct 2024 – 10 Oct 2025');
	expect(daily().length).toBe(46); // inside the buffer
	await page.keyboard.press('Shift+ArrowLeft');
	await expect(window).toHaveText('11 Apr 2024 – 10 Apr 2025');
	await expect.poll(() => daily().length).toBe(69); // January to May 2024
	await page.keyboard.press('Control+ArrowLeft');
	await expect(window).toHaveText('1 Jan 2024 – 30 Dec 2024'); // a fixed 365-day window in a leap year
	await expect.poll(() => daily().length).toBe(92); // October to December 2023
	await page.keyboard.press('Home');
	await expect(window).toHaveText('11 Sept 2025 – 10 Sept 2026');
	expect(daily().length).toBe(92); // the latest window was warm
	expect(new Set(daily().map((request) => request.dateStart)).size).toBe(4);
	// A month label makes that month the window's first.
	await page.getByRole('button', { name: 'Previous year' }).click();
	await stripes.locator('text', { hasText: 'Jan 2025' }).click();
	await expect(window).toHaveText('1 Jan 2025 – 31 Dec 2025');
	await expect(page).toHaveURL(/compare-end=1767225600000/);
	// Switching back to rolling months keeps the right edge and the warm monthly cache.
	const monthly = data.requests.filter((request) => request.interval === '1M').length;
	await page.getByRole('button', { name: 'Daily', exact: true }).click();
	await page.getByRole('option', { name: '12-month rolling', exact: true }).click();
	await expect(
		page.getByText('Complete periods · monthly source data', { exact: true })
	).toBeVisible();
	await expect(page).toHaveURL(/compare-end=1767225600000/);
	expect(data.requests.filter((request) => request.interval === '1M').length).toBe(monthly);
	await page.setViewportSize({ width: 390, height: 800 });
	await expectNoHorizontalScroll(page);
	expect(errors).toEqual([]);
});
