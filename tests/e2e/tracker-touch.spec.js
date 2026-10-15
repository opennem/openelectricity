import { test, expect } from '@playwright/test';
import {
	card,
	collectPageErrors,
	expectNoHorizontalScroll,
	hydrated,
	regionsFixture,
	trackerFixture,
	trackerReady
} from './helpers/tracker.js';

// A phone: touch input, mobile viewport (Chromium; the suite's one project).
test.use({
	viewport: { width: 390, height: 844 },
	hasTouch: true,
	isMobile: true,
	deviceScaleFactor: 3
});

/** The page's scroll offset: phones scroll the tracker as a document. */
const pageScrollY = (page) => page.evaluate(() => window.scrollY);

/** A pinned or hovered time in a card's readout strip, e.g. "13 Oct, 11:00 pm"
 * (with the year when it isn't the current one). */
const READOUT_TIME = /\d{1,2} \w+( \d{4})?, \d{1,2}:\d{2}\s?(am|pm)/i;

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
	const before = await pageScrollY(page);
	const cdp = await page.context().newCDPSession(page);
	await cdp.send('Input.synthesizeScrollGesture', {
		x: Math.round(box.x + box.width / 2),
		y: Math.round(box.y + box.height * 0.7),
		yDistance: -200,
		gestureSourceType: 'touch'
	});
	await expect.poll(() => pageScrollY(page)).toBeGreaterThan(before + 100);
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
	const scrollBefore = await pageScrollY(page);

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
	expect(await pageScrollY(page)).toBe(scrollBefore);
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

test('the filters get their own row; pick-one lists use the native picker', async ({ page }) => {
	const filters = page.getByTestId('tracker-view-filters');
	const region = filters.getByRole('combobox', { name: 'Region' });
	await expect(region).toBeInViewport({ ratio: 1 });
	const [bar, row] = await Promise.all([
		page.getByRole('combobox', { name: 'Analysis view' }).boundingBox(),
		// The pill around the transparent select.
		region.locator('..').boundingBox()
	]);
	expect(row.y).toBeGreaterThan(bar.y + bar.height);
	// Native-app proportions: 40px pills.
	expect(Math.round(row.height)).toBe(40);

	await region.selectOption('qld1');
	await expect(page).toHaveURL(/region=qld1/);
	await expect(region.locator('..').getByText('QLD', { exact: true })).toBeVisible();
});

test('a list with its own controls opens as a bottom sheet', async ({ page }) => {
	// Compare's interval pill has the rolling-sum switch, which needs the
	// custom panel (Timeline's has none at 3D, so it is native there).
	await regionsFixture(page);
	await page.goto('/tracker/compare');
	await hydrated(page);
	await page
		.getByTestId('tracker-view-filters')
		.getByRole('button', { name: 'Month', exact: true })
		.tap();
	const sheet = page.getByRole('heading', { name: 'Interval', exact: true });
	await expect(sheet).toBeVisible();
	await expect(page.getByRole('listbox', { name: 'Interval' })).toBeVisible();
	await page.getByRole('button', { name: 'Close Interval' }).tap();
	await expect(sheet).toBeHidden();
});

test('Custom… in the range picker opens the date range sheet', async ({ page }) => {
	const range = page.getByTestId('tracker-view-filters').getByRole('combobox', { name: 'Range' });
	const before = await range.inputValue();
	await range.selectOption('custom');
	await expect(page.getByRole('heading', { name: 'Custom date range' })).toBeVisible();
	// The picker shows the applied range again, not "Custom…".
	await expect(range).toHaveValue(before);
	await page.getByRole('button', { name: 'Close date picker' }).tap();
	await expect(page.getByRole('heading', { name: 'Custom date range' })).toBeHidden();
});

test('the top nav scrolls away and the range strip stays in view', async ({ page }) => {
	const strip = page.getByTestId('tracker-range-status-sticky');
	await expect(strip).toBeVisible();
	await expectNoHorizontalScroll(page);
	await expect(page.getByTestId('tracker-range-status')).toBeHidden();
	await page.evaluate(() => window.scrollTo(0, 600));
	await expect.poll(() => pageScrollY(page)).toBeGreaterThan(300);
	await expect(page.getByRole('combobox', { name: 'Analysis view' })).not.toBeInViewport();
	await expect.poll(async () => Math.round((await strip.boundingBox()).y)).toBe(0);
	// It is the refresh button, as the top-nav readout is.
	await expect(page.getByTestId('tracker-range-label-sticky')).toHaveAccessibleName(
		/, refresh data$/
	);
});

test('metrics open as a dialog; a pick pins and marks it on its chart', async ({ page }) => {
	// Phones have no metrics strip.
	await expect(page.getByRole('region', { name: 'Window metrics' })).toBeHidden();
	await page.getByRole('button', { name: 'Options', exact: true }).tap();
	await page.getByRole('button', { name: 'Metrics', exact: true }).tap();
	const dialog = page.getByRole('dialog', { name: 'Metrics' });
	await expect(dialog).toBeVisible();
	const max = dialog.getByTestId('metric-list-market-max');
	await expect(max).toBeEnabled();
	await max.tap();
	await expect(dialog).toBeHidden();
	const market = card(page, 'Market');
	await expect(market.locator('.time-markers text')).toHaveText(/^Max spot price /);
	await expect(market.getByTestId('chart-tooltip-strip')).toContainText(READOUT_TIME);
});

test('a card folds its actions into ⋮ and keys its colours in the footer', async ({ page }) => {
	const generation = card(page, 'Generation');
	// The chart options are a sliders button; the actions sit behind ⋮.
	await expect(generation.getByRole('button', { name: 'Toggle chart options' })).toBeVisible();
	await expect(generation.getByRole('button', { name: 'Show table' })).toBeHidden();
	const legend = generation.getByTestId('series-legend');
	await expect(legend).toBeVisible();
	await expect(generation.locator('footer').getByTestId('series-legend')).toBeVisible();
	await expect(generation.locator('header').getByTestId('series-legend')).toHaveCount(0);

	await generation.getByRole('button', { name: 'Generation actions' }).tap();
	await page.getByRole('menu').getByRole('button', { name: 'Show table' }).tap();
	await expect(page.getByRole('menu')).toHaveCount(0);
	await generation.getByRole('button', { name: 'Generation actions' }).tap();
	await expect(page.getByRole('menu').getByRole('button', { name: 'Show chart' })).toBeVisible();
});
