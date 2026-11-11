/**
 * Wait until the app has hydrated (the root layout sets `data-hydrated` on
 * `<html>`). Clicks that land on server-rendered markup before then do
 * nothing, which makes tests flaky under parallel load.
 * @param {import('@playwright/test').Page} page
 */
export async function appHydrated(page) {
	await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
}
