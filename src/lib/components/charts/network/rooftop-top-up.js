/** A rooftop forecast slot. */
export const HALF_HOUR_MS = 30 * 60_000;

/**
 * Top-up of rooftop solar power from a forecast. Rooftop
 * readings arrive up to half an hour after the other fuel techs, so the
 * newest rows lack them and the rooftop band drops away. Each row after the
 * latest reported rooftop value takes the forecast slot covering its time,
 * so the band runs to the latest data time. Never adds rows: nothing is drawn
 * past the newest reading of the other fuel techs.
 *
 * Reads the retained reported component (`_rooftopPower`), so a combined
 * group (e.g. solar = utility + rooftop) gains only its missing rooftop part.
 * Neither the source cache nor its rows are mutated. The chart and its
 * published snapshot (table, metrics, exports) both read the topped-up rows.
 *
 * @template {{data: any[], groupFuelTechs?: Record<string, string[]>}} T
 * @param {T} source
 * @param {Array<{ time: number, value: number }>} forecast - Period-start slots, sorted
 * @returns {T}
 */
export function topUpRooftopPower(source, forecast) {
	if (!forecast.length) return source;
	const group = Object.entries(source.groupFuelTechs ?? {}).find(([, codes]) =>
		codes.includes('solar_rooftop')
	)?.[0];
	if (!group) return source;
	const rows = source.data;

	let last = rows.length - 1;
	while (last >= 0 && !Number.isFinite(rows[last]._rooftopPower)) last--;
	// No reading at all: nothing to continue from.
	if (last < 0 || last === rows.length - 1) return source;

	const output = rows.slice();
	let slot = 0;
	let changed = false;
	for (let index = last + 1; index < rows.length; index++) {
		const row = rows[index];
		while (slot + 1 < forecast.length && forecast[slot + 1].time <= row.time) slot++;
		const covering = forecast[slot];
		// Only the slot whose half-hour covers the row; a gap stays a gap.
		if (!covering || covering.time > row.time || row.time - covering.time >= HALF_HOUR_MS) continue;
		const reported = Number.isFinite(row[group]) ? row[group] : 0;
		output[index] = { ...row, [group]: reported + covering.value };
		changed = true;
	}
	return changed ? { ...source, data: output } : source;
}
