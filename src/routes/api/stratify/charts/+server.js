import { json } from '@sveltejs/kit';
import { createCmsClient } from '$lib/sanity-cms.js';
import { verifyAdmin } from '$lib/auth/clerk-server.js';

/**
 * GET /api/stratify/charts — list the authenticated user's charts.
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ request }) {
	const auth = await verifyAdmin(request);
	if (!auth.isAdmin) {
		return json({ error: 'Unauthorised' }, { status: auth.authenticated ? 403 : 401 });
	}

	const client = createCmsClient();
	const charts = await client.fetch(
		`*[_type == "stratifyChart" && userId == $userId] | order(_updatedAt desc) {
			_id,
			title,
			chartType,
			status,
			description,
			_createdAt,
			_updatedAt
		}`,
		{ userId: auth.userId }
	);

	return json({ charts });
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
		plotOverrides: JSON.stringify(body.plotOverrides ?? null),
		seriesOrder: body.seriesOrder ?? [],
		stylePreset: body.stylePreset ?? 'oe',
		showBranding: body.showBranding ?? true,
		chartHeight: body.chartHeight ?? 400,
		xTicks: body.xTicks ?? 0,
		xTickRotate: body.xTickRotate ?? 0,
		marginBottom: body.marginBottom ?? 0,
		yTicks: body.yTicks ?? 0,
		yMinMax: body.yMinMax ?? false,
		y2Ticks: body.y2Ticks ?? 0,
		y2MinMax: body.y2MinMax ?? false,
		tooltipColumns: body.tooltipColumns ?? [],
		categorySort: body.categorySort ?? 'default',
		showXTickLabels: body.showXTickLabels ?? true,
		colourSeries: body.colourSeries ?? null,
		xLabel: body.xLabel ?? '',
		yLabel: body.yLabel ?? '',
		seriesYAxis: JSON.stringify(body.seriesYAxis ?? {}),
		y2Label: body.y2Label ?? '',
		snapshotVersion: body.version ?? 1,
		publishedAt: null
	});

	return json({ chart: { _id: doc._id } }, { status: 201 });
}
