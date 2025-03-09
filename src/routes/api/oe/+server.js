import { error } from '@sveltejs/kit';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';

export async function GET({ url, setHeaders }) {
	// setHeaders({
	// 	Authorization: `Bearer ${PUBLIC_OE_API_KEY}`
	// });
	// let client = new OpenElectricityClient({
	// 	apiKey: PUBLIC_OE_API_KEY,
	// 	baseUrl: PUBLIC_OE_API_URL
	// });
	// let res = await client.getNetworkData('NEM', ['energy'], {
	// 	interval: '1h',
	// 	dateStart: '2024-01-01T00:00:00',
	// 	dateEnd: '2024-01-02T00:00:00',
	// 	primaryGrouping: 'network_region'
	// });
	// console.log('res', res);
	// let data = await client.getNetworkData('NEM', ['energy'], {
	// 	interval: '5m',
	// 	dateStart: '2024-01-01T00:00:00',
	// 	dateEnd: '2024-01-02T00:00:00',
	// 	primaryGrouping: 'network_region',
	// 	secondaryGrouping: 'fueltech_group'
	// });
	// console.log('data', data);
	// return Response.json(data);
	// const { searchParams } = url;
	// let region = searchParams.get('region') || 'NEM';
	// let interval = searchParams.get('interval');
	// let dateStart = searchParams.get('date_start');
	// let dateEnd = searchParams.get('date_end');
	// let primaryGrouping = searchParams.get('primary_grouping');
	// let secondaryGrouping = searchParams.get('secondary_grouping');
	// const queryParams = new URLSearchParams();
	// if (interval) queryParams.set('interval', interval);
	// if (dateStart) queryParams.set('date_start', dateStart);
	// if (dateEnd) queryParams.set('date_end', dateEnd);
	// if (primaryGrouping) queryParams.set('primary_grouping', primaryGrouping);
	// if (secondaryGrouping) queryParams.set('secondary_grouping', secondaryGrouping);
	// const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
	// //https://api.oedev.org/data/network/NEM/power?interval=5m&primary_grouping=network_region
	// const dataPath = `${PUBLIC_OE_API_URL}/data/network/${region}/power${query}`;
	// console.log('/api/oe/', dataPath);
	// const res = await fetch(dataPath);
	// const json = await res.json();
	// return Response.json(json.data);
	// return new Response(JSON.stringify(energyData));
}
