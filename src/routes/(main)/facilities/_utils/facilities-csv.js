const CSV_HEADERS = [
	'facility_code',
	'facility_name',
	'network_id',
	'network_region',
	'latitude',
	'longitude',
	'unit_code',
	'unit_code_display',
	'fueltech_id',
	'status_id',
	'capacity_registered',
	'capacity_maximum',
	'capacity_storage',
	'max_generation',
	'registered_date',
	'expected_closure_date',
	'data_first_seen',
	'data_last_seen'
];

/**
 * Escape a value for CSV output.
 * Wraps in double quotes if the value contains a comma, quote, or newline.
 * @param {*} value
 * @returns {string}
 */
function escapeCsv(value) {
	if (value == null) return '';
	const str = String(value);
	if (str.includes(',') || str.includes('"') || str.includes('\n')) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

/**
 * Convert filtered facilities array to a CSV string.
 * Produces one row per unit, flattened from each facility.
 * @param {any[]} facilities
 * @returns {string}
 */
export function facilitiesToCsv(facilities) {
	const rows = [CSV_HEADERS.join(',')];

	for (const facility of facilities) {
		if (!facility.units || facility.units.length === 0) continue;

		const lat = facility.location?.lat ?? '';
		const lng = facility.location?.lng ?? '';

		for (const unit of facility.units) {
			const row = [
				escapeCsv(facility.code),
				escapeCsv(facility.name),
				escapeCsv(facility.network_id),
				escapeCsv(facility.network_region),
				escapeCsv(lat),
				escapeCsv(lng),
				escapeCsv(unit.code),
				escapeCsv(unit.code_display),
				escapeCsv(unit.fueltech_id),
				escapeCsv(unit.status_id),
				escapeCsv(unit.capacity_registered),
				escapeCsv(unit.capacity_maximum),
				escapeCsv(unit.capacity_storage),
				escapeCsv(unit.max_generation),
				escapeCsv(unit.registered_date),
				escapeCsv(unit.expected_closure_date),
				escapeCsv(unit.data_first_seen),
				escapeCsv(unit.data_last_seen)
			];
			rows.push(row.join(','));
		}
	}

	return rows.join('\n');
}
