const FIVE_MINUTES = 5 * 60_000;
const HALF_HOUR = 6 * FIVE_MINUTES;

/**
 * Presentation-only interpolation of OE's repeated half-hour rooftop power.
 * Work on the full cached window before slicing so panning does not move the
 * anchors. Only replace a complete, constant six-sample block with a finite
 * next half-hour anchor. Do not fill gaps, extrapolate or smooth genuine 5m
 * variation. Other members of a combined fuel-tech group stay untouched.
 *
 * `_rooftopPower` is the reported component, not a plotted/exported series.
 * Neither the source cache nor its rows are mutated.
 * @template {{data: any[], groupFuelTechs?: Record<string, string[]>}} T
 * @param {T} source
 * @returns {T}
 */
export function interpolateRooftopPower(source) {
	const group = Object.entries(source.groupFuelTechs ?? {}).find(([, codes]) =>
		codes.includes('solar_rooftop')
	)?.[0];
	if (!group) return source;
	const rows = source.data;
	let output = rows;
	for (let index = 0; index + 6 < rows.length; index++) {
		const first = rows[index];
		const next = rows[index + 6];
		const from = first._rooftopPower;
		const to = next._rooftopPower;
		if (
			first.time % HALF_HOUR !== 0 ||
			next.time !== first.time + HALF_HOUR ||
			!Number.isFinite(from) ||
			!Number.isFinite(to) ||
			from < 0 ||
			to < 0 ||
			from === to
		)
			continue;
		let complete = true;
		for (let offset = 0; offset < 6; offset++) {
			const row = rows[index + offset];
			if (
				row.time !== first.time + offset * FIVE_MINUTES ||
				row._rooftopPower !== from ||
				!Number.isFinite(row[group])
			) {
				complete = false;
				break;
			}
		}
		if (!complete) continue;
		if (output === rows) output = rows.slice();
		for (let offset = 1; offset < 6; offset++) {
			const row = rows[index + offset];
			output[index + offset] = {
				...row,
				[group]: row[group] + (to - from) * (offset / 6)
			};
		}
	}
	return output === rows ? source : { ...source, data: output };
}
