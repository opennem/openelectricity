export async function load({ data, url }) {
	const { searchParams } = url;
	const region = searchParams.get('region') || 'x-WRD';
	const range = searchParams.get('range') || 'yearly';
	const interval = searchParams.get('interval') || '1M';

	return {
		...data, // pipe through data from PageServer

		region,
		range: /** @type {RangeType} */ (range),
		interval
	};
}
