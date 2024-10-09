import { parseISO } from 'date-fns';
import {
	aggregateOptions,
	periodOptions,
	fuelTechOptions,
	milestoneTypeOptions
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
	const jsonData = await res.json();

	if (jsonData.success) {
		errorMessage = '';
		recordsData = jsonData.data.map((d) => {
			const parsedInterval = parseISO(d.interval);
			return {
				...d,
				date: parsedInterval,
				time: parsedInterval.getTime()
			};
		});
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
