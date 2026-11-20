import { test, expect } from '@playwright/test';

/**
 * Some hosts that embed /widget drop or block writes to `history`. SvelteKit 3
 * reads its start-up entry back from `history.state`, so without the guard in
 * `src/app.html` the router fails to start there.
 */
const hosts = {
	'drops history writes':
		'History.prototype.pushState = History.prototype.replaceState = function () {};',
	'blocks history writes': `History.prototype.pushState = History.prototype.replaceState = function () {
		throw new DOMException('The operation is insecure.', 'SecurityError');
	};`
};

for (const [name, script] of Object.entries(hosts)) {
	test(`/widget starts in a host that ${name}`, async ({ page }) => {
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await page.addInitScript(script);

		await page.goto('/widget');
		await expect(page.locator('html[data-hydrated]')).toBeAttached();

		// The region menu only opens once the page is interactive
		await page.getByRole('button', { name: /NEM/ }).first().click();
		await page.getByText('WEM').first().click();
		await expect(page.locator('body')).toContainText('WEM');

		expect(errors).toEqual([]);
	});
}
