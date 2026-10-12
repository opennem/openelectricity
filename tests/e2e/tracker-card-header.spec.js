import { test, expect } from '@playwright/test';
import {
	card,
	csvHeader,
	download,
	downloadText,
	regionsFixture,
	trackerFixture,
	trackerReady
} from './helpers/tracker.js';

/**
 * The chart card header: one header per card carrying the title, the
 * chart's own title, unit and toolbar, the card's switchers and options, a
 * CSV download and a table view of the same data, and a colour key while
 * nothing else on screen keys the colours.
 */

/** @param {import('@playwright/test').Locator} scope */
const tableHeaders = (scope) =>
	scope.getByTestId('chart-data-table').locator('thead th').allInnerTexts();

/** The CSV header as the table view writes it: capitalised.
 * @param {string[]} headers */
const asTableHeaders = (headers) =>
	headers.map((header) => header.charAt(0).toUpperCase() + header.slice(1));

test.describe('Chart card header', () => {
	test('hosts the chart toolbar in the one card header', async ({ page }) => {
		await trackerFixture(page);
		await page.goto('/tracker/timeline?region=nsw1');
		await trackerReady(page);
		for (const title of ['Generation', 'Market', 'Emissions']) {
			const header = card(page, title).locator('header');
			// No grey bar under the card header: the chart hands its toolbar over.
			await expect(header).toHaveCount(1);
			for (const name of ['Toggle chart options', 'Zoom in', 'Zoom out', 'Enable pan and zoom']) {
				await expect(header.getByRole('button', { name, exact: true })).toBeVisible();
			}
			await expect(header.getByRole('button', { name: 'Show table' })).toBeVisible();
			await expect(header.getByRole('button', { name: `Download ${title} CSV` })).toBeVisible();
		}
		// Engaging pan/zoom keeps the zoom buttons.
		const generation = card(page, 'Generation').locator('header');
		await generation.getByRole('button', { name: 'Enable pan and zoom', exact: true }).click();
		await expect(
			generation.getByRole('button', { name: 'Disable pan and zoom', exact: true })
		).toBeVisible();
		await expect(generation.getByRole('button', { name: 'Zoom in', exact: true })).toBeVisible();
		await expect(generation.getByRole('button', { name: 'Zoom out', exact: true })).toBeVisible();
		await page.keyboard.press('Escape');
		const market = card(page, 'Market').locator('header');
		await expect(market).toContainText('Spot price');
		await expect(market).toContainText('$/MWh');
		await expect(market.getByRole('tablist', { name: 'Market chart' })).toBeVisible();
		// The options flyout opens under the header and closes from outside.
		await market.getByRole('button', { name: 'Toggle chart options' }).click();
		await expect(market.getByRole('tab', { name: 'Smooth', exact: true })).toBeVisible();
		await card(page, 'Market').getByRole('heading', { name: 'Market' }).click();
		await expect(market.getByRole('tab', { name: 'Smooth', exact: true })).toHaveCount(0);
	});

	test('downloads the card CSV straight from the header, as the dialog does', async ({ page }) => {
		await trackerFixture(page);
		await page.goto('/tracker/timeline?region=nsw1');
		await trackerReady(page);
		const quick = page.waitForEvent('download');
		await card(page, 'Generation').getByRole('button', { name: 'Download Generation CSV' }).click();
		const fromHeader = await quick;
		const fromDialog = await download(page, 'Generation');
		expect(fromHeader.suggestedFilename()).toBe(fromDialog.suggestedFilename());
		expect(await csvHeader(fromHeader)).toEqual(await csvHeader(fromDialog));
	});

	test('shows the CSV data as a table only while toggled on', async ({ page }) => {
		await trackerFixture(page);
		await page.goto('/tracker/timeline?region=nsw1&emissions=volume');
		await trackerReady(page);
		const emissions = card(page, 'Emissions');
		await expect(emissions.getByTestId('chart-data-table')).toHaveCount(0);
		const toggle = emissions.getByRole('button', { name: 'Show table' });
		await toggle.click();
		await expect(toggle).toHaveAttribute('aria-pressed', 'true');
		const table = emissions.getByTestId('chart-data-table');
		await expect(table).toBeVisible();
		// The table's columns are the card's CSV columns, its rows the CSV rows.
		const file = await download(page, 'Emissions');
		const headers = await csvHeader(file);
		expect(await tableHeaders(emissions)).toEqual(asTableHeaders(headers));
		const csvRows = (await downloadText(file)).trim().split('\n').length;
		await expect(table.locator('table')).toHaveAttribute('aria-rowcount', String(csvRows));
		// The chart's toolbar steps aside while the table covers it.
		await expect(emissions.getByRole('button', { name: 'Toggle chart options' })).toHaveCount(0);
		await toggle.click();
		await expect(emissions.getByTestId('chart-data-table')).toHaveCount(0);
		await expect(emissions.getByRole('button', { name: 'Toggle chart options' })).toBeVisible();
	});

	test('keys the stacked charts while the fuel tech table is closed', async ({ page }) => {
		await trackerFixture(page);
		await page.goto('/tracker/timeline?region=nsw1&table=0&overlay=demand');
		await trackerReady(page);
		const legend = card(page, 'Generation').getByTestId('series-legend');
		await expect(legend.locator('li')).toHaveText(['Wind', 'Coal', 'Demand']);
		// Price is one line: nothing to key.
		await expect(card(page, 'Market').getByTestId('series-legend')).toHaveCount(0);
		await page.getByRole('button', { name: 'Show fuel tech table' }).click();
		await expect(card(page, 'Generation').getByTestId('series-legend')).toHaveCount(0);
	});

	test('Compare cards key their regions while the Regions table is closed', async ({ page }) => {
		await regionsFixture(page);
		await page.setViewportSize({ width: 1440, height: 1000 });
		await page.goto('/tracker/compare?compare-table=0');
		const renewables = card(page, 'Renewables proportion');
		await expect(renewables.locator('.path-line').first()).toHaveAttribute('d', /^M/);
		await expect(renewables.getByTestId('series-legend')).toBeVisible();
		await page.getByRole('button', { name: 'Show regions table' }).click();
		await expect(renewables.getByTestId('series-legend')).toHaveCount(0);
	});
});
