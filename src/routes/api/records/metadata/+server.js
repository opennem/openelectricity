import { PUBLIC_RECORDS_API } from '$env/static/public';

/**
 * Proxies the records/milestones metadata endpoint.
 *
 * Returns a JSON object with:
 * - aggregates: ['low', 'high']
 * - milestone_type: ['power', 'energy', 'demand', 'price', 'market_value', 'emissions', 'renewable_proportion']
 * - periods: ['interval', 'day', 'week', '7d', 'month', 'quarter', 'season', 'year', 'financial_year']
 * - units: definitions with label, unit string, and output_format for each milestone type
 * - fueltechs: available fuel technologies
 * - networks: NEM and WEM with timezone, interval config, subnetworks, and regions
 *
 * TODO: Use this to dynamically populate filters on the Records page
 */
export function GET({ fetch }) {
	const path = `${PUBLIC_RECORDS_API}/metadata`;

	return fetch(path);
}
