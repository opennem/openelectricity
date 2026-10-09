import { loadSystemSnapshot } from '$lib/server/system-snapshot.js';

/**
 * Homepage System Snapshot: per-region live and 12-month figures in one
 * response, each mode served from its own SWR cache
 * (`$lib/server/system-snapshot.js`). A mode that fails carries `error` and
 * empty `regions`, so the other still renders.
 */
export async function GET({ platform, setHeaders }) {
	const snapshot = await loadSystemSnapshot(platform);
	if (snapshot.live.error && snapshot.annual.error) {
		return Response.json({ error: 'System snapshot unavailable.' }, { status: 503 });
	}
	// Live figures move with each dispatch interval. A part-failed response
	// isn't kept, so the next view can pick up the recovered mode.
	const partial = snapshot.live.error || snapshot.annual.error;
	setHeaders({ 'cache-control': partial ? 'no-store' : 'public, max-age=300' });
	return Response.json(snapshot);
}
