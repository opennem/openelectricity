import { test, expect } from '@playwright/test';
import {
	card,
	csvHeader,
	download,
	downloadRows,
	downloadText,
	downloadWorkbook,
	expectDownloadsMatchCharts,
	openDownloads,
	closeDownloads,
	regionsFixture,
	regionsReady,
	trackerFixture,
	trackerReady,
	workbookSheetNames
} from './helpers/tracker.js';

/**
 * "Download data" lists exactly the charts and panels each view renders, and
 * each download holds the data its chart draws: Timeline's tabs, hidden
 * series and overlays, every Profile display and style, and every Compare
 * display. `expectDownloadsMatchCharts` checks the list against the page
 * itself; the headers check each chart's shape.
 */

/** @param {import('@playwright/test').Page} page @param {string} label */
const headersOf = async (page, label) => csvHeader(await download(page, label));

test.describe('Timeline downloads', () => {
	test('list the three cards and the open table, each as drawn, and the workbook', async ({
		page
	}) => {
		await trackerFixture(page);
		await page.goto('/tracker/timeline?region=nsw1');
		await trackerReady(page);
		await expectDownloadsMatchCharts(page, [
			'Generation',
			'Market',
			'Emissions',
			'Fuel tech table'
		]);
		expect(await headersOf(page, 'Generation')).toEqual(['date', 'Coal (MW)', 'Wind (MW)']);
		const market = await headersOf(page, 'Market');
		expect(market).toHaveLength(2);
		expect(market[1]).toMatch(/\$\/MWh/);
		expect(await headersOf(page, 'Emissions')).toEqual([
			'date',
			'Emissions intensity (kgCO2e/MWh)',
			'Emissions (tCO2e)',
			'Energy (MWh)'
		]);
		expect((await headersOf(page, 'Fuel tech table')).slice(0, 2)).toEqual(['Technology', 'Type']);
		const workbook = await downloadWorkbook(page);
		expect(workbook.suggestedFilename()).toBe('tracker-nsw1-3d.xlsx');
		expect(await workbookSheetNames(workbook)).toEqual([
			'Summary',
			'Generation',
			'Market',
			'Emissions',
			'Fuel tech table'
		]);
	});

	test('follow the tabs, hidden series and overlays the cards draw', async ({ page }) => {
		await trackerFixture(page);
		await page.goto(
			'/tracker/timeline?region=nsw1&table=0&price=mv&emissions=volume&hidden=coal&overlay=demand,curtailment-solar'
		);
		await trackerReady(page);
		// A closed table isn't listed.
		await expectDownloadsMatchCharts(page, ['Generation', 'Market', 'Emissions']);
		expect(await headersOf(page, 'Generation')).toEqual([
			'date',
			'Wind (MW)',
			'Demand (MW)',
			'Curtailment (Solar) (MW)'
		]);
		expect(await headersOf(page, 'Market')).toEqual(['date', 'Wind ($)']);
		expect(await headersOf(page, 'Emissions')).toEqual(['date', 'Wind (tCO2e)']);
		// Showing Coal again puts it back in every chart's download.
		await page.getByRole('button', { name: 'Show fuel tech table' }).click();
		await page.getByTestId('fuel-tech-row').filter({ hasText: 'Coal' }).first().click();
		await trackerReady(page);
		expect(await headersOf(page, 'Market')).toEqual(['date', 'Coal ($)', 'Wind ($)']);
	});

	test('list each open comparison after its chart', async ({ page }) => {
		await trackerFixture(page);
		// Opened from a link without dates: A and B default to the chart's
		// first and last buckets.
		await page.goto('/tracker/timeline?region=nsw1&table=0&compare=generation');
		await trackerReady(page);
		await expectDownloadsMatchCharts(page, [
			'Generation',
			'Generation comparison',
			'Market',
			'Emissions'
		]);
		const dialog = await openDownloads(page);
		await expect(
			dialog.getByRole('button', { name: 'Download Generation comparison CSV', exact: true })
		).toBeEnabled();
		await closeDownloads(page);
		const panel = page.getByRole('region', { name: 'Generation comparison' });
		await panel.getByRole('button', { name: 'Next interval for A' }).click();
		await panel.getByRole('button', { name: 'Previous interval for B' }).click();
		const comparison = await download(page, 'Generation comparison');
		expect(comparison.suggestedFilename()).toMatch(/^tracker-nsw1-generation-comparison-.*\.csv$/);
		expect(await downloadText(comparison)).toContain('Change B − A (MW)');
		// A second card lists its own, after its chart.
		await card(page, 'Emissions')
			.getByRole('button', { name: 'Compare Emissions', exact: true })
			.click();
		await expectDownloadsMatchCharts(page, [
			'Generation',
			'Generation comparison',
			'Market',
			'Emissions',
			'Emissions comparison'
		]);
	});

	test('mark a chart without data and leave it out of the workbook', async ({ page }) => {
		await trackerFixture(page, { empty: 'price' });
		await page.goto('/tracker/timeline?region=wem&table=0');
		await expect(card(page, 'Market').getByText('No data for this range.')).toBeVisible();
		await trackerReady(page);
		const rows = await expectDownloadsMatchCharts(page, ['Generation', 'Market', 'Emissions']);
		expect(rows.map((row) => row.state)).toEqual(['ready', 'empty', 'ready']);
		const dialog = await openDownloads(page);
		await expect(dialog.locator('[data-download-id="market"]')).toContainText('No data');
		await expect(dialog.getByTestId('download-workbook')).toContainText('Summary + 2 sheets');
		const workbook = await downloadWorkbook(page);
		expect(await workbookSheetNames(workbook)).toEqual(['Summary', 'Generation', 'Emissions']);
	});
});

test.describe('Profile downloads', () => {
	const PROFILE = '/tracker/profile?region=wem&profile-end=2026-08-31';

	test('Stacked: the stack, the table and the hourly dial while the table is open', async ({
		page
	}) => {
		await trackerFixture(page);
		await page.goto(PROFILE);
		await expect(card(page, 'Average over 7 full days').locator('path.path-area')).toHaveCount(2);
		await expectDownloadsMatchCharts(page, [
			'Average over 7 full days',
			'Fuel tech table',
			'Average by hour'
		]);
		const stack = await download(page, 'Average over 7 full days');
		expect(stack.suggestedFilename()).toBe('tracker-wem-time-of-day-stack-2026-08-31.csv');
		const csv = await downloadText(stack);
		expect(csv.split('\n')[0]).toBe('Time of day (UTC+08:00),Coal (MW),Wind (MW)');
		expect(csv.split('\n')[1]).toBe('00:00,100,200');
		expect(await headersOf(page, 'Average by hour')).toEqual([
			'Hour (UTC+08:00)',
			'Coal (MWh)',
			'Wind (MWh)'
		]);
		expect(await headersOf(page, 'Fuel tech table')).toEqual([
			'Technology',
			'Type',
			'Energy (MWh)',
			'Av power (MW)',
			'Contribution (% demand)',
			'Hidden'
		]);
		const workbook = await downloadWorkbook(page);
		expect(workbook.suggestedFilename()).toBe('tracker-wem-time-of-day-2026-08-31.xlsx');
		expect(await workbookSheetNames(workbook)).toEqual([
			'Summary',
			'Average over 7 full days',
			'Fuel tech table',
			'Average by hour'
		]);
		// Hiding a technology takes it out of the stack's download, as drawn.
		await page.getByTestId('fuel-tech-row').filter({ hasText: 'Coal' }).first().click();
		await expect(card(page, 'Average over 7 full days').locator('path.path-area')).toHaveCount(1);
		expect(await headersOf(page, 'Average over 7 full days')).toEqual([
			'Time of day (UTC+08:00)',
			'Wind (MW)'
		]);
		// With the table closed, only the stack is on screen.
		await page.goto(`${PROFILE}&table=0`);
		await expect(card(page, 'Average over 7 full days').locator('path.path-area')).toHaveCount(2);
		await expectDownloadsMatchCharts(page, ['Average over 7 full days']);
	});

	const DAYS = [
		'2026-08-25',
		'2026-08-26',
		'2026-08-27',
		'2026-08-28',
		'2026-08-29',
		'2026-08-30',
		'2026-08-31'
	].map((date) => `${date} (MW)`);
	const BREAKDOWN = /** @type {const} */ ([
		[
			'lines',
			['Time of day (UTC+08:00)', 'Average (MW)', 'Days with data', ...DAYS],
			'00:00,100,7,100'
		],
		[
			'bands',
			[
				'Time of day (UTC+08:00)',
				'10th percentile (MW)',
				'25th percentile (MW)',
				'Median (MW)',
				'75th percentile (MW)',
				'90th percentile (MW)',
				'Average (MW)'
			],
			'00:00,100,100,100,100,100,100'
		],
		['ridgeline', ['Time of day (UTC+08:00)', 'Average (MW)', ...DAYS], '00:00,100,100'],
		['radial', ['Hour (UTC+08:00)', 'Average (MW)'], '00:00,100'],
		['heatmap', ['Time of day (UTC+08:00)', ...DAYS], '00:00,100,100']
	]);

	for (const [style, headers, firstRow] of BREAKDOWN) {
		test(`Breakdown ${style}: every card, shaped as the style draws it`, async ({ page }) => {
			await trackerFixture(page);
			await page.goto(`${PROFILE}&profile-display=breakdown&profile-style=${style}`);
			await expect(page.getByRole('region', { name: 'Profile analysis' })).toHaveAttribute(
				'aria-busy',
				'false'
			);
			await expectDownloadsMatchCharts(page, ['Wind', 'Coal', 'Spot price', 'Fuel tech table']);
			const coal = await download(page, 'Coal');
			expect(coal.suggestedFilename()).toBe('tracker-wem-time-of-day-coal-2026-08-31.csv');
			const csv = await downloadText(coal);
			expect(csv.split('\n')[0].split(',')).toEqual(headers);
			expect(csv.split('\n')[1].startsWith(firstRow)).toBe(true);
			const price = await headersOf(page, 'Spot price');
			expect(price.slice(1).every((header) => !header.includes('(MW)'))).toBe(true);
			expect(await workbookSheetNames(await downloadWorkbook(page))).toEqual([
				'Summary',
				'Wind',
				'Coal',
				'Spot price',
				'Fuel tech table'
			]);
		});
	}

	test('Breakdown with today: the today line joins every style that draws it', async ({ page }) => {
		await trackerFixture(page);
		for (const style of ['lines', 'bands', 'ridgeline', 'radial', 'heatmap']) {
			await page.goto(
				`${PROFILE}&profile-display=breakdown&profile-today=1&profile-style=${style}&table=0`
			);
			await expect(page.getByRole('region', { name: 'Profile analysis' })).toHaveAttribute(
				'aria-busy',
				'false'
			);
			await expectDownloadsMatchCharts(page, ['Wind', 'Coal', 'Spot price']);
			const headers = await headersOf(page, 'Coal');
			if (style === 'heatmap') expect(headers).not.toContain('Today (MW)');
			else expect(headers.at(-1)).toBe('Today (MW)');
		}
	});

	test('Breakdown keeps loads negative in the shape styles', async ({ page }) => {
		await trackerFixture(page, { contributions: true });
		await page.goto(`${PROFILE}&profile-display=breakdown&profile-style=ridgeline&table=0`);
		await expect(page.getByRole('region', { name: 'Profile analysis' })).toHaveAttribute(
			'aria-busy',
			'false'
		);
		const rows = await downloadRows(page);
		const load = rows.find((row) => /charging/i.test(row.label));
		expect(load, rows.map((row) => row.label).join(', ')).toBeTruthy();
		const csv = await downloadText(await download(page, /** @type {any} */ (load).label));
		expect(csv.split('\n')[1]).toMatch(/^00:00,-\d/);
	});
});

test.describe('Compare downloads', () => {
	for (const [display, slug] of [
		['Trends', ''],
		['Panels', 'panels'],
		['Ranks', 'ranks'],
		['Heatmap', 'heatmap']
	]) {
		test(`${display}: each chart card and the Regions table`, async ({ page }) => {
			await regionsFixture(page);
			await page.setViewportSize({ width: 1440, height: 1000 });
			await page.goto(`/tracker/compare${slug ? `?compare-display=${slug}` : ''}`);
			await regionsReady(page);
			const rows = await expectDownloadsMatchCharts(page, [
				'Carbon intensity',
				'Renewables proportion',
				'Regions table'
			]);
			expect(rows.map((row) => row.id)).toEqual([
				'regions-intensity',
				'regions-renewables_share',
				'regions-table'
			]);
			const intensity = await headersOf(page, 'Carbon intensity');
			expect(intensity[0]).toBe('Period');
			if (slug === 'ranks') {
				expect(intensity[1]).toBe('New South Wales rank');
				expect(intensity).toContain('New South Wales (kgCO2e/MWh)');
			} else {
				expect(intensity[1]).toBe('New South Wales (kgCO2e/MWh)');
				expect(intensity.some((header) => header.endsWith(' rank'))).toBe(false);
			}
			expect((await headersOf(page, 'Regions table')).slice(0, 3)).toEqual([
				'Period',
				'Region',
				'Compared'
			]);
			expect(await workbookSheetNames(await downloadWorkbook(page))).toEqual([
				'Summary',
				'Carbon intensity',
				'Renewables proportion',
				'Regions table'
			]);
		});
	}

	test('follow the selected charts and the table panel', async ({ page }) => {
		await regionsFixture(page);
		await page.setViewportSize({ width: 1440, height: 1000 });
		await page.goto('/tracker/compare?compare-charts=intensity&compare-table=0');
		await expect(
			page.getByRole('group', { name: 'Carbon intensity comparison chart' })
		).toBeVisible();
		await expectDownloadsMatchCharts(page, ['Carbon intensity']);
		await closeDownloads(page);
		// Opening the table lists it after the charts.
		await page.getByRole('button', { name: 'Show regions table' }).click();
		await expectDownloadsMatchCharts(page, ['Carbon intensity', 'Regions table']);
	});
});
