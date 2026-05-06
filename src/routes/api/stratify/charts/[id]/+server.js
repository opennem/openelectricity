import { json } from '@sveltejs/kit';
import { createCmsClient } from '$lib/sanity-cms.js';
import { verifyAdmin } from '$lib/auth/clerk-server.js';
import { safeParseJSON } from '$lib/stratify/chart-data.js';

/**
 * GET /api/stratify/charts/:id — fetch a single chart.
 * Owner can always read. Others can read published charts. Superadmin can read any.
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ request, params }) {
	const auth = await verifyAdmin(request);
	if (!auth.isAdmin) {
		return json({ error: 'Unauthorised' }, { status: auth.authenticated ? 403 : 401 });
	}

	const client = createCmsClient();
	const chart = await client.fetch(`*[_type == "stratifyChart" && _id == $id][0]`, {
		id: params.id
	});

	if (!chart) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	const isOwner = chart.userId === auth.userId;
	if (!isOwner && !auth.isSuperAdmin && chart.status !== 'published') {
		return json({ error: 'Not found' }, { status: 404 });
	}

	return json({
		chart: {
			...chart,
			userSeriesColours: safeParseJSON(chart.userSeriesColours, {}),
			userSeriesLabels: safeParseJSON(chart.userSeriesLabels, {}),
			annotations: safeParseJSON(chart.annotations, []),
			seriesChartTypes: safeParseJSON(chart.seriesChartTypes, {}),
			seriesLineStyles: safeParseJSON(chart.seriesLineStyles, {}),
			plotOverrides: safeParseJSON(chart.plotOverrides, null),
			seriesYAxis: safeParseJSON(chart.seriesYAxis, {}),
			seriesOrder: chart.seriesOrder ?? []
		}
	});
}

/**
 * PATCH /api/stratify/charts/:id — update a chart (owner or superadmin).
 * @type {import('./$types').RequestHandler}
 */
export async function PATCH({ request, params }) {
	const auth = await verifyAdmin(request);
	if (!auth.isAdmin) {
		return json({ error: 'Unauthorised' }, { status: auth.authenticated ? 403 : 401 });
	}

	const client = createCmsClient();

	const existing = await client.fetch(
		`*[_type == "stratifyChart" && _id == $id][0]{ _id, userId }`,
		{ id: params.id }
	);

	if (!existing) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	if (existing.userId !== auth.userId && !auth.isSuperAdmin) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const body = await request.json();

	/** @type {Record<string, any>} */
	const patches = {};

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
	if (body.seriesLineStyles !== undefined)
		patches.seriesLineStyles = JSON.stringify(body.seriesLineStyles);
	if (body.plotOverrides !== undefined) patches.plotOverrides = JSON.stringify(body.plotOverrides);
	if (body.seriesOrder !== undefined) patches.seriesOrder = body.seriesOrder;
	if (body.stylePreset !== undefined) patches.stylePreset = body.stylePreset;
	if (body.colourPalette !== undefined) patches.colourPalette = body.colourPalette;
	if (body.showLegend !== undefined) patches.showLegend = body.showLegend;
	if (body.showBranding !== undefined) patches.showBranding = body.showBranding;
	if (body.chartHeight !== undefined) patches.chartHeight = body.chartHeight;
	if (body.xTicks !== undefined) patches.xTicks = body.xTicks;
	if (body.xTickRotate !== undefined) patches.xTickRotate = body.xTickRotate;
	if (body.marginBottom !== undefined) patches.marginBottom = body.marginBottom;
	if (body.marginLeft !== undefined) patches.marginLeft = body.marginLeft;
	if (body.yTicks !== undefined) patches.yTicks = body.yTicks;
	if (body.yMinMax !== undefined) patches.yMinMax = body.yMinMax;
	if (body.y1Min !== undefined) patches.y1Min = body.y1Min;
	if (body.y1Max !== undefined) patches.y1Max = body.y1Max;
	if (body.y2Ticks !== undefined) patches.y2Ticks = body.y2Ticks;
	if (body.y2MinMax !== undefined) patches.y2MinMax = body.y2MinMax;
	if (body.y2Min !== undefined) patches.y2Min = body.y2Min;
	if (body.y2Max !== undefined) patches.y2Max = body.y2Max;
	if (body.tooltipColumns !== undefined) patches.tooltipColumns = body.tooltipColumns;
	if (body.xColumn !== undefined) patches.xColumn = body.xColumn;
	if (body.dataTransform !== undefined) patches.dataTransform = body.dataTransform;
	if (body.categorySort !== undefined) patches.categorySort = body.categorySort;
	if (body.showXTickLabels !== undefined) patches.showXTickLabels = body.showXTickLabels;
	if (body.colourSeries !== undefined) patches.colourSeries = body.colourSeries;
	if (body.facetColumn !== undefined) patches.facetColumn = body.facetColumn;
	if (body.facetPanelsPerRow !== undefined) patches.facetPanelsPerRow = body.facetPanelsPerRow;
	if (body.animateAsOneChart !== undefined) patches.animateAsOneChart = body.animateAsOneChart;
	if (body.animationSpeedMs !== undefined) patches.animationSpeedMs = body.animationSpeedMs;
	if (body.animationAutoLoop !== undefined) patches.animationAutoLoop = body.animationAutoLoop;
	if (body.animationAutoPlay !== undefined) patches.animationAutoPlay = body.animationAutoPlay;
	if (body.chartCurve !== undefined) patches.chartCurve = body.chartCurve;
	if (body.chartBorderWidth !== undefined) patches.chartBorderWidth = body.chartBorderWidth;
	if (body.chartBorderColour !== undefined) patches.chartBorderColour = body.chartBorderColour;
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
 * DELETE /api/stratify/charts/:id — delete a chart (owner or superadmin).
 * @type {import('./$types').RequestHandler}
 */
export async function DELETE({ request, params }) {
	const auth = await verifyAdmin(request);
	if (!auth.isAdmin) {
		return json({ error: 'Unauthorised' }, { status: auth.authenticated ? 403 : 401 });
	}

	const client = createCmsClient();

	const existing = await client.fetch(
		`*[_type == "stratifyChart" && _id == $id][0]{ _id, userId }`,
		{ id: params.id }
	);

	if (!existing) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	if (existing.userId !== auth.userId && !auth.isSuperAdmin) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	await client.delete(params.id);

	return json({ deleted: true });
}
