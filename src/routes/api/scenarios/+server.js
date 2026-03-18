import { error } from '@sveltejs/kit';
import { modelPaths } from '../../(main)/scenarios/page-data-options/models';
import { filterScenarioData, normaliseEmissions } from './utils';

/** @type {Map<string, any>} */
const fileCache = new Map();

export async function GET({ setHeaders, url, fetch }) {
	const { searchParams } = url;
	const name = searchParams.get('name') || '';
	const scenario = searchParams.get('scenario') || '';
	const pathway = searchParams.get('pathway') || '';
	const region = searchParams.get('region') || '';
	const dataType = searchParams.get('dataType') || '';

	const basePath = modelPaths[name];
	if (!basePath) {
		error(404, 'Invalid model name');
	}

	const cacheKey = `${name}/${scenario}`;
	let jsonData = fileCache.get(cacheKey);

	if (!jsonData) {
		const dataPath = `${basePath}/${scenario}.json`;
		const res = await fetch(dataPath);

		if (!res.ok) {
			error(404, 'Not found');
		}

		jsonData = await res.json();
		fileCache.set(cacheKey, jsonData);
	}

	let filteredData = filterScenarioData(jsonData.data || [], { pathway, region, dataType });
	filteredData = normaliseEmissions(filteredData);

	setHeaders({
		'cache-control': 'public, max-age=86400, s-maxage=604800',
		vary: 'Accept-Encoding'
	});

	return Response.json({
		...jsonData,
		data: filteredData
	});
}
