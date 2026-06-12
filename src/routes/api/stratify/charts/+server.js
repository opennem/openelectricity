import { json } from '@sveltejs/kit';
import { createCmsClient } from '$lib/sanity-cms.js';
import { verifyAdmin } from '$lib/auth/clerk-server.js';
import { normaliseChart } from '$lib/stratify/chart-data.js';

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 100;

/**
 * Parse a positive integer query param, falling back when missing/invalid.
 * @param {string | null} value
 * @param {number} fallback
 */
function toPositiveInt(value, fallback) {
	const n = Number.parseInt(value ?? '', 10);
	return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * GET /api/stratify/charts — list own charts + community charts.
 *
 * Each section is paginated independently and returned as
 * `{ items, total, page, totalPages }` where items are full normalised
 * chart documents (including csvText, for thumbnail rendering).
 *
 * Query params:
 * - scope: 'all' (default) | 'my' | 'community' — fetch one section only
 * - myPage / communityPage: 1-based page numbers
 * - pageSize: items per section page (default 12, max 100)
 * - q: search term matched against title/description
 * - status: 'draft' | 'published' — applied to my charts always, to
 *   community charts only for superadmins (normal users always see
 *   published community charts only)
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ request, url }) {
	const auth = await verifyAdmin(request);
	if (!auth.isAdmin) {
		return json({ error: 'Unauthorised' }, { status: auth.authenticated ? 403 : 401 });
	}

	const scope = url.searchParams.get('scope') ?? 'all';
	const statusFilter = url.searchParams.get('status');
	const search = url.searchParams.get('q')?.trim();
	const pageSize = Math.min(
		toPositiveInt(url.searchParams.get('pageSize'), DEFAULT_PAGE_SIZE),
		MAX_PAGE_SIZE
	);
	const myPage = toPositiveInt(url.searchParams.get('myPage'), 1);
	const communityPage = toPositiveInt(url.searchParams.get('communityPage'), 1);

	const client = createCmsClient();

	const statusClause = statusFilter ? ' && status == $status' : '';
	const searchClause = search ? ' && (title match $q || description match $q)' : '';

	const myFilters = `_type == "stratifyChart" && userId == $userId${statusClause}${searchClause}`;
	// Community charts: superadmin sees all (optionally status-filtered), normal users published only
	const communityFilters = auth.isSuperAdmin
		? `_type == "stratifyChart" && userId != $userId${statusClause}${searchClause}`
		: `_type == "stratifyChart" && userId != $userId && status == "published"${searchClause}`;

	const params = {
		userId: auth.userId,
		...(statusFilter ? { status: statusFilter } : {}),
		...(search ? { q: `*${search}*` } : {})
	};

	/**
	 * @param {string} filters
	 * @param {number} page
	 */
	async function fetchSection(filters, page) {
		const start = (page - 1) * pageSize;
		const end = start + pageSize;
		const [total, docs] = await Promise.all([
			/** @type {Promise<number>} */ (client.fetch(`count(*[${filters}])`, params)),
			client.fetch(`*[${filters}] | order(_updatedAt desc) [${start}...${end}] { ... }`, params)
		]);
		return {
			items: docs.map((/** @type {Record<string, any>} */ doc) => ({
				...normaliseChart(doc),
				status: doc.status,
				userEmail: doc.userEmail,
				publishedAt: doc.publishedAt,
				_createdAt: doc._createdAt,
				_updatedAt: doc._updatedAt
			})),
			total,
			page,
			totalPages: Math.max(1, Math.ceil(total / pageSize))
		};
	}

	const [my, community] = await Promise.all([
		scope === 'community' ? null : fetchSection(myFilters, myPage),
		scope === 'my' ? null : fetchSection(communityFilters, communityPage)
	]);

	return json({
		...(my ? { my } : {}),
		...(community ? { community } : {}),
		isSuperAdmin: auth.isSuperAdmin
	});
}

/**
 * POST /api/stratify/charts — create a new chart document.
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ request }) {
	const auth = await verifyAdmin(request);
	if (!auth.isAdmin) {
		return json({ error: 'Unauthorised' }, { status: auth.authenticated ? 403 : 401 });
	}

	const body = await request.json();

	if (!body.csvText) {
		return json({ error: 'csvText is required' }, { status: 400 });
	}

	const client = createCmsClient();
	const doc = await client.create({
		_type: 'stratifyChart',
		userId: auth.userId,
		userEmail: auth.userEmail,
		status: 'draft',
		title: body.title ?? '',
		description: body.description ?? '',
		dataSource: body.dataSource ?? '',
		notes: body.notes ?? '',
		csvText: body.csvText,
		chartType: body.chartType ?? 'stacked-area',
		displayMode: body.displayMode ?? 'auto',
		hiddenSeries: body.hiddenSeries ?? [],
		userSeriesColours: JSON.stringify(body.userSeriesColours ?? {}),
		userSeriesLabels: JSON.stringify(body.userSeriesLabels ?? {}),
		annotations: JSON.stringify(body.annotations ?? []),
		seriesChartTypes: JSON.stringify(body.seriesChartTypes ?? {}),
		seriesLineStyles: JSON.stringify(body.seriesLineStyles ?? {}),
		plotOverrides: JSON.stringify(body.plotOverrides ?? null),
		seriesOrder: body.seriesOrder ?? [],
		stylePreset: body.stylePreset ?? 'sans',
		colourPalette: body.colourPalette ?? 'oe-energy',
		showLegend: body.showLegend ?? true,
		showBranding: body.showBranding ?? true,
		chartHeight: body.chartHeight ?? 250,
		xTicks: body.xTicks ?? 0,
		xTickRotate: body.xTickRotate ?? 0,
		marginBottom: body.marginBottom ?? 0,
		marginLeft: body.marginLeft ?? 0,
		yTicks: body.yTicks ?? 0,
		yMinMax: body.yMinMax ?? false,
		y1Min: body.y1Min ?? null,
		y1Max: body.y1Max ?? null,
		y2Ticks: body.y2Ticks ?? 0,
		y2MinMax: body.y2MinMax ?? false,
		y2Min: body.y2Min ?? null,
		y2Max: body.y2Max ?? null,
		tooltipColumns: body.tooltipColumns ?? [],
		xColumn: body.xColumn ?? '',
		dataTransform: body.dataTransform ?? 'none',
		categorySort: body.categorySort ?? 'default',
		showXTickLabels: body.showXTickLabels ?? true,
		colourSeries: body.colourSeries ?? null,
		facetColumn: body.facetColumn ?? null,
		facetPanelsPerRow: body.facetPanelsPerRow ?? 0,
		animateAsOneChart: body.animateAsOneChart ?? false,
		animationSpeedMs: body.animationSpeedMs ?? 800,
		animationAutoLoop: body.animationAutoLoop ?? false,
		animationAutoPlay: body.animationAutoPlay ?? false,
		animationTween: body.animationTween ?? true,
		chartCurve: body.chartCurve ?? 'linear',
		waterfallMode: body.waterfallMode ?? 'single',
		waterfallShowTotal: body.waterfallShowTotal ?? true,
		waterfallColourMode: body.waterfallColourMode ?? 'semantic',
		valueFormat: body.valueFormat ?? '1',
		chartBorderWidth: body.chartBorderWidth ?? 0.5,
		chartBorderColour: body.chartBorderColour ?? '#000000',
		xLabel: body.xLabel ?? '',
		yLabel: body.yLabel ?? '',
		seriesYAxis: JSON.stringify(body.seriesYAxis ?? {}),
		y2Label: body.y2Label ?? '',
		latColumn: body.latColumn ?? null,
		lngColumn: body.lngColumn ?? null,
		labelColumn: body.labelColumn ?? null,
		sizeColumn: body.sizeColumn ?? null,
		mapColourMode: body.mapColourMode ?? 'single',
		colourColumn: body.colourColumn ?? null,
		singleMarkerColour: body.singleMarkerColour ?? '#3b82f6',
		mapRangeMinColour: body.mapRangeMinColour ?? '#dbeafe',
		mapRangeMaxColour: body.mapRangeMaxColour ?? '#1e3a8a',
		mapMinRadius: body.mapMinRadius ?? 4,
		mapMaxRadius: body.mapMaxRadius ?? 24,
		mapTheme: body.mapTheme ?? 'light',
		snapshotVersion: body.version ?? 1,
		publishedAt: null
	});

	return json({ chart: { _id: doc._id } }, { status: 201 });
}
