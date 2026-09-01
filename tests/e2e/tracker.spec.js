import { test, expect } from '@playwright/test';

/**
 * The nav range bar server-renders immediately (pulsing as pending), but its
 * handlers only work once the canvas mounts and hands its range control up —
 * the pending pulse clearing (aria-busy="false" on the range trigger) is the
 * signal that the page is hydrated and interactive. Clicking SSR-rendered
 * controls before then would silently do nothing.
 * @param {import('@playwright/test').Page} page
 */
async function waitForHydration(page) {
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

test.describe('Tracker smoke tests', () => {
	test('/tracker loads without errors', async ({ page }) => {
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));

		await page.goto('/tracker');

		await expect(page.locator('body')).not.toBeEmpty();
		await expect(page.getByRole('heading', { name: 'Generation' })).toBeVisible();
		await expect(page.getByRole('button', { name: '% generation' })).toBeVisible();

		// Give the charts time to fetch and render the initial 3-day window.
		await page.waitForTimeout(3000);

		expect(errors).toEqual([]);
	});

	test('split toggles and region change update the URL without errors', async ({ page }) => {
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));

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
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));

		await page.goto('/tracker');
		await waitForHydration(page);
		const toggle = page.getByRole('button', { name: 'Hide fuel tech table' });
		await toggle.click();
		await expect(page).toHaveURL(/table=0/);

		await page.getByRole('button', { name: 'Show fuel tech table' }).click();
		await expect(page).not.toHaveURL(/table=0/);
		await expect(page.getByRole('button', { name: '% generation' })).toBeVisible();

		expect(errors).toEqual([]);
	});

	test('NEM region tables include imports and exports', async ({ page }) => {
		await page.goto('/tracker?region=nsw1');
		await waitForHydration(page);

		await expect(page.getByRole('button', { name: /^Imports\b/ })).toBeVisible({ timeout: 30000 });
		await expect(page.getByRole('button', { name: /^Exports\b/ })).toBeVisible({ timeout: 30000 });
	});

	test('enabled generation overlays appear in the floating tooltip', async ({ page }) => {
		await page.goto(
			'/tracker?region=nsw1&table=0&overlay=demand,renewables,curtailment-solar,curtailment-wind'
		);
		await waitForHydration(page);

		const generationCard = page
			.getByRole('heading', { name: 'Generation', exact: true })
			.locator('xpath=ancestor::section[1]');
		const tooltip = generationCard.getByTestId('chart-floating-tooltip');
		const areas = generationCard.locator('path.path-area');
		await expect(areas.first()).toBeVisible({ timeout: 30000 });
		let tooltipVisible = false;
		for (let i = 0; i < (await areas.count()) && !tooltipVisible; i++) {
			const box = await areas.nth(i).boundingBox();
			if (!box) continue;
			for (const x of [0.25, 0.5, 0.75]) {
				for (const y of [0.25, 0.5, 0.75]) {
					await page.mouse.move(box.x + box.width * x, box.y + box.height * y);
					if (await tooltip.isVisible()) {
						tooltipVisible = true;
						break;
					}
				}
				if (tooltipVisible) break;
			}
		}
		expect(tooltipVisible).toBe(true);
		await expect(tooltip).toBeVisible({ timeout: 10000 });
		for (const label of ['Demand', 'Renewables', 'Curtailment (Solar)', 'Curtailment (Wind)']) {
			await expect(tooltip.getByText(label, { exact: true })).toBeVisible();
		}
		await expect(tooltip).toContainText('%');
		await expect(tooltip).toContainText('MW');
	});

	test('overlay row selections update the current URL and survive reload', async ({ page }) => {
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));

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
		let generationCard = page
			.getByRole('heading', { name: 'Generation', exact: true })
			.locator('xpath=ancestor::section[1]');
		const fuelTechTable = page.getByRole('table');
		await expect(generationCard.getByText('Power', { exact: true })).toBeVisible({
			timeout: 30000
		});
		await expect(fuelTechTable.getByText('MW', { exact: true })).toBeVisible({ timeout: 30000 });
		const demandPowerCell = fuelTechTable
			.getByRole('button', { name: /^Demand\b/ })
			.locator('td')
			.nth(1);
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
		expect(demandGW).toBeCloseTo(demandMW / 1000, 1);

		await page.goto('/tracker?range=30d&interval=1d&table=0');
		await waitForHydration(page);
		generationCard = page
			.getByRole('heading', { name: 'Generation', exact: true })
			.locator('xpath=ancestor::section[1]');
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
