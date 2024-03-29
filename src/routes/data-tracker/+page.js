/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	const dataTrackerData = await fetch('/api/power').then(async (res) => {
		const jsonData = await res.json();
		return jsonData;
	});

	return {
		data: dataTrackerData
	};
}
