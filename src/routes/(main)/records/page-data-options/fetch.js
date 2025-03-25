import { parseISO } from 'date-fns';
import {
	aggregateOptions,
	periodOptions,
	fuelTechOptions,
	milestoneTypeOptions,
	networkRegionsOnly
} from './filters.js';

/**
 * @param {{
 * regions: string[],
 * periods: string[],
 * fuelTechs: string[],
 * stringFilter: string,
 * aggregates: string[],
 * milestoneTypes: string[],
 * significance: number
 * }} param0
 */
function getFilterParams({
	regions,
	periods,
	fuelTechs,
	stringFilter,
	aggregates,
	milestoneTypes,
	significance
}) {
	const validRegions = regions.filter((r) => r !== '_all');

	const regionsParam =
		regions.length === 0 || regions.length === 8 ? '' : '&regions=' + validRegions.join(',');

	const periodsParam =
		periods.length === periodOptions.length ? '' : '&periods=' + periods.join(',');

	const aggregatesParam =
		aggregates.length === aggregateOptions.length ? '' : '&aggregates=' + aggregates.join(',');

	const milestoneTypesParam =
		milestoneTypes.length === milestoneTypeOptions.length
			? ''
			: '&milestone_types=' + milestoneTypes.join(',');

	const fuelTechParams =
		fuelTechs.length === fuelTechOptions.length ? '' : '&fuelTechs=' + fuelTechs.join(',');

	const recordIdSearchParam = stringFilter
		? `&recordIdFilter=${encodeURIComponent(stringFilter.trim())}`
		: '';

	const significanceParam = significance ? `&significance=${significance}` : '';

	return {
		regionsParam,
		periodsParam,
		recordIdSearchParam,
		fuelTechParams,
		aggregatesParam,
		milestoneTypesParam,
		significanceParam
	};
}

/**
 *
 * @param {*} page
 * @param {*} regions
 * @param {*} periods
 * @param {*} fuelTechs
 * @param {*} aggregates
 * @param {*} milestoneTypes
 * @param {*} significance
 * @param {*} stringFilter
 * @param {*} pageSize
 */
async function fetchRecords(
	page,
	regions,
	periods,
	fuelTechs,
	aggregates,
	milestoneTypes,
	significance,
	stringFilter,
	pageSize
) {
	let errorMessage = '';
	let recordsData = [];
	let totalRecords = 0;

	const {
		regionsParam,
		periodsParam,
		recordIdSearchParam,
		fuelTechParams,
		aggregatesParam,
		milestoneTypesParam,
		significanceParam
	} = getFilterParams({
		regions,
		periods,
		stringFilter,
		fuelTechs,
		aggregates,
		milestoneTypes,
		significance
	});

	const res = await fetch(
		`/api/records?page=${page}&pageSize=${pageSize}${regionsParam}${periodsParam}${recordIdSearchParam}${fuelTechParams}${aggregatesParam}${milestoneTypesParam}${significanceParam}`
	);
	let res2 = null;
	let jsonData2 = null;

	if (networkRegionsOnly.some((d) => regions.includes(d))) {
		if (regions.includes('nem') || regions.includes('wem')) {
			// WORKAROUND: if the regions contain both network and regions,
			// then need to make another call to fetch network data as the api query can't return both network and region data
			let networks = regions.filter((r) => r === 'nem' || r === 'wem');
			let networkParams = `&regions=${networks.join(',')}`;
			res2 = await fetch(
				`/api/records?page=${page}&pageSize=${pageSize}${networkParams}${periodsParam}${recordIdSearchParam}${fuelTechParams}${aggregatesParam}${milestoneTypesParam}${significanceParam}`
			);
		}
	} else if (regions.length === 0) {
		// WORKAROUND: if no regions are selected, then we need to make another call to fetch region records
		let allRegionsParams = `&regions=${networkRegionsOnly.join(',')}`;
		res2 = await fetch(
			`/api/records?page=${page}&pageSize=${pageSize}${allRegionsParams}${periodsParam}${recordIdSearchParam}${fuelTechParams}${aggregatesParam}${milestoneTypesParam}${significanceParam}`
		);
	}

	const jsonData = await res.json();
	if (res2) {
		jsonData2 = await res2.json();
	}

	if (jsonData.success) {
		errorMessage = '';
		recordsData = jsonData.data.map((d) => {
			const isWem = d.network_id === 'WEM';
			const timeZone = isWem ? '+08:00' : '+10:00';
			const parsedInterval = parseISO(d.interval);
			return {
				...d,
				date: parsedInterval,
				time: parsedInterval.getTime(),
				timeZone
			};
		});

		if (jsonData2) {
			recordsData = [
				...recordsData,
				...jsonData2.data.map((d) => {
					const isWem = d.network_id === 'WEM';
					const timeZone = isWem ? '+08:00' : '+10:00';
					const parsedInterval = parseISO(d.interval);
					return {
						...d,
						date: parsedInterval,
						time: parsedInterval.getTime(),
						timeZone
					};
				})
			];

			// sort recordsData by date descending
			recordsData.sort((a, b) => b.date.getTime() - a.date.getTime());
		}

		totalRecords = jsonData.total_records;
	} else {
		errorMessage = jsonData.error;
	}

	return {
		errorMessage,
		recordsData,
		totalRecords
	};
}

export default fetchRecords;
