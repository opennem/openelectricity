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

	'renewable_proportion.interval': ['renewable proportion'],
	'renewable_proportion.day': ['renewable proportion'],
	'renewable_proportion.7d': ['renewable proportion'],
	'renewable_proportion.month': ['renewable proportion'],
	'renewable_proportion.quarter': ['renewable proportion'],
	'renewable_proportion.year': ['renewable proportion'],
	'renewable_proportion.financial_year': ['renewable proportion'],

	price: ['price'],
	market_value: ['market value'],
	emissions: ['emissions'],
	renewable_proportion: ['renewable proportion']
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
		console.log('Missing record description params:', { period, aggregate, metric, fuelTech });
		return '';
	}

	const ftLabel = fuelTech ? fuelTechLabel[fuelTech]?.toLowerCase() : '';
	const isBattery =
		fuelTech === 'battery' || fuelTech === 'battery_discharging' || fuelTech === 'battery_charging';
	const isPumps = fuelTech === 'pumps';
	const isPrice = metric === 'price';
	const isMarketValue = metric === 'market_value';
	const isEmissions = metric === 'emissions';
	const isRenewableProportion = metric === 'renewable_proportion';
	const periodAggregate = periodAggregateMap[`${period}.${aggregate}`];
	const metricPeriod = metricPeriodMap[`${metric}.${period}`] || metricPeriodMap[metric];

	if (!periodAggregate || !metricPeriod) {
		console.log('Unhandled record description combination:', { period, aggregate, metric, fuelTech });
		// Fallback: construct a basic description from the raw values
		const aggLabel = aggregate === 'high' ? 'Highest' : aggregate === 'low' ? 'Lowest' : aggregate;
		const label = ftLabel || fuelTech || '';
		return `${aggLabel} ${label} ${metric || ''}`.trim();
	}

	if (period === 'interval') {
		if (!fuelTech && metric === 'power') {
			return `${periodAggregate[0]} ${metricPeriod[0]} ${metric}`;
		}

		if (isBattery) {
			return `${periodAggregate[0]} ${ftLabel}`;
		}

		if (isPumps) {
			return `${periodAggregate[0]} pumped-storage`;
		}

		if (isPrice || isMarketValue || isEmissions || isRenewableProportion) {
			return `${periodAggregate[0]} ${metricPeriod[0]}`;
		}

		return `${periodAggregate[0]} ${ftLabel} ${metricPeriod[0]}`;
	}

	if (isPumps) {
		return `${periodAggregate[0]} pumped-storage ${periodAggregate[1]}`;
	}

	if (isBattery) {
		if (metric === 'power') {
			return `${periodAggregate[0]} ${metricPeriod[0]} ${ftLabel}`;
		}

		return `${periodAggregate[0]} ${ftLabel} ${periodAggregate[1]}`;
	}

	if (isPrice || isMarketValue || isEmissions || isRenewableProportion) {
		return `${periodAggregate[0]} ${metricPeriod[0]} ${periodAggregate[1]}`;
	}

	if (metric === 'power') {
		return `${periodAggregate[0]} ${metricPeriod[0]} ${ftLabel} ${metricPeriod[1] || ''}`;
	}

	return `${periodAggregate[0]} ${ftLabel} ${metricPeriod[0]} ${periodAggregate[1] || ''}`;
}
