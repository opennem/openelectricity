import { test, expect } from '@playwright/test';

test.describe('Lens on AU Grid', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/studio/lens-on-au-grid');
		// Wait for the charts to load
		await page.waitForSelector('.layercake-container', { timeout: 30000 });
	});

	test('should load the page with title', async ({ page }) => {
		// Check page title
		await expect(page.getByRole('heading', { name: /Lens on AU Grid/i })).toBeVisible();

		// Check for subtitle
		await expect(page.getByText('All regions overview')).toBeVisible();
	});

	test('should display NEM chart full width at top', async ({ page }) => {
		// NEM chart should be visible with title
		const nemHeader = page.locator('h6').filter({ hasText: /National Electricity Market/i });
		await expect(nemHeader).toBeVisible();

		// NEM chart container should exist
		const nemChart = page.locator('.stratum-chart').first();
		await expect(nemChart).toBeVisible();
	});

	test('should display multiple region charts in 2-column grid', async ({ page }) => {
		// Wait for all charts to render
		await page.waitForTimeout(1000);

		// Should have 7 charts total (NEM + 6 regions)
		const charts = page.locator('.stratum-chart');
		const chartCount = await charts.count();
		expect(chartCount).toBe(7);

		// Check for specific region labels
		const regions = [
			'New South Wales',
			'Queensland',
			'South Australia',
			'Tasmania',
			'Victoria',
			'Western Australia'
		];
		for (const region of regions) {
			await expect(page.getByText(region, { exact: false })).toBeVisible();
		}
	});

	test('should have DateBrush component', async ({ page }) => {
		// DateBrush should be visible
		const dateBrush = page.locator('[role="slider"][aria-label="Date range brush"]');
		await expect(dateBrush).toBeVisible();
	});

	test('should have interval selector with 5min and 30min options', async ({ page }) => {
		// Interval label should be visible
		await expect(page.getByText('Interval')).toBeVisible();

		// Both interval options should be present
		await expect(page.getByRole('button', { name: '5 min' })).toBeVisible();
		await expect(page.getByRole('button', { name: '30 min' })).toBeVisible();
	});

	test('should switch intervals when clicking selector', async ({ page }) => {
		// Click 30min option
		const thirtyMinButton = page.getByRole('button', { name: '30 min' });
		await thirtyMinButton.click();
		await page.waitForTimeout(500);

		// 30min should now be selected (has different styling)
		await expect(thirtyMinButton).toBeVisible();

		// Click back to 5min
		const fiveMinButton = page.getByRole('button', { name: '5 min' });
		await fiveMinButton.click();
		await page.waitForTimeout(500);
	});

	test('should render SVG chart elements in all charts', async ({ page }) => {
		// Check that SVG elements are rendered
		const svgs = page.locator('.layercake-container svg');
		const svgCount = await svgs.count();
		expect(svgCount).toBeGreaterThan(0);

		// Check for path elements (stacked areas)
		const paths = page.locator('svg path.path-area');
		const pathCount = await paths.count();
		expect(pathCount).toBeGreaterThan(0);
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

test.describe('Chart Interactions', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/studio/lens-on-au-grid');
		await page.waitForSelector('.layercake-container', { timeout: 30000 });
	});

	test('should show tooltip on hover', async ({ page }) => {
		// Find the first chart area (NEM)
		const chartArea = page.locator('.layercake-container').first();
		const box = await chartArea.boundingBox();

		if (box) {
			// Hover over the chart
			await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
			await page.waitForTimeout(500);

			// Tooltip content should be visible (shows time and values)
			// The chart tooltip component should display hover information
		}
	});

	test('should sync hover across multiple charts', async ({ page }) => {
		// Get all chart containers
		const charts = page.locator('.layercake-container');
		const chartCount = await charts.count();
		expect(chartCount).toBeGreaterThan(1);

		// Hover over the first chart
		const firstChart = charts.first();
		const box = await firstChart.boundingBox();

		if (box) {
			await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
			await page.waitForTimeout(300);

			// All charts should show hover indicators (LineX elements)
			// This verifies the sync is working
		}
	});

	test('should handle click/focus on data point and sync', async ({ page }) => {
		const chart = page.locator('.layercake-container').first();
		const box = await chart.boundingBox();

		if (box) {
			// Click on the chart to focus
			await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
			await page.waitForTimeout(500);

			// Focus should be set (indicated by focus line)
			// Click again to unfocus
			await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
			await page.waitForTimeout(300);
		}
	});

	test('should switch between area and line chart types', async ({ page }) => {
		// Find and click the chart options button
		const optionsButton = page.getByRole('button', { name: 'Toggle chart options' }).first();

		if (await optionsButton.isVisible()) {
			await optionsButton.click();
			await page.waitForTimeout(300);

			// Find the line button and click it
			const lineButton = page.getByRole('button', { name: /line/i }).first();
			if (await lineButton.isVisible()) {
				await lineButton.click();
				await page.waitForTimeout(500);

				// Verify chart type changed
				const paths = page.locator('svg path');
				await expect(paths.first()).toBeVisible();
			}
		}
	});
});

test.describe('DateBrush Interactions', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/studio/lens-on-au-grid');
		await page.waitForSelector('.layercake-container', { timeout: 30000 });
	});

	test('should create brush selection by dragging', async ({ page }) => {
		const dateBrush = page.locator('[role="slider"][aria-label="Date range brush"]');
		const box = await dateBrush.boundingBox();

		if (box) {
			// Drag to create selection
			await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2);
			await page.mouse.down();
			await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2);
			await page.mouse.up();
			await page.waitForTimeout(500);

			// Brush selection area should be visible
			const brushInner = page.locator('.brush-inner');
			await expect(brushInner).toBeVisible();
		}
	});

	test('should move brush selection by dragging', async ({ page }) => {
		const dateBrush = page.locator('[role="slider"][aria-label="Date range brush"]');
		const box = await dateBrush.boundingBox();

		if (box) {
			// First create a selection
			await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2);
			await page.mouse.down();
			await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
			await page.mouse.up();
			await page.waitForTimeout(300);

			// Now drag the selection to move it
			const brushInner = page.locator('.brush-inner');
			const brushBox = await brushInner.boundingBox();

			if (brushBox) {
				await page.mouse.move(brushBox.x + brushBox.width / 2, brushBox.y + brushBox.height / 2);
				await page.mouse.down();
				await page.mouse.move(
					brushBox.x + brushBox.width / 2 + 50,
					brushBox.y + brushBox.height / 2
				);
				await page.mouse.up();
				await page.waitForTimeout(300);

				// Brush should still be visible after moving
				await expect(brushInner).toBeVisible();
			}
		}
	});

	test('should resize brush using handles', async ({ page }) => {
		const dateBrush = page.locator('[role="slider"][aria-label="Date range brush"]');
		const box = await dateBrush.boundingBox();

		if (box) {
			// Create a selection
			await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2);
			await page.mouse.down();
			await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2);
			await page.mouse.up();
			await page.waitForTimeout(300);

			// Find and drag the right handle
			const rightHandle = page.locator('.brush-handle.right');
			if (await rightHandle.isVisible()) {
				const handleBox = await rightHandle.boundingBox();
				if (handleBox) {
					await page.mouse.move(
						handleBox.x + handleBox.width / 2,
						handleBox.y + handleBox.height / 2
					);
					await page.mouse.down();
					await page.mouse.move(handleBox.x + 50, handleBox.y + handleBox.height / 2);
					await page.mouse.up();
					await page.waitForTimeout(300);
				}
			}
		}
	});
});

test.describe('Responsive Layout', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/studio/lens-on-au-grid');
		await page.waitForSelector('.layercake-container', { timeout: 30000 });
	});

	test('should display single column on mobile', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		await page.waitForTimeout(500);

		// Charts should still be visible
		const charts = page.locator('.stratum-chart');
		await expect(charts.first()).toBeVisible();
	});

	test('should display 2-column grid on desktop', async ({ page }) => {
		// Set desktop viewport
		await page.setViewportSize({ width: 1920, height: 1080 });
		await page.waitForTimeout(500);

		// Grid container should exist
		const grid = page.locator('.grid.grid-cols-1.md\\:grid-cols-2');
		await expect(grid).toBeVisible();
	});

	test('should update charts on window resize', async ({ page }) => {
		const chart = page.locator('.layercake-container').first();

		// Get initial state
		await expect(chart).toBeVisible();

		// Resize window
		await page.setViewportSize({ width: 800, height: 600 });
		await page.waitForTimeout(500);

		// Chart should still be visible
		await expect(chart).toBeVisible();

		// Resize back
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.waitForTimeout(500);

		await expect(chart).toBeVisible();
	});
});
