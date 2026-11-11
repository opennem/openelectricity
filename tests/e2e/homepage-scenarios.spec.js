import { test, expect } from '@playwright/test';

/** @param {import('@playwright/test').Page} page */
const filterBar = (page) =>
	page.getByTestId('homepage-scenarios').locator('div.border-b', { hasText: 'Scenario' }).first();

/** The Scenario and View selects, in that order. */
const filterSelects = (/** @type {import('@playwright/test').Page} */ page) =>
	filterBar(page).locator('button[aria-haspopup="listbox"]');

/**
 * Open a select, pick an option other than the current one and check the
 * trigger now shows it.
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} trigger
 */
async function switchToAnotherOption(page, trigger) {
	await trigger.click();
	const listbox = page.getByRole('listbox');
	const others = listbox.locator('[role="option"]:not([aria-selected="true"])');
	await expect(others.first()).toBeVisible();
	const label = await others.first().getAttribute('data-label');
	await others.first().click();
	await expect(listbox).toHaveCount(0);
	expect(label).toBeTruthy();
	await expect(trigger).toContainText(/** @type {string} */ (label));
}

test.describe('Homepage ISP Scenarios Preview', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		// The section lazy-loads when it nears the viewport, so scroll to its
		// container: the heading only exists once the preview has loaded.
		await page.getByTestId('homepage-scenarios').scrollIntoViewIfNeeded();
		// Wait for Stratum charts to render (client-side data fetching)
		await page.waitForSelector('.stratum-chart', { timeout: 30000 });
	});

	// 1. Structure tests

	test('should render the scenarios section heading', async ({ page }) => {
		await expect(page.getByRole('heading', { name: /Explore the future/i })).toBeVisible();
	});

	test('should render main stacked area chart with SVG paths', async ({ page }) => {
		const charts = page.locator('.stratum-chart');
		expect(await charts.count()).toBeGreaterThan(0);

		const svgs = page.locator('.stratum-chart svg');
		expect(await svgs.count()).toBeGreaterThan(0);

		const paths = page.locator('.stratum-chart svg path');
		expect(await paths.count()).toBeGreaterThan(0);
	});

	test('should render mini charts in detailed breakdown', async ({ page }) => {
		// Mini charts are rendered below the main chart
		const miniCharts = page.locator('.stratum-chart');
		// Main chart + at least 2 mini charts (homepage_preview has 6)
		expect(await miniCharts.count()).toBeGreaterThan(1);
	});

	// 2. Model — the preview always shows the latest model, without a selector

	test('should show the latest model', async ({ page }) => {
		const filters = filterBar(page);
		await expect(filters.getByText('Model', { exact: true })).toBeVisible();
		await expect(filters.getByText(/^AEMO \d{4} ISP/)).toBeVisible();
		await expect(filters.locator('select')).toHaveCount(0);
	});

	// 3. Scenario switching

	test('should list scenarios and switch between them', async ({ page }) => {
		const trigger = filterSelects(page).nth(0);
		await switchToAnotherOption(page, trigger);
		await expect(page.locator('.stratum-chart svg path').first()).toBeVisible();
	});

	// 4. Mini charts / detailed breakdown

	test('should have a group view selector', async ({ page }) => {
		await expect(filterBar(page).getByText('View', { exact: true })).toBeVisible();
		await expect(filterSelects(page).nth(1)).toContainText('Default');
	});

	test('should switch group view and update mini charts', async ({ page }) => {
		const trigger = filterSelects(page).nth(1);
		await switchToAnotherOption(page, trigger);
		await expect(trigger).toContainText('Renewables vs Fossil Fuels');
		await expect(page.locator('.stratum-chart').nth(1)).toBeVisible();
	});

	// 5. Link to full scenarios page

	test('should have link to scenario explorer', async ({ page }) => {
		const link = page.getByRole('link', { name: /View scenario explorer/i });
		await expect(link).toBeVisible();
		await expect(link).toHaveAttribute('href', '/scenarios');
	});

	// 6. No console errors

	test('should load without console errors', async ({ page }) => {
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));

		await page.goto('/');
		await page.getByTestId('homepage-scenarios').scrollIntoViewIfNeeded();
		await page.waitForSelector('.stratum-chart', { timeout: 30000 });

		// Give time for async data processing
		await page.waitForTimeout(2000);

		expect(errors).toEqual([]);
	});

	// 7. API calls

	test('should fetch scenario data from API', async ({ page }) => {
		const responses = [];
		page.on('response', (response) => {
			if (response.url().includes('/api/scenarios')) {
				responses.push({
					url: response.url(),
					status: response.status()
				});
			}
		});

		await page.goto('/');
		await page.getByTestId('homepage-scenarios').scrollIntoViewIfNeeded();
		await page.waitForSelector('.stratum-chart', { timeout: 30000 });

		// Should have made API calls for scenario data
		expect(responses.length).toBeGreaterThan(0);

		// All responses should be successful
		for (const r of responses) {
			expect(r.status).toBe(200);
		}
	});
});
