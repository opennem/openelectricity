import { parseQuarterlyCSV, parseProjectionsCSV } from './helpers/csv-parser.js';

/**
 * Load emissions data from CSV files
 * @type {import('./$types').PageLoad}
 */
export async function load({ fetch }) {
	const [quarterlyRes, projectionsRes] = await Promise.all([
		fetch('/studio/lens-on-emissions/data/nggi-emissions-2004-2025-quarterly.csv'),
		fetch('/studio/lens-on-emissions/data/au-2025-emissions-projections-fig-5.csv')
	]);

	if (!quarterlyRes.ok) {
		console.error('Failed to load quarterly emissions data:', quarterlyRes.status);
	}
	if (!projectionsRes.ok) {
		console.error('Failed to load projections emissions data:', projectionsRes.status);
	}

	const quarterlyText = await quarterlyRes.text();
	const projectionsText = await projectionsRes.text();

	const quarterlyData = parseQuarterlyCSV(quarterlyText);
	const projectionsData = parseProjectionsCSV(projectionsText);

	return {
		quarterlyData,
		projectionsData
	};
}
