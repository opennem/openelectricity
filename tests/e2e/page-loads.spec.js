import { test, expect } from '@playwright/test';

test.describe('Page Load Smoke Tests', () => {
	test('homepage loads without errors', async ({ page }) => {
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));

		await page.goto('/');
		await expect(page).toHaveURL('/');

		// Wait for page content to render
		await expect(page.locator('body')).not.toBeEmpty();

		expect(errors).toEqual([]);
	});

	test('/facilities loads without errors', async ({ page }) => {
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));

		await page.goto('/facilities');

		await expect(page.locator('body')).not.toBeEmpty();

		expect(errors).toEqual([]);
	});

	test('/scenarios loads without errors', async ({ page }) => {
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));

		await page.goto('/scenarios');

		await expect(page.locator('body')).not.toBeEmpty();

		// Give time for client-side data processing that triggers structuredClone
		await page.waitForTimeout(3000);

		expect(errors).toEqual([]);
	});

	test('/records loads without errors', async ({ page }) => {
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));

		await page.goto('/records');

		await expect(page.locator('body')).not.toBeEmpty();

		expect(errors).toEqual([]);
	});

	test('/analysis loads without errors', async ({ page }) => {
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));

		await page.goto('/analysis');

		await expect(page.locator('body')).not.toBeEmpty();

		expect(errors).toEqual([]);
	});

	test('/about loads without errors', async ({ page }) => {
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));

		await page.goto('/about');

		await expect(page.locator('body')).not.toBeEmpty();

		expect(errors).toEqual([]);
	});
});
