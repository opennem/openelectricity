import { test, expect } from '@playwright/test';
import { card, collectPageErrors, download, hydrated, openOptions } from './helpers/tracker.js';

/**
 * The navigation server-renders before the canvas is interactive. Wait for
 * the first data surface to leave its initial busy state before using controls.
 * @param {import('@playwright/test').Page} page
 */
async function waitForHydration(page) {
	await hydrated(page);
	await expect(page.getByRole('button', { name: '3D', exact: true })).toBeVisible();
	await expect(page.locator('[aria-busy="false"]').first()).toBeAttached({ timeout: 15000 });
}

/**
 * Read the decoded overlay parameter, waiting for shallow URL updates.
 * @param {import('@playwright/test').Page} page
 * @param {string | null} expected
 */
async function expectOverlayParam(page, expected) {
	await expect.poll(() => new URL(page.url()).searchParams.get('overlay')).toBe(expected);
}

/**
 * Match the table's average-power precision rule for an already converted value.
 * @param {number} value
 */
function roundTablePower(value) {
	return Number(value.toFixed(Math.abs(value) < 10 ? 1 : 0));
}

test.describe('Tracker smoke tests', () => {
	test('/tracker loads without errors', async ({ page }) => {
		const errors = collectPageErrors(page);

		await page.goto('/tracker');

		await expect(page.locator('body')).not.toBeEmpty();
		await expect(page.getByRole('heading', { name: 'Generation' })).toBeVisible();
		await expect(page.getByRole('columnheader', { name: /Technology/ })).toBeVisible({
			timeout: 30000
		});

		// Give the charts time to fetch and render the initial 3-day window.
		await page.waitForTimeout(3000);

		expect(errors).toEqual([]);
	});

	test('split toggles and region change update the URL without errors', async ({ page }) => {
		const errors = collectPageErrors(page);

		// A single-price region so the Price⇄Market value toggle is present.
		await page.goto('/tracker?region=nsw1');
		await expect(page.getByRole('heading', { name: 'Market', exact: true })).toBeVisible();
		await waitForHydration(page);

		await page.getByRole('tab', { name: 'Market value' }).click();
		await expect(page).toHaveURL(/price=mv/);

		await page.getByRole('tab', { name: 'Volume' }).click();
		await expect(page).toHaveURL(/emissions=volume/);

		expect(errors).toEqual([]);
	});

	test('table panel toggles closed and back open', async ({ page }) => {
		const errors = collectPageErrors(page);

		await page.goto('/tracker');
		await waitForHydration(page);
		const toggle = page.getByRole('button', { name: 'Hide fuel tech table' });
		await toggle.click();
		await expect(page).toHaveURL(/table=0/);

		await page.getByRole('button', { name: 'Show fuel tech table' }).click();
		await expect(page).not.toHaveURL(/table=0/);
		await expect(page.getByRole('columnheader', { name: /Technology/ })).toBeVisible({
			timeout: 30000
		});

		expect(errors).toEqual([]);
	});

	test('NEM region tables include imports and exports', async ({ page }) => {
		await page.goto('/tracker?region=nsw1');
		await waitForHydration(page);

		await expect(page.getByRole('button', { name: /^Imports\b/ })).toBeVisible({ timeout: 30000 });
		await expect(page.getByRole('button', { name: /^Exports\b/ })).toBeVisible({ timeout: 30000 });
	});

	test('modifier-click solos table rows and the last fuel tech restores all fuel techs', async ({
		page
	}) => {
		await page.goto('/tracker?table=1');
		await waitForHydration(page);

		const rows = page.getByTestId('fuel-tech-row');
		const generationCard = card(page, 'Generation');
		const demandRow = page.getByRole('button', { name: /^Demand\b/ });
		const renewablesRow = page.getByRole('button', { name: /^Renewables\b/ });
		await expect(rows.nth(1)).toBeVisible({ timeout: 30000 });
		const fuelTechRowCount = await rows.count();
		await rows.nth(1).click({ modifiers: ['Meta'] });

		await expect(rows.nth(1)).toHaveAttribute('aria-pressed', 'true');
		await expect
			.poll(() =>
				rows.evaluateAll(
					(items) => items.filter((item) => item.getAttribute('aria-pressed') === 'true').length
				)
			)
			.toBe(1);

		await rows.nth(1).click();
		await expect
			.poll(() =>
				rows.evaluateAll(
					(items) => items.filter((item) => item.getAttribute('aria-pressed') === 'true').length
				)
			)
			.toBe(fuelTechRowCount);
		await expect(demandRow).toHaveAttribute('aria-pressed', 'false');
		await expect(renewablesRow).toHaveAttribute('aria-pressed', 'false');

		await demandRow.click({ modifiers: ['Meta'] });
		await expect(demandRow).toHaveAttribute('aria-pressed', 'true');
		await expect(renewablesRow).toHaveAttribute('aria-pressed', 'false');
		await expect
			.poll(() =>
				rows.evaluateAll(
					(items) => items.filter((item) => item.getAttribute('aria-pressed') === 'true').length
				)
			)
			.toBe(0);
		const demandLine = generationCard.locator('path.overlay-line');
		await expect(demandLine).toBeVisible({ timeout: 30000 });
		await expect.poll(async () => (await demandLine.boundingBox())?.height ?? 0).toBeGreaterThan(1);

		await renewablesRow.click({ modifiers: ['Meta'] });
		await expect(demandRow).toHaveAttribute('aria-pressed', 'false');
		await expect(renewablesRow).toHaveAttribute('aria-pressed', 'true');

		const solarCurtailmentRow = page.getByRole('button', { name: /Curtailment.*Solar/ });
		await solarCurtailmentRow.click({ modifiers: ['Meta'] });
		await expect(renewablesRow).toHaveAttribute('aria-pressed', 'false');
		await expect(solarCurtailmentRow).toHaveAttribute('aria-pressed', 'true');
		const solarCurtailmentArea = generationCard.locator(
			'path.overlay-area[data-series-id="curtailment_solar"]'
		);
		await expect(solarCurtailmentArea).toBeVisible({ timeout: 30000 });
		await expect
			.poll(async () => (await solarCurtailmentArea.boundingBox())?.height ?? 0)
			.toBeGreaterThan(1);
	});

	test('generation hover uses the strip above the chart with overlays enabled', async ({
		page
	}) => {
		await page.goto(
			'/tracker?region=nsw1&table=0&overlay=demand,renewables,curtailment-solar,curtailment-wind'
		);
		await waitForHydration(page);

		const generationCard = card(page, 'Generation');
		const tooltip = generationCard.getByTestId('chart-tooltip-strip');
		const areas = generationCard.locator('path.path-area');
		await expect(areas.first()).toBeVisible({ timeout: 30000 });
		let tooltipVisible = false;
		for (let i = 0; i < (await areas.count()) && !tooltipVisible; i++) {
			const box = await areas.nth(i).boundingBox();
			if (!box) continue;
			for (const x of [0.25, 0.5, 0.75]) {
				for (const y of [0.25, 0.5, 0.75]) {
					await page.mouse.move(box.x + box.width * x, box.y + box.height * y);
					if ((await tooltip.textContent()).trim()) {
						tooltipVisible = true;
						break;
					}
				}
				if (tooltipVisible) break;
			}
		}
		expect(tooltipVisible).toBe(true);
		await expect(tooltip).toBeVisible({ timeout: 10000 });
		await expect(generationCard.getByTestId('chart-floating-tooltip')).toHaveCount(0);
		await expect(tooltip).toContainText('MW');
	});

	test('overlay row selections update the current URL and survive reload', async ({ page }) => {
		const errors = collectPageErrors(page);

		await page.goto('/tracker');
		await waitForHydration(page);
		const demandRow = page.getByRole('button', { name: /^Demand\b/ });
		await expect(demandRow).toHaveAttribute('aria-pressed', 'false', { timeout: 30000 });

		const historyLength = await page.evaluate(() => history.length);
		await demandRow.click();
		await expectOverlayParam(page, 'demand');
		await expect(demandRow).toHaveAttribute('aria-pressed', 'true');

		const renewablesRow = page.getByRole('button', { name: /^Renewables\b/ });
		await renewablesRow.click();
		await expectOverlayParam(page, 'demand,renewables');

		const solarCurtailmentRow = page.getByRole('button', { name: /Curtailment.*Solar/ });
		await solarCurtailmentRow.click();
		await expectOverlayParam(page, 'demand,renewables,curtailment-solar');
		expect(await page.evaluate(() => history.length)).toBe(historyLength);

		await page.reload();
		await waitForHydration(page);
		for (const name of [/^Demand\b/, /^Renewables\b/, /Curtailment.*Solar/]) {
			await expect(page.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true', {
				timeout: 30000
			});
		}
		await expectOverlayParam(page, 'demand,renewables,curtailment-solar');
		expect(errors).toEqual([]);
	});

	test('a combined overlay URL restores every row selection', async ({ page }) => {
		const overlays = 'demand,renewables,curtailment-solar,curtailment-wind';
		await page.goto(`/tracker?overlay=${overlays}`);
		await waitForHydration(page);

		for (const name of [/^Demand\b/, /^Renewables\b/, /Curtailment.*Solar/, /Curtailment.*Wind/]) {
			await expect(page.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true', {
				timeout: 30000
			});
		}
		await expectOverlayParam(page, overlays);
	});

	test('generation chart options follow the power and energy unit families', async ({ page }) => {
		await page.goto('/tracker?table=1');
		await waitForHydration(page);
		let generationCard = card(page, 'Generation');
		const fuelTechTable = page.getByRole('table');
		await expect(generationCard.getByText('Power', { exact: true })).toBeVisible({
			timeout: 30000
		});
		await expect(fuelTechTable.getByText('MW', { exact: true })).toBeVisible({ timeout: 30000 });
		// Cells: label, Energy, Av power, …
		const demandPowerCell = fuelTechTable
			.getByRole('button', { name: /^Demand\b/ })
			.locator('td')
			.nth(2);
		await expect(demandPowerCell).not.toHaveText('—', { timeout: 30000 });
		const demandMW = Number((await demandPowerCell.textContent())?.trim().replaceAll(',', ''));
		await generationCard.getByRole('button', { name: 'Toggle chart options' }).click();
		await expect(generationCard.getByRole('tab', { name: 'MW', exact: true })).toBeVisible();
		await expect(generationCard.getByRole('tab', { name: 'GW', exact: true })).toBeVisible();
		await expect(generationCard.getByRole('tab', { name: 'TWh', exact: true })).toHaveCount(0);
		await generationCard.getByRole('tab', { name: 'GW', exact: true }).click();
		await expect(generationCard.getByRole('button', { name: 'GW', exact: true })).toBeVisible();
		await expect(fuelTechTable.getByText('GW', { exact: true })).toBeVisible();
		const demandGW = Number((await demandPowerCell.textContent())?.trim().replaceAll(',', ''));
		expect(demandGW).toBe(roundTablePower(demandMW / 1000));

		await page.goto('/tracker?range=30d&interval=1d&table=0');
		await waitForHydration(page);
		generationCard = card(page, 'Generation');
		await expect(generationCard.getByText('Energy', { exact: true })).toBeVisible({
			timeout: 30000
		});
		await generationCard.getByRole('button', { name: 'Toggle chart options' }).click();
		await expect(generationCard.getByRole('tab', { name: 'MWh', exact: true })).toBeVisible();
		await expect(generationCard.getByRole('tab', { name: 'GWh', exact: true })).toBeVisible();
		await expect(generationCard.getByRole('tab', { name: 'TWh', exact: true })).toBeVisible();
		await generationCard.getByRole('tab', { name: 'TWh', exact: true }).click();
		await expect(generationCard.getByRole('button', { name: 'TWh', exact: true })).toBeVisible();
	});
});

test.describe('Tracker options menu', () => {
	test('grouping and contribution basis are chosen from the fuel-tech panel modal', async ({
		page
	}) => {
		await page.goto('/tracker?table=1');
		await waitForHydration(page);
		const techHeader = page.getByRole('columnheader', { name: /Technology/ });
		await expect(techHeader).toBeVisible({ timeout: 30000 });
		await expect(techHeader).toContainText('Simplified');

		await page.getByRole('button', { name: 'Fuel technology options', exact: true }).click();
		const menu = page.getByRole('dialog', { name: 'Fuel technology options' });
		await expect(menu.getByRole('radio', { name: 'Simplified' })).toHaveAttribute(
			'aria-checked',
			'true'
		);
		await menu.getByRole('radio', { name: 'Detailed' }).click();
		await menu.getByRole('button', { name: 'Done', exact: true }).click();
		await expect(page).toHaveURL(/group=detailed/);
		await expect(techHeader).toContainText('Detailed');

		const contributionHeader = page.getByRole('columnheader', { name: /Contribution/ });
		await expect(contributionHeader).toContainText('% demand');
		await page.getByRole('button', { name: 'Fuel technology options', exact: true }).click();
		await menu.getByRole('radio', { name: '% generation' }).click();
		await menu.getByRole('button', { name: 'Done', exact: true }).click();
		await expect(contributionHeader).toContainText('% generation');
		await expect
			.poll(() => new URL(page.url()).searchParams.get('contribution'))
			.toBe('generation');
	});

	test('datasets download as CSV and as one XLSX workbook', async ({ page }) => {
		await page.goto('/tracker?table=1');
		await waitForHydration(page);
		// The table renders from the generation snapshot — once it has rows,
		// the export context is populated.
		await expect(page.getByTestId('fuel-tech-row').first()).toBeVisible({ timeout: 30000 });

		const menu = await openOptions(page);
		await expect(menu.getByRole('button', { name: 'Fuel tech table', exact: true })).toBeVisible();
		const csvDownload = page.waitForEvent('download');
		await menu.getByRole('button', { name: 'Generation', exact: true }).click();
		expect((await csvDownload).suggestedFilename()).toBe('tracker-nem-generation-3d.csv');

		const xlsxDownload = await download(page, 'Everything (one workbook)');
		expect(xlsxDownload.suggestedFilename()).toBe('tracker-nem-3d.xlsx');
	});
});

test.describe('Tracker table horizontal scrolling', () => {
	const columnStrip = (/** @type {import('@playwright/test').Page} */ page) =>
		page.getByRole('group', { name: 'Table columns' });

	/** Right edge of a locator's box. @param {import('@playwright/test').Locator} locator */
	async function rightEdge(locator) {
		const box = await locator.boundingBox();
		return box ? box.x + box.width : NaN;
	}

	test('a narrow panel pins Technology while value columns scroll', async ({ page }) => {
		// The default 30% panel of a 1280px canvas is ~384px — below the 760px breakpoint.
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.goto('/tracker?table=1');
		await waitForHydration(page);

		await expect(page.getByRole('table')).toBeVisible({ timeout: 30000 });
		await expect(columnStrip(page)).toHaveCount(0);

		const table = page.getByRole('table');
		const scroller = table.locator('xpath=..');
		const techHeader = page.getByRole('columnheader', { name: /Technology/ });
		const priceHeader = page.getByRole('columnheader', { name: /Av price/ });
		const view = await scroller.boundingBox();
		if (!view) throw new Error('scroller not laid out');
		expect(await rightEdge(priceHeader)).toBeGreaterThan(view.x + view.width + 1);

		await scroller.evaluate((element) => element.scrollTo({ left: 300, behavior: 'instant' }));
		await expect.poll(() => rightEdge(priceHeader)).toBeLessThanOrEqual(view.x + view.width + 1);

		// Technology stays flush with the scroller's left edge after scrolling.
		const tech = await techHeader.boundingBox();
		expect(Math.abs((tech?.x ?? NaN) - view.x)).toBeLessThanOrEqual(1);
		await expect(page.getByRole('button', { name: /^Demand\b/ })).toBeVisible({ timeout: 30000 });
		const demandLabel = await page
			.getByRole('button', { name: /^Demand\b/ })
			.locator('td')
			.first()
			.boundingBox();
		expect(Math.abs((demandLabel?.x ?? NaN) - view.x)).toBeLessThanOrEqual(1);
	});

	test('a wide panel renders the plain six-column table', async ({ page }) => {
		// 30% of a 3000px canvas is ~900px — comfortably above the 760px breakpoint.
		await page.setViewportSize({ width: 3000, height: 1080 });
		await page.goto('/tracker?table=1');
		await waitForHydration(page);

		await expect(page.getByRole('table')).toBeVisible({ timeout: 30000 });
		await expect(columnStrip(page)).toBeHidden();
		const view = await page.getByRole('table').boundingBox();
		if (!view) throw new Error('table not laid out');
		const priceHeader = page.getByRole('columnheader', { name: /Av price/ });
		expect(await rightEdge(priceHeader)).toBeLessThanOrEqual(view.x + view.width + 1);
	});

	test('dragging the panel wider fits all columns', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.goto('/tracker?table=1');
		await waitForHydration(page);
		await expect(page.getByRole('table')).toBeVisible({ timeout: 30000 });

		const handle = await page.getByRole('separator', { name: 'Resize table panel' }).boundingBox();
		if (!handle) throw new Error('panel handle not laid out');
		const y = handle.y + handle.height / 2;
		await page.mouse.move(handle.x + handle.width / 2, y);
		await page.mouse.down();
		// The panel sits to the right — dragging left grows it.
		await page.mouse.move(handle.x - 400, y, { steps: 10 });
		await page.mouse.up();

		await expect(columnStrip(page)).toBeHidden();
	});
});
