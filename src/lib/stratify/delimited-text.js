/**
 * Detect the delimiter used in CSV-like text.
 * Tabs take precedence for spreadsheet pastes, followed by commas and semicolons.
 * @param {string} text
 * @returns {'\t' | ',' | ';'}
 */
export function detectDelimiter(text) {
	const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
	if (firstLine.includes('\t')) return '\t';
	if (firstLine.includes(',')) return ',';
	if (firstLine.includes(';')) return ';';
	return ',';
}

/**
 * Parse one delimited row, including quoted values and escaped quotes.
 * @param {string} line
 * @param {string} delimiter
 * @returns {string[]}
 */
export function parseDelimitedRow(line, delimiter) {
	/** @type {string[]} */
	const cells = [];
	let cell = '';
	let quoted = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if (char === '"') {
			if (quoted && line[i + 1] === '"') {
				cell += '"';
				i++;
			} else {
				quoted = !quoted;
			}
		} else if (char === delimiter && !quoted) {
			cells.push(cell.trim());
			cell = '';
		} else {
			cell += char;
		}
	}

	cells.push(cell.trim());
	return cells;
}

/**
 * Replace one cell in delimited text while preserving its line-ending style.
 * This is used by editable parsed-table cells; reparsing remains the concern
 * of the owning project state.
 * @param {string} text
 * @param {number} lineIndex
 * @param {number} columnIndex
 * @param {string} value
 * @returns {string}
 */
export function updateDelimitedCell(text, lineIndex, columnIndex, value) {
	const newline = text.includes('\r\n') ? '\r\n' : '\n';
	const lines = text.split(/\r?\n/);
	if (lineIndex < 0 || lineIndex >= lines.length || columnIndex < 0) return text;

	const delimiter = detectDelimiter(text);
	const cells = lines[lineIndex].split(delimiter);
	while (cells.length <= columnIndex) cells.push('');
	cells[columnIndex] = value;
	lines[lineIndex] = cells.join(delimiter);
	return lines.join(newline);
}
