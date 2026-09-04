import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadXlsx, excelDateSerial } from './download-xlsx.js';

const writeExcelFile = vi.fn(() => ({ toBlob: async () => new Blob(['xlsx']) }));
vi.mock('write-excel-file/universal', () => ({ default: writeExcelFile }));

describe('excelDateSerial', () => {
	it('converts an instant to an Excel serial in network wall time', () => {
		// 1970-01-01T00:00Z is serial 25569; the network offset shifts it into wall time.
		expect(excelDateSerial(0, '+10:00')).toBeCloseTo(25569 + 10 / 24, 9);
		expect(excelDateSerial(0, '+08:00')).toBeCloseTo(25569 + 8 / 24, 9);
		// 2026-07-01T04:30Z = 14:30 AEST
		expect(excelDateSerial(Date.UTC(2026, 6, 1, 4, 30), '+10:00')).toBeCloseTo(
			46204 + 14.5 / 24,
			9
		);
	});
});

describe('downloadXlsx', () => {
	/** @type {any} */
	let anchor;
	/** @type {string[]} */
	let revoked;

	beforeEach(() => {
		writeExcelFile.mockClear();
		anchor = { click: vi.fn() };
		revoked = [];
		vi.stubGlobal('document', { createElement: vi.fn(() => anchor) });
		vi.stubGlobal('URL', {
			createObjectURL: vi.fn(() => 'blob:xlsx'),
			revokeObjectURL: vi.fn((/** @type {string} */ url) => revoked.push(url))
		});
	});

	it('hands the sheets to the writer and saves the blob under the given name', async () => {
		const sheets = [{ sheet: 'Summary', data: [[{ value: 'Region', type: String }]] }];
		await downloadXlsx(sheets, 'tracker.xlsx');
		expect(writeExcelFile).toHaveBeenCalledWith(sheets);
		expect(anchor.href).toBe('blob:xlsx');
		expect(anchor.download).toBe('tracker.xlsx');
		expect(anchor.click).toHaveBeenCalledOnce();
		expect(revoked).toEqual(['blob:xlsx']);
	});
});
