import { fuelTechLabel } from '../page-data-options/filters';

/**
 * @type {Object.<string, string[]>}
 */
export const periodAggregateMap = {
	'interval.high': ['Highest ever'],
	'interval.low': ['Lowest ever'],

	'day.high': ['Highest', 'over a day'],
	'day.low': ['Lowest', 'over a day'],

	'7d.high': ['Highest', 'over a week'],
	'7d.low': ['Lowest', 'over a week'],

	'month.high': ['Highest', 'over a calendar month'],
	'month.low': ['Lowest', 'over a calendar month'],

	'quarter.high': ['Highest', 'over a calendar quarter'],
	'quarter.low': ['Lowest', 'over a calendar quarter'],

	'year.high': ['Highest', 'over a calendar year'],
	'year.low': ['Lowest', 'over a calendar year'],

	'financial_year.high': ['Highest', 'over a financial year'],
	'financial_year.low': ['Lowest', 'over a financial year']
};

/**
 * @type {Object.<string, string[]>}
 */
export const metricPeriodMap = {
	'power.interval': ['generation'],
	'power.day': ['instantaneous', 'generation'],
	'power.7d': ['generation'],
	'power.month': ['generation'],
	'power.quarter': ['generation'],
	'power.year': ['generation'],
	'power.financial_year': ['generation'],

	'energy.interval': ['generation'],
	'energy.day': ['generation'],
	'energy.7d': ['generation'],
	'energy.month': ['generation'],
	'energy.quarter': ['generation'],
	'energy.year': ['generation'],
	'energy.financial_year': ['generation'],

	'proportion.interval': ['proportion of'],
	'proportion.day': ['proportion'],
	'proportion.7d': ['proportion'],
	'proportion.month': ['proportion'],
	'proportion.quarter': ['proportion'],
	'proportion.year': ['proportion'],
	'proportion.financial_year': ['proportion'],

	price: ['price'],
	market_value: ['market value'],
	emissions: ['emissions']
};

/**
 * Generates a description based on fuel technology, period, aggregate, and metric.
 *
 * @param {string} period
 * @param {string} aggregate
 * @param {string} metric
 * @param {string} [fuelTech]
 * @returns {string}
 */
export default function generateDescription(period, aggregate, metric, fuelTech) {
	if (!period || !aggregate || !metric) {
		console.log('One or more required parameters are not defined');
		return '';
	}

	const ftLabel = fuelTech ? fuelTechLabel[fuelTech]?.toLowerCase() : '';
	const isBattery =
		fuelTech === 'battery' || fuelTech === 'battery_discharging' || fuelTech === 'battery_charging';
	const isPrice = metric === 'price';
	const isMarketValue = metric === 'market_value';
	const isEmissions = metric === 'emissions';
	const periodAggregate = periodAggregateMap[`${period}.${aggregate}`] || '';
	const metricPeriod = metricPeriodMap[`${metric}.${period}`] || metricPeriodMap[metric] || '';

	if (!periodAggregate || !metricPeriod) {
		return '';
	}

	if (period === 'interval') {
		if (!fuelTech && metric === 'power') {
			return `${periodAggregate[0]} ${metricPeriod[0]} ${metric}`;
		}

		if (isBattery) {
			return `${periodAggregate[0]} ${ftLabel}`;
		}

		if (isPrice || isMarketValue || isEmissions) {
			return `${periodAggregate[0]} ${metricPeriod[0]}`;
		}

		return `${periodAggregate[0]} ${ftLabel}  ${metricPeriod[0]}`;
	}

	if (isBattery) {
		if (metric === 'power') {
			return `${periodAggregate[0]} ${metricPeriod[0]} ${ftLabel}`;
		}

		return `${periodAggregate[0]} ${ftLabel} ${periodAggregate[1]}`;
	}

	if (metric === 'power') {
		return `${periodAggregate[0]} ${metricPeriod[0]} ${ftLabel} ${metricPeriod[1] || ''}`;
	}

	return `${periodAggregate[0]} ${ftLabel} ${metricPeriod[0]} ${periodAggregate[1] || ''}`;
}
