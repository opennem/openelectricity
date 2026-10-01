import { test, expect } from '@playwright/test';

/**
 * Open a facility's detail pane on /facilities and wait for its unit cards.
 * Collects uncaught page errors so each test can assert none occurred.
 * @param {import('@playwright/test').Page} page
 * @param {string} code
 */
async function openFacility(page, code) {
	/** @type {string[]} */
	const errors = [];
	page.on('pageerror', (error) => errors.push(error.message));

	await page.goto(`/facilities?facility=${code}`);
	const cards = page.getByTestId('facility-unit-cards');
	await expect(cards).toBeVisible({ timeout: 30000 });

	return { cards, errors };
}

/**
 * Unit group cards whose fuel tech starts with `prefix` (e.g. `gas` matches
 * `gas_ccgt`).
 * @param {import('@playwright/test').Locator} cards
 * @param {string} prefix
 */
function unitGroup(cards, prefix) {
	return cards.locator(`[data-testid="facility-unit-group"][data-fueltech^="${prefix}"]`);
}

test.describe('Facility detail unit cards', () => {
	test('coal facility shows its coal units, unit count and capacity', async ({ page }) => {
		// Bayswater
		const { cards, errors } = await openFacility(page, 'BAYSW');

		const coal = unitGroup(cards, 'coal_').first();
		await expect(coal).toBeVisible();
		await expect(coal.getByText(/Coal/).first()).toBeVisible();
		await expect(coal.getByText(/^\d+ units$/)).toBeVisible();
		await expect(coal.getByText('Capacity', { exact: true })).toBeVisible();
		await expect(coal.getByText('MW', { exact: true })).toBeVisible();

		expect(errors).toEqual([]);
	});

	test('wind facility shows a wind group', async ({ page }) => {
		// Macarthur Wind Farm
		const { cards, errors } = await openFacility(page, 'MACARTH');

		await expect(unitGroup(cards, 'wind').first()).toBeVisible();

		expect(errors).toEqual([]);
	});

	test('battery facility shows storage', async ({ page }) => {
		// Hornsdale Power Reserve
		const { cards, errors } = await openFacility(page, 'HORNSDPR');

		const battery = unitGroup(cards, 'battery').first();
		await expect(battery).toBeVisible();
		await expect(battery.getByText('Storage', { exact: true })).toBeVisible();
		await expect(battery.getByText('MWh', { exact: true })).toBeVisible();

		expect(errors).toEqual([]);
	});

	test('gas facility shows its gas subtype', async ({ page }) => {
		// Tallawarra
		const { cards, errors } = await openFacility(page, 'TALLAWAR');

		await expect(unitGroup(cards, 'gas_').first()).toBeVisible();

		expect(errors).toEqual([]);
	});

	test('detail pane renders its charts alongside the unit cards', async ({ page }) => {
		const { errors } = await openFacility(page, 'BAYSW');

		await expect(page.locator('.layercake-container').first()).toBeVisible({ timeout: 30000 });

		expect(errors).toEqual([]);
	});

	test('facilities page loads committed facilities without errors', async ({ page }) => {
		/** @type {string[]} */
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));

		// Committed facilities may not have power data.
		await page.goto('/facilities?statuses=committed');
		await expect(page.locator('body')).not.toBeEmpty();

		expect(errors).toEqual([]);
	});
});
