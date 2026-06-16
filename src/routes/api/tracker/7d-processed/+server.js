/**
 * 7-Day Tracker API with Server-Side Processing (static OpenNEM JSON source)
 *
 * Fetches the published power/7d.json file and returns pre-processed,
 * chart-ready data. The processing is shared with the OE-API variant
 * (/api/tracker/7d-oe) via `processPower7d`, so the two only differ by source.
 */
import { error } from '@sveltejs/kit';
import { PUBLIC_JSON_API } from '$env/static/public';
import { processPower7d } from '$lib/server/tracker/process-power-7d';

export async function GET({ fetch, url }) {
	const startTime = performance.now();

	const { searchParams } = url;
	const regionPath = searchParams.get('regionPath') || 'au/NEM';
	const targetInterval = searchParams.get('interval') || '30m';

	const res = await fetch(`${PUBLIC_JSON_API}/${regionPath}/power/7d.json`);
	if (!res.ok) {
		error(404, 'Not found');
	}

	const rawData = await res.json();
	const powerData = rawData.data.filter((/** @type {any} */ d) => d.type === 'power');
	if (!powerData.length) {
		error(404, 'No power data found');
	}

	const processed = processPower7d(powerData, { targetInterval });

	return Response.json(
		{
			...processed,
			meta: {
				processingTimeMs: Math.round(performance.now() - startTime),
				dataPoints: processed.data.length,
				interval: targetInterval,
				source: 'json'
			}
		},
		{
			headers: {
				'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
			}
		}
	);
}
