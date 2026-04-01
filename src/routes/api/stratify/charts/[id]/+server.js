import { json } from '@sveltejs/kit';
import { createCmsClient } from '$lib/sanity-cms.js';
import { verifyAdmin } from '$lib/auth/clerk-server.js';
import { safeParseJSON } from '$lib/stratify/chart-data.js';

/**
 * GET /api/stratify/charts/:id — fetch a single chart (ownership check).
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ request, params }) {
	const auth = await verifyAdmin(request);
	if (!auth.isAdmin) {
		return json({ error: 'Unauthorised' }, { status: auth.authenticated ? 403 : 401 });
	}

	const client = createCmsClient();
	const chart = await client.fetch(
		`*[_type == "stratifyChart" && _id == $id && userId == $userId][0]`,
		{ id: params.id, userId: auth.userId }
	);

	if (!chart) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	// Parse JSON-stringified fields back to objects
	return json({
		chart: {
			...chart,
			userSeriesColours: safeParseJSON(chart.userSeriesColours, {}),
			userSeriesLabels: safeParseJSON(chart.userSeriesLabels, {}),
			annotations: safeParseJSON(chart.annotations, []),
			seriesChartTypes: safeParseJSON(chart.seriesChartTypes, {}),
			plotOverrides: safeParseJSON(chart.plotOverrides, null),
			seriesYAxis: safeParseJSON(chart.seriesYAxis, {}),
			seriesOrder: chart.seriesOrder ?? []
		}
	});
}

/**
 * PATCH /api/stratify/charts/:id — update a chart (ownership check).
 * @type {import('./$types').RequestHandler}
 */
export async function PATCH({ request, params }) {
	const auth = await verifyAdmin(request);
	if (!auth.isAdmin) {
		return json({ error: 'Unauthorised' }, { status: auth.authenticated ? 403 : 401 });
	}

	const client = createCmsClient();

	// Verify ownership before updating
	const existing = await client.fetch(
		`*[_type == "stratifyChart" && _id == $id && userId == $userId][0]{ _id }`,
		{ id: params.id, userId: auth.userId }
	);

	if (!existing) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	const body = await request.json();

	/** @type {Record<string, any>} */
	const patches = {};

	// Only set fields that are present in the request body
	if (body.title !== undefined) patches.title = body.title;
	if (body.description !== undefined) patches.description = body.description;
	if (body.dataSource !== undefined) patches.dataSource = body.dataSource;
	if (body.notes !== undefined) patches.notes = body.notes;
	if (body.csvText !== undefined) patches.csvText = body.csvText;
	if (body.chartType !== undefined) patches.chartType = body.chartType;
	if (body.displayMode !== undefined) patches.displayMode = body.displayMode;
	if (body.hiddenSeries !== undefined) patches.hiddenSeries = body.hiddenSeries;
	if (body.userSeriesColours !== undefined)
		patches.userSeriesColours = JSON.stringify(body.userSeriesColours);
	if (body.userSeriesLabels !== undefined)
		patches.userSeriesLabels = JSON.stringify(body.userSeriesLabels);
	if (body.annotations !== undefined) patches.annotations = JSON.stringify(body.annotations);
	if (body.seriesChartTypes !== undefined)
		patches.seriesChartTypes = JSON.stringify(body.seriesChartTypes);
	if (body.plotOverrides !== undefined) patches.plotOverrides = JSON.stringify(body.plotOverrides);
	if (body.seriesOrder !== undefined) patches.seriesOrder = body.seriesOrder;
	if (body.stylePreset !== undefined) patches.stylePreset = body.stylePreset;
	if (body.showBranding !== undefined) patches.showBranding = body.showBranding;
	if (body.chartHeight !== undefined) patches.chartHeight = body.chartHeight;
	if (body.xTicks !== undefined) patches.xTicks = body.xTicks;
	if (body.xTickRotate !== undefined) patches.xTickRotate = body.xTickRotate;
	if (body.marginBottom !== undefined) patches.marginBottom = body.marginBottom;
	if (body.yTicks !== undefined) patches.yTicks = body.yTicks;
	if (body.yMinMax !== undefined) patches.yMinMax = body.yMinMax;
	if (body.y2Ticks !== undefined) patches.y2Ticks = body.y2Ticks;
	if (body.y2MinMax !== undefined) patches.y2MinMax = body.y2MinMax;
	if (body.tooltipColumns !== undefined) patches.tooltipColumns = body.tooltipColumns;
	if (body.colourSeries !== undefined) patches.colourSeries = body.colourSeries;
	if (body.xLabel !== undefined) patches.xLabel = body.xLabel;
	if (body.yLabel !== undefined) patches.yLabel = body.yLabel;
	if (body.seriesYAxis !== undefined) patches.seriesYAxis = JSON.stringify(body.seriesYAxis);
	if (body.y2Label !== undefined) patches.y2Label = body.y2Label;
	if (body.status !== undefined) patches.status = body.status;
	if (body.publishedAt !== undefined) patches.publishedAt = body.publishedAt;
	if (body.version !== undefined) patches.snapshotVersion = body.version;

	if (Object.keys(patches).length === 0) {
		return json({ error: 'No fields to update' }, { status: 400 });
	}

	const result = await client.patch(params.id).set(patches).commit();

	return json({ chart: { _id: result._id } });
}

/**
 * DELETE /api/stratify/charts/:id — delete a chart (ownership check).
 * @type {import('./$types').RequestHandler}
 */
export async function DELETE({ request, params }) {
	const auth = await verifyAdmin(request);
	if (!auth.isAdmin) {
		return json({ error: 'Unauthorised' }, { status: auth.authenticated ? 403 : 401 });
	}

	const client = createCmsClient();

	// Verify ownership before deleting
	const existing = await client.fetch(
		`*[_type == "stratifyChart" && _id == $id && userId == $userId][0]{ _id }`,
		{ id: params.id, userId: auth.userId }
	);

	if (!existing) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	await client.delete(params.id);

	return json({ deleted: true });
}

