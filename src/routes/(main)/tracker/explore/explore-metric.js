import { loadFuelTechs } from '$lib/fuel_techs';
import { getGroup } from '$lib/components/charts/network/groups.js';
import {
	averagePower,
	meanSeries,
	pairedShare,
	sumAsEnergy
} from '$lib/components/charts/network/network-metrics-calc.js';

const fmt0 = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 0 });
const fmt1 = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 1 });
/** @param {unknown} value @returns {value is number} */
const finite = (value) => typeof value === 'number' && Number.isFinite(value);

/** @param {number} value */
function energy(value) {
	if (Math.abs(value) >= 1_000_000) return { value: fmt1.format(value / 1_000_000), unit: 'TWh' };
	if (Math.abs(value) >= 1_000) return { value: fmt1.format(value / 1_000), unit: 'GWh' };
	return { value: fmt0.format(value), unit: 'MWh' };
}

/** @param {number} value */
function money(value) {
	if (Math.abs(value) >= 1_000_000_000)
		return { value: fmt1.format(value / 1_000_000_000), unit: '$b' };
	if (Math.abs(value) >= 1_000_000) return { value: fmt1.format(value / 1_000_000), unit: '$m' };
	return { value: fmt0.format(value), unit: '$' };
}

/** @param {number} value */
function emissions(value) {
	if (Math.abs(value) >= 1_000_000)
		return { value: fmt1.format(value / 1_000_000), unit: 'MtCO₂e' };
	if (Math.abs(value) >= 1_000) return { value: fmt1.format(value / 1_000), unit: 'ktCO₂e' };
	return { value: fmt0.format(value), unit: 'tCO₂e' };
}

/** @param {any[]} rows @param {string[]} keys */
function sumValues(rows, keys) {
	let total = 0;
	for (const row of rows) {
		for (const key of keys) if (finite(row[key])) total += row[key];
	}
	return total;
}

/** @param {any[]} rows @param {string[]} keys */
function meanTotal(rows, keys) {
	const totals = rows
		.map((row) => keys.reduce((sum, key) => sum + (finite(row[key]) ? row[key] : 0), 0))
		.filter(finite);
	return totals.length ? totals.reduce((sum, value) => sum + value, 0) / totals.length : null;
}

/**
 * Reduce a chart's range-filtered rows into one purposeful headline metric.
 * @param {string} recipeId
 * @param {any} config
 * @param {{data:any[],seriesNames:string[]}|null} payload
 * @param {'power'|'energy'} basis
 * @param {string[]} [excludedSeries]
 */
export function computeExploreMetric(recipeId, config, payload, basis, excludedSeries = []) {
	const rows = payload?.data ?? [];
	const excluded = new Set(excludedSeries);
	const names = (payload?.seriesNames ?? []).filter((name) => !excluded.has(name));
	if (!rows.length || !names.length) return null;

	if (recipeId === 'generation') {
		const loadGroups = Object.entries(getGroup(config.group ?? 'simple').fuelTechs)
			.filter(
				([, members]) => members.length && members.every((member) => loadFuelTechs.includes(member))
			)
			.map(([id]) => id);
		const sources = names.filter(
			(name) => !loadFuelTechs.includes(name) && !loadGroups.includes(name) && name !== 'imports'
		);
		return { label: 'Total generation', ...energy(sumAsEnergy(rows, sources, basis)) };
	}
	if (recipeId === 'facility') {
		return { label: 'Net facility output', ...energy(sumAsEnergy(rows, names, basis)) };
	}
	if (recipeId === 'demand') {
		const value = averagePower(rows, names[0], basis);
		return value == null
			? null
			: {
					label: `Average ${config.demand === 'gross' ? 'gross ' : ''}demand`,
					value: fmt0.format(value),
					unit: 'MW'
				};
	}
	if (recipeId === 'price') {
		const value = meanSeries(rows, names[0]);
		return value == null
			? null
			: { label: 'Average spot price', value: fmt1.format(value), unit: '$/MWh' };
	}
	if (recipeId === 'emissions') {
		if (config.emissionsMode === 'intensity') {
			const value =
				names.includes('emissions') && names.includes('energy_mwh')
					? (() => {
							const energyMWh = sumValues(rows, ['energy_mwh']);
							return energyMWh > 0 ? (sumValues(rows, ['emissions']) * 1000) / energyMWh : null;
						})()
					: meanTotal(rows, names);
			return value == null
				? null
				: { label: 'Average emissions intensity', value: fmt0.format(value), unit: 'kgCO₂e/MWh' };
		}
		return { label: 'Total emissions', ...emissions(sumValues(rows, names)) };
	}
	if (recipeId === 'market-value') {
		return { label: 'Total market value', ...money(sumValues(rows, names)) };
	}
	if (recipeId === 'renewables') {
		if (config.renewableMeasure === 'share') {
			const result = pairedShare(rows, 'renewable_generation', 'demand_gross');
			return result.pct == null
				? null
				: {
						label: 'Renewable share',
						value: fmt1.format(result.pct),
						unit: '%',
						subtitle: 'Share of gross demand'
					};
		}
		return { label: 'Renewable generation', ...energy(sumAsEnergy(rows, names, basis)) };
	}
	if (recipeId === 'curtailment') {
		return { label: 'Total curtailed energy', ...energy(sumAsEnergy(rows, names, basis)) };
	}
	if (recipeId === 'flows') {
		const net = sumAsEnergy(rows, names, basis);
		return { label: net < 0 ? 'Net exports' : 'Net imports', ...energy(Math.abs(net)) };
	}
	return null;
}
