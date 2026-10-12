import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * The facility page's chart cards — the Tracker's card design (hosted
 * toolbar, Compare, Table, CSV) and its "Download data" dialog. Live data,
 * like `facility-detail-metrics.spec.js`.
 */

/** @param {import('@playwright/test').Page} page @param {string} title */
const card = (page, title) =>
	page.getByRole('heading', { name: title, exact: true }).locator('xpath=ancestor::section[1]');

/**
 * Open a facility page and wait for its Generation chart to draw.
 * @param {import('@playwright/test').Page} page @param {string} code
 */
async function openFacility(page, code) {
	/** @type {string[]} */
	const errors = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.setViewportSize({ width: 1440, height: 1200 });
	await page.goto(`/facility/${code}`);
	const generation = card(page, 'Generation');
	await expect(generation.locator('path.path-area').first()).toBeVisible({ timeout: 60000 });
	return { generation, errors };
}

/** Open the header's options menu → Download data. @param {import('@playwright/test').Page} page */
async function openDownloads(page) {
	await page.getByRole('button', { name: 'Options', exact: true }).first().click();
	await page.getByRole('menu').getByRole('button', { name: 'Download data', exact: true }).click();
	const dialog = page.getByRole('dialog', { name: 'Download data' });
	await expect(dialog).toBeVisible();
	return dialog;
}

test.describe('Facility chart cards', () => {
	test('each chart is a card with the chart toolbar in its header', async ({ page }) => {
		const { generation, errors } = await openFacility(page, 'MACARTH');
		await expect(generation.getByText('Power', { exact: true })).toBeVisible();
		for (const name of ['Compare Generation', 'Show table', 'Enable pan and zoom'])
			await expect(generation.getByRole('button', { name, exact: true })).toBeVisible();
		// The chart's grey options bar is folded into the card header.
		await expect(generation.locator('.chart-header')).toHaveCount(0);
		await expect(card(page, 'Wind curtailment')).toBeVisible();
		await expect(card(page, 'Market')).toBeVisible();
		// The table view shows the card's data as the CSV has it.
		await generation.getByRole('button', { name: 'Show table', exact: true }).click();
		await expect(generation.getByRole('table')).toBeVisible();
		expect(errors).toEqual([]);
	});

	test('the Download data dialog lists every card and downloads its CSV', async ({ page }) => {
		await openFacility(page, 'MACARTH');
		const dialog = await openDownloads(page);
		const rows = dialog.getByTestId('download-row');
		await expect
			.poll(() =>
				rows.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-download-id')))
			)
			.toEqual(['generation', 'curtailment', 'market']);
		const button = dialog.getByRole('button', { name: 'Download Generation CSV', exact: true });
		await expect(button).toBeEnabled({ timeout: 30000 });
		const downloading = page.waitForEvent('download');
		await button.click();
		const file = await downloading;
		expect(file.suggestedFilename()).toMatch(/^macarth-generation-.+\.csv$/);
		const csv = await readFile(/** @type {string} */ (await file.path()), 'utf8');
		expect(csv.split('\n')[0]).toMatch(/^date,.*\(MW\)$/);
	});

	test('compare mode halves the chart, picks A and B by clicking, and closes on a new range', async ({
		page
	}) => {
		const { generation, errors } = await openFacility(page, 'MACARTH');
		const plot = generation.locator('.stratum-chart-area').first();
		const fullHeight = await plot.evaluate((el) => el.getBoundingClientRect().height);
		await generation.getByRole('button', { name: 'Compare Generation', exact: true }).click();
		const panel = page.getByRole('region', { name: 'Generation comparison' });
		await expect(panel.getByTestId('compare-row').first()).toBeVisible();
		await expect
			.poll(() => plot.evaluate((el) => el.getBoundingClientRect().height))
			.toBeLessThan(fullHeight * 0.75);
		await expect(generation.locator('.time-markers text', { hasText: /^B$/ })).toHaveCount(1);

		// Two clicks set A then B, without engaging pan and zoom.
		const slotA = panel.getByTestId('compare-slot-a');
		const slotB = panel.getByTestId('compare-slot-b');
		const before = { a: await slotA.textContent(), b: await slotB.textContent() };
		const box = /** @type {{x: number, y: number, width: number, height: number}} */ (
			await plot.boundingBox()
		);
		await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.5);
		await expect(slotA).not.toHaveText(/** @type {string} */ (before.a));
		await expect(slotB).toHaveText(/** @type {string} */ (before.b));
		await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.5);
		await expect(slotB).not.toHaveText(/** @type {string} */ (before.b));
		await expect(generation.getByRole('button', { name: 'Enable pan and zoom' })).toBeVisible();

		// Comparing cards share A and B.
		const market = card(page, 'Market');
		await market.getByRole('button', { name: 'Compare Market', exact: true }).click();
		await expect(market.locator('.time-markers text', { hasText: /^A$/ })).toHaveCount(1);
		await expect(
			page.getByRole('region', { name: 'Market comparison' }).getByTestId('compare-slot-a')
		).toHaveText(/** @type {string} */ (await slotA.textContent()));

		// A new range closes every comparison.
		await page.getByRole('button', { name: '7D', exact: true }).click();
		await expect(panel).toBeHidden();
		await expect(page.getByRole('region', { name: 'Market comparison' })).toBeHidden();
		expect(errors).toEqual([]);
	});

	test('a zoom that switches the interval closes compare mode', async ({ page }) => {
		const { generation, errors } = await openFacility(page, 'MACARTH');
		await generation.getByRole('button', { name: 'Compare Generation', exact: true }).click();
		const panel = page.getByRole('region', { name: 'Generation comparison' });
		await expect(panel.getByTestId('compare-row').first()).toBeVisible();
		const badge = generation.getByText('30 min', { exact: true });
		await expect(badge).toBeVisible();
		// Zoom out until the charts switch to a coarser interval.
		const zoomOut = generation.getByRole('button', { name: /zoom out/i });
		for (let step = 0; step < 8 && (await badge.isVisible()); step++) {
			await zoomOut.click();
			await page.waitForTimeout(400);
		}
		await expect(badge).toBeHidden();
		await expect(panel).toBeHidden();
		expect(errors).toEqual([]);
	});

	test('switching the Market or Emissions chart closes compare mode', async ({ page }) => {
		await openFacility(page, 'BAYSW');
		const emissions = card(page, 'Emissions');
		await emissions.getByRole('button', { name: 'Compare Emissions', exact: true }).click();
		const panel = page.getByRole('region', { name: 'Emissions comparison' });
		// Intensity is one line: A and B tiles over the window's range.
		await expect(panel.getByTestId('compare-tile')).toHaveCount(2, { timeout: 30000 });
		await emissions.getByRole('tab', { name: 'Volume' }).click();
		await expect(panel).toBeHidden();
	});
});
