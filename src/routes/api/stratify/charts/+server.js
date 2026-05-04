import { json } from '@sveltejs/kit';
import { createCmsClient } from '$lib/sanity-cms.js';
import { verifyAdmin } from '$lib/auth/clerk-server.js';

const CHART_FIELDS = `_id, title, chartType, status, description, userEmail, _createdAt, _updatedAt`;

/**
 * GET /api/stratify/charts — list own charts + community charts.
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ request, url }) {
	const auth = await verifyAdmin(request);
	if (!auth.isAdmin) {
		return json({ error: 'Unauthorised' }, { status: auth.authenticated ? 403 : 401 });
	}

	const statusFilter = url.searchParams.get('status');
	const client = createCmsClient();

	// My charts (always includes both draft + published, filtered client-side or via param)
	const myQuery = statusFilter
		? `*[_type == "stratifyChart" && userId == $userId && status == $status] | order(_updatedAt desc) { ${CHART_FIELDS} }`
		: `*[_type == "stratifyChart" && userId == $userId] | order(_updatedAt desc) { ${CHART_FIELDS} }`;

	// Community charts: superadmin sees all, normal users see published only
	const communityQuery = auth.isSuperAdmin
		? statusFilter
			? `*[_type == "stratifyChart" && userId != $userId && status == $status] | order(_updatedAt desc) { ${CHART_FIELDS} }`
			: `*[_type == "stratifyChart" && userId != $userId] | order(_updatedAt desc) { ${CHART_FIELDS} }`
		: `*[_type == "stratifyChart" && userId != $userId && status == "published"] | order(_updatedAt desc) { ${CHART_FIELDS} }`;

	const params = { userId: auth.userId, ...(statusFilter ? { status: statusFilter } : {}) };

	const [myCharts, communityCharts] = await Promise.all([
		client.fetch(myQuery, params),
		client.fetch(communityQuery, params)
	]);

	return json({ myCharts, communityCharts, isSuperAdmin: auth.isSuperAdmin });
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
		xLabel: body.xLabel ?? '',
		yLabel: body.yLabel ?? '',
		seriesYAxis: JSON.stringify(body.seriesYAxis ?? {}),
		y2Label: body.y2Label ?? '',
		snapshotVersion: body.version ?? 1,
		publishedAt: null
	});

	return json({ chart: { _id: doc._id } }, { status: 201 });
}
