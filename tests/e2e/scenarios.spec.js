import { test, expect } from '@playwright/test';

test.describe('Scenarios Page', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/scenarios');
		// Wait for Stratum charts to render — the page does client-side data fetching
		await page.waitForSelector('.stratum-chart', { timeout: 30000 });
	});

	// 1. Page structure tests

	test('should load with page title', async ({ page }) => {
		await expect(page.getByRole('heading', { name: /Scenario Explorer/i })).toBeVisible();
	});

	test('should display filter bar with view section switch', async ({ page }) => {
		// The Switch component renders buttons for each view section
		await expect(page.getByRole('button', { name: /By Technology/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /By Scenario/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /By Region/i })).toBeVisible();
	});

	test('should show charts by default', async ({ page }) => {
		const charts = page.locator('.stratum-chart');
		const chartCount = await charts.count();
		expect(chartCount).toBeGreaterThan(0);

		// Each chart container should have an SVG element
		const svgs = page.locator('.stratum-chart svg');
		const svgCount = await svgs.count();
		expect(svgCount).toBeGreaterThan(0);
	});

	// 2. Technology view (default)

	test('should display chart titles', async ({ page }) => {
		// The default view shows Generation, Capacity, Emissions and Intensity charts
		await expect(page.locator('h5').filter({ hasText: 'Generation' })).toBeVisible();
		await expect(page.locator('h5').filter({ hasText: 'Capacity' })).toBeVisible();
		await expect(page.locator('h5').filter({ hasText: 'Emissions' })).toBeVisible();
		await expect(page.locator('h5').filter({ hasText: 'Intensity' })).toBeVisible();
	});

	test('should render SVG elements in charts', async ({ page }) => {
		// Charts should contain rendered path elements
		const paths = page.locator('svg path');
		const pathCount = await paths.count();
		expect(pathCount).toBeGreaterThan(0);
	});

	test('should show table panel alongside charts', async ({ page }) => {
		// The Technology view renders a TableTechnology component in a side section
		// The table section occupies 40% width on desktop
		const tableSection = page.locator('section.md\\:w-\\[40\\%\\]');
		await expect(tableSection).toBeVisible();
	});

	// 3. View switching — all views now use Stratum Chart v2

	test('should switch to Scenario view and render stratum charts', async ({ page }) => {
		const scenarioButton = page.getByRole('button', { name: /By Scenario/i });
		await scenarioButton.click();

		// Scenario view now uses MiniCharts with StratumChart (v2)
		await page.waitForSelector('.stratum-chart', { timeout: 30000 });

		const charts = page.locator('.stratum-chart');
		const chartCount = await charts.count();
		expect(chartCount).toBeGreaterThan(0);

		// Chart SVGs should be present
		const svgs = page.locator('.stratum-chart svg');
		const svgCount = await svgs.count();
		expect(svgCount).toBeGreaterThan(0);
	});

	test('should switch to Region view and render stratum charts', async ({ page }) => {
		const regionButton = page.getByRole('button', { name: /By Region/i });
		await regionButton.click();

		// Region view now uses MiniCharts with StratumChart (v2)
		await page.waitForSelector('.stratum-chart', { timeout: 30000 });

		const charts = page.locator('.stratum-chart');
		const chartCount = await charts.count();
		expect(chartCount).toBeGreaterThan(0);

		// Chart SVGs should be present
		const svgs = page.locator('.stratum-chart svg');
		const svgCount = await svgs.count();
		expect(svgCount).toBeGreaterThan(0);
	});

	test('should switch back to Technology view from another view', async ({ page }) => {
		// Switch away first
		const scenarioButton = page.getByRole('button', { name: /By Scenario/i });
		await scenarioButton.click();
		await page.waitForSelector('.stratum-chart', { timeout: 30000 });

		// Switch back to Technology
		const technologyButton = page.getByRole('button', { name: /By Technology/i });
		await technologyButton.click();
		await page.waitForSelector('.stratum-chart', { timeout: 30000 });

		// All four chart titles should be visible again
		await expect(page.locator('h5').filter({ hasText: 'Generation' })).toBeVisible();
		await expect(page.locator('h5').filter({ hasText: 'Capacity' })).toBeVisible();
	});

	// 4. Scenario view details

	test('should show scenario mini charts with titles', async ({ page }) => {
		const scenarioButton = page.getByRole('button', { name: /By Scenario/i });
		await scenarioButton.click();
		await page.waitForSelector('.stratum-chart', { timeout: 30000 });

		// Mini charts should have h6 titles for each scenario
		const miniChartTitles = page.locator('.stratum-chart').locator('..').locator('h6');
		const titleCount = await miniChartTitles.count();
		expect(titleCount).toBeGreaterThan(0);
	});

	test('should switch data type in Scenario view', async ({ page }) => {
		const scenarioButton = page.getByRole('button', { name: /By Scenario/i });
		await scenarioButton.click();
		await page.waitForSelector('.stratum-chart', { timeout: 30000 });

		// Switch to Emissions
		const emissionsSwitch = page
			.locator('section')
			.getByRole('button', { name: /Emissions/i })
			.first();
		if (await emissionsSwitch.isVisible()) {
			await emissionsSwitch.click();
			// Should still have stratum charts
			await page.waitForSelector('.stratum-chart', { timeout: 10000 });
			const charts = page.locator('.stratum-chart');
			expect(await charts.count()).toBeGreaterThan(0);
		}
	});

	// 5. Region view details

	test('should show region mini charts', async ({ page }) => {
		const regionButton = page.getByRole('button', { name: /By Region/i });
		await regionButton.click();
		await page.waitForSelector('.stratum-chart', { timeout: 30000 });

		// Region view should have mini chart sections
		const charts = page.locator('.stratum-chart');
		expect(await charts.count()).toBeGreaterThan(0);
	});

	test('should switch data type in Region view', async ({ page }) => {
		const regionButton = page.getByRole('button', { name: /By Region/i });
		await regionButton.click();
		await page.waitForSelector('.stratum-chart', { timeout: 30000 });

		// Switch to Capacity
		const capacitySwitch = page
			.locator('section')
			.getByRole('button', { name: /Capacity/i })
			.first();
		if (await capacitySwitch.isVisible()) {
			await capacitySwitch.click();
			await page.waitForSelector('.stratum-chart', { timeout: 10000 });
			const charts = page.locator('.stratum-chart');
			expect(await charts.count()).toBeGreaterThan(0);
		}
	});

	// 6. No console errors

	test('should load without console errors', async ({ page }) => {
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));

		await page.goto('/scenarios');

		// Wait for page content to render
		await expect(page.locator('body')).not.toBeEmpty();

		// Give time for client-side data processing
		await page.waitForTimeout(3000);

		expect(errors).toEqual([]);
	});

	test('should have no errors when switching between all views', async ({ page }) => {
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));

		// Switch to Scenario view
		await page.getByRole('button', { name: /By Scenario/i }).click();
		await page.waitForSelector('.stratum-chart', { timeout: 30000 });

		// Switch to Region view
		await page.getByRole('button', { name: /By Region/i }).click();
		await page.waitForSelector('.stratum-chart', { timeout: 30000 });

		// Switch back to Technology view
		await page.getByRole('button', { name: /By Technology/i }).click();
		await page.waitForSelector('.stratum-chart', { timeout: 30000 });

		expect(errors).toEqual([]);
	});
});
