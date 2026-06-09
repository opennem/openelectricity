import { networkRegionsOnly } from '../page-data-options/filters.js';
import { buildRecordsFeed, FEED_SIZE } from './feed.js';

export async function GET({ fetch, url, setHeaders }) {
	// Mirror the /records page: one call for network-wide (NEM/WEM) records and
	// one for per-region records, since the API can't return both at once.
	const [networkRes, regionRes] = await Promise.all([
		fetch(`/api/records?page=1&pageSize=${FEED_SIZE}`),
		fetch(`/api/records?page=1&pageSize=${FEED_SIZE}&regions=${networkRegionsOnly.join(',')}`)
	]);

	const networkJson = networkRes.ok ? await networkRes.json() : { data: [] };
	const regionJson = regionRes.ok ? await regionRes.json() : { data: [] };

	const records = [...(networkJson.data || []), ...(regionJson.data || [])];

	setHeaders({
		'content-type': 'application/rss+xml; charset=utf-8',
		'cache-control': 'public, max-age=300'
	});

	return new Response(buildRecordsFeed({ records, origin: url.origin }));
}
