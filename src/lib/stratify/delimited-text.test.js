import { describe, expect, it } from 'vitest';
import { detectDelimiter, parseDelimitedRow, updateDelimitedCell } from './delimited-text.js';

describe('detectDelimiter', () => {
	it('prefers tabs for spreadsheet data', () => {
		expect(detectDelimiter('Date\tValue\n2026-01-01\t10')).toBe('\t');
	});

	it('detects comma and semicolon data', () => {
		expect(detectDelimiter('Date,Value\n2026-01-01,10')).toBe(',');
		expect(detectDelimiter('Date;Value\n2026-01-01;10')).toBe(';');
	});
});

describe('parseDelimitedRow', () => {
	it('keeps delimiters and escaped quotes inside quoted cells', () => {
		expect(parseDelimitedRow('Peak,"Newcastle, NSW","A ""quoted"" label"', ',')).toEqual([
			'Peak',
			'Newcastle, NSW',
			'A "quoted" label'
		]);
	});
});

describe('updateDelimitedCell', () => {
	it('updates the requested cell and preserves CRLF line endings', () => {
		const text = 'Date\tValue\r\n2026-01-01\t10';
		expect(updateDelimitedCell(text, 1, 1, '25')).toBe('Date\tValue\r\n2026-01-01\t25');
	});

	it('returns the original text for an invalid row', () => {
		expect(updateDelimitedCell('Date,Value\n2026-01-01,10', 4, 1, '25')).toBe(
			'Date,Value\n2026-01-01,10'
		);
	});
});
