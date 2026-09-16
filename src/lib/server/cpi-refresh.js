import {
	ABS_CPI_SOURCE,
	CPI_KV_KEY,
	assertCpiCoverage,
	parseAbsCpi,
	validateCpiSnapshot
} from '../comparison-cpi.js';

/** Small, bounded JSON responses only. Reject upstream error pages and oversized data.
 * @param {Response} response */
async function readJson(response) {
	if (!response.ok) throw new Error(`CPI request failed (${response.status})`);
	const reader = response.body?.getReader();
	if (!reader) throw new Error('Empty CPI response');
	const chunks = [];
	let size = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > 2_000_000) throw new Error('CPI response exceeds size limit');
			chunks.push(value);
		}
	} finally {
		await reader.cancel();
	}
	return JSON.parse(await new Blob(chunks).text());
}

/** Only the GitHub job uses the Cloudflare REST API. The website uses a KV binding.
 * @param {{baseline: import('../comparison-cpi.js').CpiSnapshot, publish?: boolean, accountId?: string, namespaceId?: string, token?: string, fetcher?: typeof fetch, now?: number}} options */
export async function refreshCpi({
	baseline,
	publish = false,
	accountId,
	namespaceId,
	token,
	fetcher = fetch,
	now = Date.now()
}) {
	validateCpiSnapshot(baseline, now);
	const next = parseAbsCpi(
		await readJson(
			await fetcher(ABS_CPI_SOURCE, {
				headers: { accept: 'application/vnd.sdmx.data+json' },
				signal: AbortSignal.timeout(30_000)
			})
		),
		now
	);
	assertCpiCoverage(next, baseline);
	if (!publish) return { snapshot: next, published: false, changed: true };
	if (
		!/^[a-f0-9]{32}$/.test(accountId ?? '') ||
		!/^[a-f0-9]{32}$/.test(namespaceId ?? '') ||
		!token
	) {
		throw new Error(
			'Publishing requires CLOUDFLARE_ACCOUNT_ID, CPI_KV_NAMESPACE_ID and CPI_CLOUDFLARE_API_TOKEN'
		);
	}
	const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${CPI_KV_KEY}`;
	const headers = { authorization: `Bearer ${token}` };
	const response = await fetcher(url, { headers, signal: AbortSignal.timeout(30_000) });
	if (response.status !== 404) {
		const previous = validateCpiSnapshot(await readJson(response), now);
		assertCpiCoverage(next, previous);
		if (
			next.basePeriod === previous.basePeriod &&
			JSON.stringify(next.observations) === JSON.stringify(previous.observations)
		) {
			return { snapshot: previous, published: false, changed: false };
		}
	}
	const result = await readJson(
		await fetcher(url, {
			method: 'PUT',
			headers: { ...headers, 'content-type': 'application/json' },
			body: JSON.stringify(next),
			signal: AbortSignal.timeout(30_000)
		})
	);
	if (result.success !== true) throw new Error('Cloudflare rejected the CPI update');
	return { snapshot: next, published: true, changed: true };
}
