import { test, expect } from '@playwright/test';
import { card, collectPageErrors, trackerFixture, trackerReady } from './helpers/tracker.js';

// A phone: touch input, mobile viewport (Chromium; the suite's one project).
test.use({
	viewport: { width: 390, height: 844 },
	hasTouch: true,
	isMobile: true,
	deviceScaleFactor: 3
});

/** The Timeline's scrolling chart column's scroll offset. */
const columnScrollTop = (page) =>
	card(page, 'Generation').evaluate((node) => {
		let el = node.parentElement;
		while (
			el &&
			!(el.scrollHeight > el.clientHeight && /auto|scroll/.test(getComputedStyle(el).overflowY))
		)
			el = el.parentElement;
		return el?.scrollTop ?? -1;
	});

/** A pinned or hovered time in a card's readout strip, e.g. "13 Oct 2026, 11:00 pm". */
const READOUT_TIME = /\d{4}, \d{1,2}:\d{2}\s?(am|pm)/i;

/** The interaction surface over a card's plot (InteractionLayer). */
const plotSurface = (section) => section.locator('.stratum-chart-area > div').first();

test.beforeEach(async ({ page }) => {
	await trackerFixture(page);
	await page.goto('/tracker/timeline');
	await trackerReady(page);
});

test('a vertical swipe that starts on a chart scrolls the page', async ({ page }) => {
	const errors = collectPageErrors(page);
	const chart = plotSurface(card(page, 'Generation'));
	await expect(chart).toHaveCSS('touch-action', 'pan-y');
	const box = await chart.boundingBox();
	const before = await columnScrollTop(page);
	const cdp = await page.context().newCDPSession(page);
	await cdp.send('Input.synthesizeScrollGesture', {
		x: Math.round(box.x + box.width / 2),
		y: Math.round(box.y + box.height * 0.7),
		yDistance: -200,
		gestureSourceType: 'touch'
	});
	await expect.poll(() => columnScrollTop(page)).toBeGreaterThan(before + 100);
	expect(errors).toEqual([]);
});

test('a tap pins a time once and a second tap releases it', async ({ page }) => {
	const market = card(page, 'Market');
	await market.scrollIntoViewIfNeeded();
	const plot = plotSurface(market);
	const readout = market.getByTestId('chart-tooltip-strip');
	await expect(plot.locator('svg').first()).toBeVisible();
	const box = await plot.boundingBox();
	const tap = () => page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);

	await expect(readout).not.toContainText(READOUT_TIME);
	await tap();
	await expect(readout).toContainText(READOUT_TIME);
	await expect(page.getByRole('button', { name: 'Disable pan and zoom' })).toHaveCount(0);
	await tap();
	await expect(readout).not.toContainText(READOUT_TIME);
});

test('chart cards have no height handles to catch a swipe between them', async ({ page }) => {
	await expect(card(page, 'Market')).toBeVisible();
	await expect(page.getByRole('separator', { name: 'Resize chart height' })).toHaveCount(0);
});

test('two fingers pinch-zoom a chart with no pan and zoom toggle to engage first', async ({
	page
}) => {
	const generation = card(page, 'Generation');
	await expect(generation.getByRole('button', { name: 'Enable pan and zoom' })).toHaveCount(0);
	const plot = plotSurface(generation);
	await expect(plot.locator('svg').first()).toBeVisible();
	const ticks = () => generation.locator('.x-axis .tick text').allTextContents();
	const before = await ticks();
	const scrollBefore = await columnScrollTop(page);

	const box = await plot.boundingBox();
	const y = Math.round(box.y + box.height / 2);
	const mid = Math.round(box.x + box.width / 2);
	const points = (spread) => [
		{ x: mid - spread, y, id: 1 },
		{ x: mid + spread, y, id: 2 }
	];
	const cdp = await page.context().newCDPSession(page);
	await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(20) });
	for (let spread = 30; spread <= 120; spread += 10) {
		await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(spread) });
	}
	await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

	await expect.poll(ticks).not.toEqual(before);
	expect(await columnScrollTop(page)).toBe(scrollBefore);
});

test('the fuel tech table opens in a bottom sheet that leaves the charts full width', async ({
	page
}) => {
	const width = () =>
		card(page, 'Generation').evaluate((node) => node.getBoundingClientRect().width);
	const fullWidth = await width();
	expect(fullWidth).toBeGreaterThan(350);
	await expect(page.getByRole('button', { name: 'Show fuel tech table' })).toBeHidden();

	const show = page.getByRole('button', { name: 'Show fuel technologies' });
	await show.tap();
	await expect(page).not.toHaveURL(/[?&]table=0/);
	await expect(page.locator('#tracker-table-panel table')).toBeVisible();
	expect(await width()).toBe(fullWidth);

	await page.getByRole('button', { name: 'Minimise fuel technologies' }).tap();
	await expect(page).toHaveURL(/[?&]table=0/);
	await expect(page.getByRole('button', { name: 'Show fuel technologies' })).toBeVisible();
});

test('a long press on a fuel tech row shows that technology alone', async ({ page }) => {
	await page.getByRole('button', { name: 'Show fuel technologies' }).tap();
	const rows = page.getByTestId('fuel-tech-row');
	await expect(rows.first()).toBeVisible();
	// Let the sheet finish rising before aiming at a row.
	await page.locator('#tracker-table-panel').evaluate((panel) =>
		Promise.all(
			panel
				.closest('.rounded-t-2xl')
				.getAnimations({ subtree: false })
				.map((a) => a.finished)
		)
	);
	const total = await rows.count();
	expect(total).toBeGreaterThan(1);
	const box = await rows.first().boundingBox();
	const at = { x: Math.round(box.x + 40), y: Math.round(box.y + box.height / 2), id: 1 };
	const cdp = await page.context().newCDPSession(page);
	await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [at] });
	await page.waitForTimeout(700);
	await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

	await expect(rows.first()).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('[data-testid="fuel-tech-row"][aria-pressed="true"]')).toHaveCount(1);
});

test('the filters get their own row and open as a bottom sheet', async ({ page }) => {
	const filters = page.getByTestId('tracker-view-filters');
	const region = filters.getByRole('button').first();
	await expect(region).toBeInViewport({ ratio: 1 });
	const [bar, row] = await Promise.all([
		page.getByRole('button', { name: 'Timeline' }).boundingBox(),
		region.boundingBox()
	]);
	expect(row.y).toBeGreaterThan(bar.y + bar.height);

	await region.tap();
	const sheet = page.getByRole('heading', { name: 'Region', exact: true });
	await expect(sheet).toBeVisible();
	await expect(page.getByRole('listbox', { name: 'Region' })).toBeVisible();
	await page.getByRole('button', { name: 'Close Region' }).tap();
	await expect(sheet).toBeHidden();
});

test('the range menu opens over the page and Custom… opens the date range sheet', async ({
	page
}) => {
	await page.getByTestId('tracker-view-filters').locator('[data-select-trigger]').first().tap();
	const custom = page.getByRole('button', { name: 'Custom…' });
	// Visible and on top: a mask or clip on the filter row would hide it.
	await custom.tap({ timeout: 5000 });
	await expect(page.getByRole('heading', { name: 'Custom date range' })).toBeVisible();
	await page.getByRole('button', { name: 'Close date picker' }).tap();
	await expect(page.getByRole('heading', { name: 'Custom date range' })).toBeHidden();
});
