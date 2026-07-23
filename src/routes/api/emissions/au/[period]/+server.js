import { error } from '@sveltejs/kit';
import { getEmissions } from '$lib/server/emissions';

/**
 * National (Australia-wide) emissions by sector, recreating the legacy
 * opennem-edge-data endpoints. `period` is `quarter` or `year`.
 *
 * Response shape: the dataset's metadata (`id`, `source`, `prefix`, and — for
 * `year` — `projectionStartYear`) spread over a `data` array of CSV rows.
 */
export function GET({ params, setHeaders }) {
	const result = getEmissions(params.period);
	if (!result) {
		error(404, `Unknown emissions period: ${params.period}`);
	}

	setHeaders({
		'Cache-Control': 'public, max-age=3600, s-maxage=86400',
		'Access-Control-Allow-Origin': '*' // consumed cross-origin by opennem-fe
	});
	return Response.json(result);
}
