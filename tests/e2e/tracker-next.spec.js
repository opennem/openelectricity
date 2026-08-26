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

test.describe('Tracker (next) smoke tests', () => {
	test('/tracker/next loads without errors', async ({ page }) => {
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));

		await page.goto('/tracker/next');

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
		await page.goto('/tracker/next?region=nsw1');
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

		await page.goto('/tracker/next');
		await waitForHydration(page);
		const toggle = page.getByRole('button', { name: 'Hide fuel tech table' });
		await toggle.click();
		await expect(page).toHaveURL(/table=0/);

		await page.getByRole('button', { name: 'Show fuel tech table' }).click();
		await expect(page).not.toHaveURL(/table=0/);
		await expect(page.getByRole('button', { name: '% generation' })).toBeVisible();

		expect(errors).toEqual([]);
	});
});
