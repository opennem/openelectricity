import { test, expect } from '@playwright/test';

test.describe('Homepage ISP Scenarios Preview', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		// Scroll to the ISP scenarios section
		await page.locator('text=Explore the future').scrollIntoViewIfNeeded();
		// Wait for Stratum charts to render (client-side data fetching)
		await page.waitForSelector('.stratum-chart', { timeout: 30000 });
	});

	// 1. Structure tests

	test('should render the scenarios section heading', async ({ page }) => {
		await expect(
			page.getByRole('heading', { name: /Explore the future/i })
		).toBeVisible();
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

	// 2. Model selection — all 4 models

	test('should show model selector with options', async ({ page }) => {
		// The model selector is a FormSelect component
		const modelSelect = page.locator('select').first();
		await expect(modelSelect).toBeVisible();

		const options = modelSelect.locator('option');
		const optionCount = await options.count();
		// Should have all 4 model options
		expect(optionCount).toBe(4);
	});

	test('should switch between models and re-render charts', async ({ page }) => {
		const modelSelect = page.locator('select').first();

		// Get all option values
		const options = await modelSelect.locator('option').all();
		expect(options.length).toBe(4);

		// Switch to the second model
		const secondValue = await options[1].getAttribute('value');
		if (secondValue) {
			await modelSelect.selectOption(secondValue);
			// Wait for charts to re-render
			await page.waitForSelector('.stratum-chart', { timeout: 30000 });

			const charts = page.locator('.stratum-chart');
			expect(await charts.count()).toBeGreaterThan(0);
		}
	});

	// 3. Scenario switching

	test('should show scenario buttons', async ({ page }) => {
		// Scenario buttons are rendered as a grid of buttons
		const scenarioButtons = page.locator('button.rounded-lg');
		const buttonCount = await scenarioButtons.count();
		expect(buttonCount).toBeGreaterThan(0);
	});

	test('should switch scenarios and update chart', async ({ page }) => {
		const scenarioButtons = page.locator('button.rounded-lg');
		const buttonCount = await scenarioButtons.count();

		if (buttonCount > 1) {
			// Click the second scenario button
			await scenarioButtons.nth(1).click();
			// Wait for chart to update
			await page.waitForSelector('.stratum-chart', { timeout: 30000 });

			const paths = page.locator('.stratum-chart svg path');
			expect(await paths.count()).toBeGreaterThan(0);
		}
	});

	// 4. Mini charts / detailed breakdown

	test('should have a group view selector', async ({ page }) => {
		// The "View:" label with a FormSelect for group switching
		await expect(page.getByText('View:')).toBeVisible();
	});

	test('should switch group view and update mini charts', async ({ page }) => {
		// Find the group selector (second select on the page, after model selector)
		const selects = page.locator('select');
		const selectCount = await selects.count();

		if (selectCount > 1) {
			const groupSelect = selects.nth(1);
			const options = await groupSelect.locator('option').all();

			if (options.length > 1) {
				const secondValue = await options[1].getAttribute('value');
				if (secondValue) {
					await groupSelect.selectOption(secondValue);
					// Wait for mini charts to update
					await page.waitForSelector('.stratum-chart', { timeout: 30000 });

					const miniCharts = page.locator('.stratum-chart');
					expect(await miniCharts.count()).toBeGreaterThan(0);
				}
			}
		}
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
		await page.locator('text=Explore the future').scrollIntoViewIfNeeded();
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
		await page.locator('text=Explore the future').scrollIntoViewIfNeeded();
		await page.waitForSelector('.stratum-chart', { timeout: 30000 });

		// Should have made API calls for scenario data
		expect(responses.length).toBeGreaterThan(0);

		// All responses should be successful
		for (const r of responses) {
			expect(r.status).toBe(200);
		}
	});
});
