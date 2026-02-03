import { test, expect } from '@playwright/test';

test.describe('Facility Explorer', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/studio/facility-explorer');
	});

	test('should load the page with title and selector', async ({ page }) => {
		await expect(page.getByRole('heading', { name: /Facility Explorer/i })).toBeVisible();
		await expect(page.getByPlaceholder(/Search by name or code/i)).toBeVisible();
	});

	test('should show empty state when no facility selected', async ({ page }) => {
		await expect(page.getByText(/Select a facility/i)).toBeVisible();
	});

	test('should have searchable facility selector', async ({ page }) => {
		// The datalist should exist
		const datalist = page.locator('#facilities-list');
		await expect(datalist).toBeAttached();

		// Input should be functional
		const input = page.getByPlaceholder(/Search by name or code/i);
		await input.fill('Loy');
		await expect(input).toHaveValue('Loy');
	});
});

test.describe('Facility Explorer - With Selection', () => {
	test('should display facility info when selected via URL', async ({ page }) => {
		await page.goto('/studio/facility-explorer?facility=LOYYB');

		// Wait for data to load
		await page.waitForResponse((response) => response.url().includes('/api/facilities/'));

		// Info panel should be visible
		await expect(page.getByText(/Region/i)).toBeVisible({ timeout: 30000 });
		await expect(page.getByText(/Capacity/i)).toBeVisible();
		await expect(page.getByText(/Units/i)).toBeVisible();
	});

	test('should display facility name in header', async ({ page }) => {
		await page.goto('/studio/facility-explorer?facility=LOYYB');
		await page.waitForResponse((response) => response.url().includes('/api/facilities/'));

		// Should show facility name
		await expect(page.getByText(/Loy Yang/i)).toBeVisible({ timeout: 30000 });
	});

	test('should show NEM network for NEM facilities', async ({ page }) => {
		await page.goto('/studio/facility-explorer?facility=LOYYB');
		await page.waitForResponse((response) => response.url().includes('/api/facilities/'));

		// Should show NEM
		await expect(page.getByText(/NEM/)).toBeVisible({ timeout: 30000 });
	});

	test('should have interval selector when data is loaded', async ({ page }) => {
		await page.goto('/studio/facility-explorer?facility=LOYYB');

		// Wait for chart to load
		await page.waitForSelector('.layercake-container', { timeout: 30000 });

		await expect(page.getByRole('button', { name: '5 min' })).toBeVisible();
		await expect(page.getByRole('button', { name: '30 min' })).toBeVisible();
	});

	test('should display units table', async ({ page }) => {
		await page.goto('/studio/facility-explorer?facility=LOYYB');

		// Wait for data to load
		await page.waitForResponse((response) => response.url().includes('/api/facilities/'));

		// Units table should be visible
		await expect(page.getByRole('table')).toBeVisible({ timeout: 30000 });
		await expect(page.getByText(/Fuel Tech/i)).toBeVisible();
	});

	test('should display chart when data is loaded', async ({ page }) => {
		await page.goto('/studio/facility-explorer?facility=LOYYB');

		// Wait for chart to load
		await page.waitForSelector('.layercake-container', { timeout: 30000 });

		// Chart should render SVG elements
		const svg = page.locator('.layercake-container svg');
		await expect(svg).toBeVisible();
	});
});

test.describe('Facility Explorer - Chart Interactions', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/studio/facility-explorer?facility=LOYYB');
		await page.waitForSelector('.layercake-container', { timeout: 30000 });
	});

	test('should have DateBrush component', async ({ page }) => {
		const dateBrush = page.locator('[role="slider"][aria-label="Date range brush"]');
		await expect(dateBrush).toBeVisible();
	});

	test('should switch intervals when clicking selector', async ({ page }) => {
		// Click 30min option
		const thirtyMinButton = page.getByRole('button', { name: '30 min' });
		await thirtyMinButton.click();
		await page.waitForTimeout(500);

		// Click back to 5min
		const fiveMinButton = page.getByRole('button', { name: '5 min' });
		await fiveMinButton.click();
		await page.waitForTimeout(500);

		// Both buttons should remain visible
		await expect(thirtyMinButton).toBeVisible();
		await expect(fiveMinButton).toBeVisible();
	});

	test('should show clear zoom button when brush is active', async ({ page }) => {
		// Initially, clear zoom button should not be visible
		const clearButton = page.getByRole('button', { name: /Clear zoom/i });
		await expect(clearButton).not.toBeVisible();

		// Create a brush selection by dragging on the DateBrush
		const dateBrush = page.locator('[role="slider"][aria-label="Date range brush"]');
		const box = await dateBrush.boundingBox();

		if (box) {
			// Drag to create selection
			await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2);
			await page.mouse.down();
			await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
			await page.mouse.up();
			await page.waitForTimeout(500);

			// Clear zoom button should now be visible
			await expect(clearButton).toBeVisible();

			// Click to clear
			await clearButton.click();
			await page.waitForTimeout(300);

			// Button should disappear
			await expect(clearButton).not.toBeVisible();
		}
	});
});

test.describe('Facility Explorer - Error Handling', () => {
	test('should show error for invalid facility code', async ({ page }) => {
		await page.goto('/studio/facility-explorer?facility=INVALID_FACILITY_CODE');

		// Should show error message
		await expect(page.getByText(/not found/i)).toBeVisible({ timeout: 30000 });
	});
});

test.describe('Facility Explorer - Studio Index', () => {
	test('should show Facility Explorer in studio index', async ({ page }) => {
		await page.goto('/studio');

		// Should have Facility Explorer card
		await expect(page.getByText('Facility Explorer')).toBeVisible();
		await expect(page.getByText(/7-day power generation/i)).toBeVisible();
	});

	test('should navigate to Facility Explorer from studio index', async ({ page }) => {
		await page.goto('/studio');

		// Click on the project link
		const link = page.getByRole('link', { name: /View Project/i }).filter({
			has: page
				.locator(':scope')
				.filter({ hasText: 'Facility Explorer' })
				.locator('..')
				.locator('..')
		});

		// Find the Facility Explorer card and click its link
		const facilityExplorerCard = page.locator('text=Facility Explorer').locator('..');
		const viewLink = facilityExplorerCard.locator('a:has-text("View Project")');
		await viewLink.click();

		// Should navigate to facility explorer
		await expect(page).toHaveURL(/facility-explorer/);
	});
});
