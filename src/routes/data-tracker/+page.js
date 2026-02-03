/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	const tracker7dProcessed = await fetch(
		'/api/tracker/7d-processed?regionPath=au/NEM&interval=30m'
	).then((r) => r.json());

	return {
		tracker7dProcessed
	};
}
