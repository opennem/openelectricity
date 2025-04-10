/**
 * @param {string} dateTime
 * @returns {string}
 */
function dateTimeQuery(dateTime) {
	let offset = dateTime.slice(-6).replaceAll(':', '_');
	let datetime = dateTime.slice(0, -6).replaceAll(':', '_');
	offset = offset[0] === '+' ? offset.slice(1) : offset;
	return `datetime=${datetime}&offset=${offset}`;
}

export default dateTimeQuery;
