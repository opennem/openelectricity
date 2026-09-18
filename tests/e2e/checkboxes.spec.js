import { test, expect } from '@playwright/test';

test('shared Bits checkboxes support labels, keyboard, mixed and disabled states', async ({
	page
}, testInfo) => {
	await page.goto('/studio/design-system');
	const checked = page.getByRole('checkbox', { name: 'Solar (Rooftop)', exact: true });
	const unchecked = page.getByRole('checkbox', { name: 'Imports', exact: true });
	const mixed = page.getByRole('checkbox', { name: 'Mixed selection', exact: true });
	const disabled = page.getByRole('checkbox', { name: 'Disabled option', exact: true });
	await expect(checked).toBeChecked();
	await expect(unchecked).not.toBeChecked();
	await expect(mixed).toHaveAttribute('aria-checked', 'mixed');
	await expect(disabled).toBeDisabled();
	await expect(checked).toHaveCSS('width', '25px');
	await expect(checked).toHaveCSS('background-color', 'rgb(23, 23, 23)');
	await expect(unchecked).toHaveCSS('background-color', 'rgb(255, 255, 255)');
	await checked.scrollIntoViewIfNeeded();
	await page.screenshot({ path: testInfo.outputPath('checkbox-states-desktop.png') });

	await page.locator(`label[for="${await unchecked.getAttribute('id')}"]`).click();
	await expect(unchecked).toBeChecked();
	await unchecked.focus();
	await page.keyboard.press('Space');
	await expect(unchecked).not.toBeChecked();
	await mixed.click();
	await expect(mixed).toBeChecked();
	await expect(mixed).toHaveAttribute('aria-checked', 'true');
	await mixed.uncheck();
	await expect(mixed).not.toBeChecked();
	// Exercise the browser's disabled behaviour without Playwright waiting for enablement.
	await page.locator(`label[for="${await disabled.getAttribute('id')}"]`).click({ force: true });
	await expect(disabled).not.toBeChecked();

	await page.setViewportSize({ width: 390, height: 700 });
	await unchecked.scrollIntoViewIfNeeded();
	await unchecked.check();
	await expect(unchecked).toBeChecked();
	await expect(unchecked.locator('svg')).toBeVisible();
	await expect(unchecked).toHaveCSS('background-color', 'rgb(23, 23, 23)');
	await page.screenshot({ path: testInfo.outputPath('checkbox-states-mobile.png') });
});
