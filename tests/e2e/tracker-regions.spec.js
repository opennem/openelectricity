import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import {
	collectPageErrors,
	download,
	expectNoHorizontalScroll,
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
	await expect(regionRow(page, 'NSW')).toContainText('150');
	await expect(page.getByRole('button', { name: 'Compare NSW', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect(
		page.getByRole('button', { name: 'Compare NSW', exact: true }).locator('span').first()
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
	await expect(regionRow(page, 'NSW')).toContainText('75');
	expect(data.requests.length).toBe(count);
	const file = await download(page, 'Region comparison');
	const csv = await readFile(await file.path(), 'utf8');
	expect(csv).toContain('source generation (%)');
	expect(csv).toContain('New South Wales');
	await page.reload();
	await regionsReady(page);

	await expect(regionRow(page, 'NSW')).toContainText('75');
});

test('regional toggles, national sums, failure isolation and retry', async ({ page }) => {
	const data = await regionsFixture(page, { fail: 'wem' });
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto('/tracker?view=regions&compare-interval=1M&compare-charts=intensity,generation');
	await expect(page.getByRole('button', { name: 'Retry WA (WEM)', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Compare WA (WEM)', exact: true }).click();
	await regionsReady(page);
	await page.getByRole('button', { name: 'Compare All Regions', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Retry All Regions', exact: true })).toBeVisible();
	data.recover();
	await page.getByRole('button', { name: 'Retry All Regions', exact: true }).click();
	await expect(regionRow(page, 'All Regions')).toContainText('250');
	await expect(regionRow(page, 'All Regions')).toContainText('56.4');
	await expect(page.getByRole('button', { name: 'Retry All Regions', exact: true })).toHaveCount(0);
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
	await nav.getByRole('button', { name: 'Time of day', exact: true }).click();
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
	await nav.getByRole('button', { name: 'Compare regions', exact: true }).click();
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
	await expect(regionRow(page, 'WA (WEM)')).toContainText('…');
	await page.getByRole('button', { name: 'Compare WA (WEM)', exact: true }).click();
	await regionsReady(page);
	data.release();
	await expect(page.getByRole('button', { name: 'Compare WA (WEM)', exact: true })).toHaveAttribute(
		'aria-pressed',
		'false'
	);
	await expect(regionRow(page, 'WA (WEM)')).toContainText('—');
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
	await expect(regionRow(page, 'NSW').getByRole('cell').nth(1)).not.toContainText('—');
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
	await selector.getByRole('button', { name: 'Volume-weighted price', exact: true }).click();
	await selector.getByRole('button', { name: 'Apply', exact: true }).click();
	await expect(selector).toHaveCount(0);
	await expect(
		page.getByRole('heading', { name: 'Wind value', exact: true, level: 3 })
	).toBeVisible();
	await expect(regionsTable(page).getByRole('columnheader')).toHaveCount(3);
	await expect(regionRow(page, 'NSW')).toContainText('50');
	expect(data.requests.length).toBe(requests);
	const csv = await readFile(await (await download(page, 'Region comparison')).path(), 'utf8');
	expect(csv.split('\n')[0]).toBe('Period,Region,Wind value ($/MWh),Volume-weighted price ($/MWh)');
	await page.reload();
	await expect(
		page.getByRole('heading', { name: 'Wind value', exact: true, level: 3 })
	).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Carbon intensity', exact: true })).toHaveCount(0);
	await page.getByRole('button', { name: /^Charts/ }).click();
	await page.getByRole('button', { name: 'Select all', exact: true }).click();
	await selector.getByRole('button', { name: 'Apply', exact: true }).click();
	await expect(page.getByRole('group', { name: /comparison chart$/ })).toHaveCount(15);
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
	await page.goto(
		'/tracker?view=regions&compare-charts=generation&compare-regions=nsw1&compare-interval=1M'
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
	await expect(regionRow(page, 'NSW')).toContainText('31.2');
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
