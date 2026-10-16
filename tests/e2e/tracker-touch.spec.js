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

/** A pinned or hovered time in the range readout, e.g. "13 Oct, 11:00 pm"
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
	// The pinned time reads in the range pill, not the chart's strip.
	const pill = page.getByTestId('tracker-range-status-sticky');
	await expect(plot.locator('svg').first()).toBeVisible();
	const box = await plot.boundingBox();
	const tap = () => page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);

	await expect(pill).toHaveAttribute('data-inspecting', 'false');
	await tap();
	await expect(pill).toHaveAttribute('data-inspecting', 'true');
	await expect(pill).toContainText(READOUT_TIME);
	await expect(page.getByRole('button', { name: 'Disable pan and zoom' })).toHaveCount(0);
	await tap();
	await expect(pill).toHaveAttribute('data-inspecting', 'false');
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

/** Open the fuel tech table's sheet from the button beside the range pill,
 * and wait for it to finish rising. */
async function openTable(page) {
	await page.getByTestId('tracker-table-button').tap();
	const panel = page.locator('#tracker-table-panel');
	await expect(panel.locator('table')).toBeVisible();
	await panel.evaluate((node) =>
		Promise.all(
			node
				.closest('.rounded-t-2xl')
				.getAnimations({ subtree: false })
				.map((a) => a.finished)
		)
	);
	return panel;
}

test('the fuel tech table opens in a sheet that leaves the charts full width', async ({ page }) => {
	const width = () =>
		card(page, 'Generation').evaluate((node) => node.getBoundingClientRect().width);
	const fullWidth = await width();
	expect(fullWidth).toBeGreaterThan(350);
	// Nothing is docked: no rail, no sheet, until the button opens one.
	await expect(page.getByRole('button', { name: 'Show fuel tech table' })).toBeHidden();
	await expect(page.locator('#tracker-table-panel')).toHaveCount(0);

	const button = page.getByTestId('tracker-table-button');
	await expect(button).toBeInViewport();
	const panel = await openTable(page);
	await expect(page).not.toHaveURL(/[?&]table=0/);
	// The floating button slides away while the table is open.
	await expect(button).not.toBeInViewport();
	// Near full height, over the page.
	const sheet = await panel.evaluate(
		(node) => node.closest('.rounded-t-2xl').getBoundingClientRect().height
	);
	expect(sheet).toBeGreaterThan(844 * 0.9);
	expect(await width()).toBe(fullWidth);

	await page.getByRole('button', { name: 'Hide fuel tech table', exact: true }).tap();
	await expect(page).toHaveURL(/[?&]table=0/);
	await expect(page.locator('#tracker-table-panel')).toHaveCount(0);
	await expect(button).toBeInViewport();
});

test('a long press on a fuel tech row shows that technology alone', async ({ page }) => {
	await openTable(page);
	const rows = page.getByTestId('fuel-tech-row');
	await expect(rows.first()).toBeVisible();
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

/** Open the phone filter sheet from the sticky pill. */
async function openFilters(page) {
	await page.getByTestId('tracker-range-label-sticky').tap();
	const sheet = page.getByTestId('tracker-filter-sheet');
	await expect(sheet).toBeVisible();
	return sheet;
}

test('the sticky pill opens the filters; regions are one switch', async ({ page }) => {
	// The filters have left the top nav for the sheet.
	await expect(page.getByTestId('tracker-view-filters')).toBeHidden();
	const pill = page.getByTestId('tracker-range-label-sticky');
	await expect(pill).toContainText('NEM');
	await expect(pill).toHaveAccessibleName(/, change filters$/);

	const sheet = await openFilters(page);
	const region = (name) => sheet.getByRole('button', { name, exact: true });
	await expect(region('National Electricity Market')).toHaveAttribute('aria-pressed', 'true');
	await expect(region('Queensland')).toHaveText('QLD');
	// Touch-sized segments.
	const segment = await region('Queensland').boundingBox();
	expect(Math.round(segment.height)).toBeGreaterThanOrEqual(32);

	// A tap applies at once.
	await region('Queensland').tap();
	await expect(page).toHaveURL(/region=qld1/);
	await expect(region('Queensland')).toHaveAttribute('aria-pressed', 'true');
	await expect(pill).toContainText('QLD');

	await page.getByRole('button', { name: 'Done' }).tap();
	await expect(sheet).toBeHidden();
});

test('range and interval are one tap each, with custom dates beneath', async ({ page }) => {
	const sheet = await openFilters(page);
	const pressed = (name) =>
		expect(sheet.getByRole('button', { name, exact: true })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
	await sheet.getByRole('button', { name: '30D', exact: true }).tap();
	await expect(page).toHaveURL(/range=30d/);
	await pressed('30D');
	// The interval segments follow the range.
	await pressed('Daily');
	await sheet.getByRole('button', { name: 'Hourly', exact: true }).tap();
	await expect(page).toHaveURL(/interval=1h/);

	await sheet.getByRole('button', { name: 'Choose a custom date range' }).tap();
	await pressed('Choose a custom date range');
	await expect(sheet.getByText('From', { exact: true })).toBeVisible();
	// Nothing applies until the dates do.
	await expect(page).toHaveURL(/range=30d/);
	await page.getByRole('button', { name: 'Close filters' }).tap();
	await expect(sheet).toBeHidden();
});

test('controls with options of their own keep them in the sheet', async ({ page }) => {
	// Compare's interval has the rolling-sum switch; its charts are checkboxes.
	await regionsFixture(page);
	await page.goto('/tracker/compare');
	await hydrated(page);
	await expect(page.getByRole('region', { name: 'Display options' })).toBeHidden();
	const sheet = await openFilters(page);
	await expect(sheet.getByRole('button', { name: 'Queensland', exact: true })).toHaveCount(0);
	// The display switch moves in, its icons named.
	const panels = sheet.getByRole('button', { name: 'Panels', exact: true });
	await expect(panels).toHaveText('Panels');
	await panels.tap();
	await expect(page).toHaveURL(/panels/);
	await expect(sheet.getByRole('button', { name: 'Month', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect(sheet.getByRole('switch', { name: '12-mth rolling sum' })).toBeVisible();
	await sheet.getByRole('button', { name: /^Emissions/ }).tap();
	await expect(sheet.getByRole('button', { name: 'Intensity', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
});

test('Profile keeps its breakdown options and an inline calendar in the sheet', async ({
	page
}) => {
	await page.goto('/tracker/profile?profile-display=breakdown');
	await hydrated(page);
	// The breakdown bar gives way to the sheet on phones.
	await expect(page.getByRole('region', { name: 'Breakdown options' })).toBeHidden();
	const sheet = await openFilters(page);
	await expect(sheet.getByRole('switch', { name: 'Show today' })).toBeVisible();
	// The chart styles carry their names.
	const ridgeline = sheet.getByRole('button', { name: 'Ridgeline', exact: true });
	await expect(ridgeline).toHaveText('Ridgeline');
	await ridgeline.tap();
	await expect(page).toHaveURL(/profile-style=ridgeline/);
	// The last day's calendar is open under its input, no popover.
	await expect(sheet.locator('[data-bits-day]').first()).toBeVisible();
	await expect(sheet.getByRole('button', { name: 'Open calendar' })).toHaveCount(0);
});

test('the top nav scrolls away and the filters pill stays in view', async ({ page }) => {
	const strip = page.getByTestId('tracker-range-status-sticky');
	await expect(strip).toBeVisible();
	await expectNoHorizontalScroll(page);
	await expect(page.getByTestId('tracker-range-status')).toBeHidden();
	await page.evaluate(() => window.scrollTo(0, 600));
	await expect.poll(() => pageScrollY(page)).toBeGreaterThan(300);
	await expect(page.getByRole('combobox', { name: 'Analysis view' })).not.toBeInViewport();
	await expect.poll(async () => Math.round((await strip.boundingBox()).y)).toBe(0);
	// It is the filters button.
	await expect(page.getByTestId('tracker-range-label-sticky')).toHaveAccessibleName(
		/, change filters$/
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
	await expect(page.getByTestId('tracker-range-label-sticky')).toContainText(READOUT_TIME);
});

test('the options menu ends with About, which holds the footer details', async ({ page }) => {
	// The shell checks the status as the page loads, so the fixture goes in
	// before a reload.
	await page.route('https://status.openelectricity.org.au/api/summary', (route) =>
		route.fulfill({
			json: {
				status: 'operational',
				statusLabel: 'Operational',
				statusColor: '#2C7629',
				apiLatencyMs: 212,
				dataLatencyMs: 360000,
				checkedAt: '2026-10-16T01:00:00Z'
			}
		})
	);
	await page.reload();
	await trackerReady(page);
	await expect(page.getByRole('link', { name: 'API Status', exact: true })).toBeHidden();
	// The options icon carries the status as a dot; the trigger keeps its name.
	await expect(page.getByTestId('tracker-options-api-status')).toHaveCSS(
		'background-color',
		'rgb(44, 118, 41)'
	);

	await page.getByRole('button', { name: 'Options', exact: true }).tap();
	// The status row (its dot and name; the status itself only for assistive
	// tech), opening the status page, then About end the menu.
	const items = page.getByRole('menu').locator('a, button');
	const status = items.nth(-2);
	await expect(status).toHaveAccessibleName('API status (Operational)');
	await expect(status.locator('.sr-only')).toHaveText('(Operational)');
	await expect(status).toHaveAttribute('href', 'https://status.openelectricity.org.au');
	await expect(items.last()).toHaveText('About');
	await items.last().tap();

	const sheet = page.getByTestId('tracker-about-sheet');
	await expect(sheet).toBeVisible();
	await expect(sheet.getByTestId('tracker-about-version')).toHaveText(/^v\d+\.\d+\.\d+/);
	await expect(sheet.getByRole('link', { name: /^API status/ })).toContainText('Operational');
	await expect(sheet.getByRole('link', { name: /^AEMO/ })).toHaveAttribute(
		'href',
		'https://www.aemo.com.au/'
	);
	await expect(sheet.getByRole('link', { name: /^Data licence/ })).toBeVisible();
	await expect(sheet.getByRole('link')).toHaveCount(6);

	await page.getByRole('button', { name: 'Done' }).tap();
	await expect(sheet).toBeHidden();
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
