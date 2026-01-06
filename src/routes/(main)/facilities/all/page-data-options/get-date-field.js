/**
 * Get the relevant date field name based on status type
 * @param {'committed' | 'operating' | 'retired'} status
 * @returns {string}
 */
function getDateField(status) {
	switch (status) {
		case 'committed':
			return 'expected_operation_date';
		case 'operating':
			return 'commencement_date';
		case 'retired':
			return 'closure_date';
		default:
			return 'commencement_date';
	}
}

export default getDateField;
