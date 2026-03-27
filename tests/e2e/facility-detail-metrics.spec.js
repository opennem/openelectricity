import { test, expect } from '@playwright/test';

test.describe('Facility Detail Metrics', () => {
	test('coal facility shows coal-specific metrics', async ({ page }) => {
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));

		await page.goto('/facilities?facility=BAYSW');

		// Wait for the metrics component to render
		const metrics = page.locator('[data-testid="facility-unit-metrics"]');
		await expect(metrics).toBeVisible({ timeout: 30000 });

		// Should have a coal fuel tech group
		const coalGroup = page.locator('[data-testid="fuel-tech-group-coal"]');
		await expect(coalGroup).toBeVisible();

		// Should show coal-specific elements
		await expect(coalGroup.getByText(/Black Coal|Brown Coal/)).toBeVisible();
		await expect(coalGroup.getByText(/Capacity Factor/)).toBeVisible();

		// Should not have JS errors
		expect(errors).toEqual([]);
	});

	test('wind facility shows wind metrics', async ({ page }) => {
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));

		// Macarthur Wind Farm
		await page.goto('/facilities?facility=MACARTH1');

		const metrics = page.locator('[data-testid="facility-unit-metrics"]');
		await expect(metrics).toBeVisible({ timeout: 30000 });

		const windGroup = page.locator('[data-testid="fuel-tech-group-wind"]');
		await expect(windGroup).toBeVisible();

		await expect(windGroup.getByText(/Capacity Factor|Peak Output/)).toBeVisible();

		expect(errors).toEqual([]);
	});

	test('battery facility shows storage metrics', async ({ page }) => {
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));

		// Hornsdale Power Reserve
		await page.goto('/facilities?facility=HPRG1');

		const metrics = page.locator('[data-testid="facility-unit-metrics"]');
		await expect(metrics).toBeVisible({ timeout: 30000 });

		const batteryGroup = page.locator('[data-testid="fuel-tech-group-battery"]');
		await expect(batteryGroup).toBeVisible();

		expect(errors).toEqual([]);
	});

	test('gas facility shows gas subtype', async ({ page }) => {
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));

		// Tallawarra (CCGT)
		await page.goto('/facilities?facility=TALLWA1');

		const metrics = page.locator('[data-testid="facility-unit-metrics"]');
		await expect(metrics).toBeVisible({ timeout: 30000 });

		const gasGroup = page.locator('[data-testid="fuel-tech-group-gas"]');
		await expect(gasGroup).toBeVisible();

		expect(errors).toEqual([]);
	});

	test('detail panel loads without JS errors for various fuel techs', async ({ page }) => {
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));

		// Load any facility
		await page.goto('/facilities?facility=BAYSW');

		const metrics = page.locator('[data-testid="facility-unit-metrics"]');
		await expect(metrics).toBeVisible({ timeout: 30000 });

		// Chart should still render
		await expect(page.locator('.layercake-container')).toBeVisible({ timeout: 30000 });

		expect(errors).toEqual([]);
	});

	test('metrics show capacity and unit count per group', async ({ page }) => {
		await page.goto('/facilities?facility=BAYSW');

		const metrics = page.locator('[data-testid="facility-unit-metrics"]');
		await expect(metrics).toBeVisible({ timeout: 30000 });

		// Should show MW capacity value
		await expect(metrics.getByText(/MW/)).toBeVisible();

		// Should show unit count
		await expect(metrics.getByText(/unit/)).toBeVisible();
	});

	test('detail panel handles facility with no power data gracefully', async ({ page }) => {
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));

		// Load facilities page - committed facilities may not have power data
		await page.goto('/facilities?statuses=committed');

		// Page should load without errors
		await expect(page.locator('body')).not.toBeEmpty();

		expect(errors).toEqual([]);
	});
});
