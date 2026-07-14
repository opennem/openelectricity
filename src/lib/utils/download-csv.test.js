import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadCsv, escapeCsv } from './download-csv.js';

describe('escapeCsv', () => {
	it('returns an empty string for null and undefined', () => {
		expect(escapeCsv(null)).toBe('');
		expect(escapeCsv(undefined)).toBe('');
	});

	it('stringifies plain values without quoting', () => {
		expect(escapeCsv('Bango')).toBe('Bango');
		expect(escapeCsv(42)).toBe('42');
		expect(escapeCsv(0)).toBe('0');
	});

	it('quotes values containing commas or newlines', () => {
		expect(escapeCsv('Bango, NSW')).toBe('"Bango, NSW"');
		expect(escapeCsv('line1\nline2')).toBe('"line1\nline2"');
	});

	it('doubles embedded quotes and wraps the value', () => {
		expect(escapeCsv('the "big" battery')).toBe('"the ""big"" battery"');
	});
});

describe('downloadCsv', () => {
	let mockClick;
	let createdAnchor;
	let revokedUrls;

	beforeEach(() => {
		mockClick = vi.fn();
		revokedUrls = [];
		createdAnchor = {};

		vi.stubGlobal('document', {
			createElement: vi.fn(() => {
				createdAnchor = { click: mockClick };
				return createdAnchor;
			})
		});

		vi.stubGlobal(
			'Blob',
			class MockBlob {
				constructor(/** @type {any[]} */ parts, /** @type {any} */ options) {
					this.parts = parts;
					this.options = options;
				}
			}
		);

		vi.stubGlobal('URL', {
			createObjectURL: vi.fn(() => 'blob:mock-url'),
			revokeObjectURL: vi.fn((url) => revokedUrls.push(url))
		});
	});

	it('creates a blob with the CSV data and passes it to createObjectURL', () => {
		downloadCsv('a,b,c', 'test.csv');
		expect(URL.createObjectURL).toHaveBeenCalledOnce();
		const blob = /** @type {any} */ (URL.createObjectURL).mock.calls[0][0];
		expect(blob.parts).toEqual(['a,b,c']);
		expect(blob.options).toEqual({ type: 'text/plain' });
	});

	it('sets href and download on the anchor element', () => {
		downloadCsv('data', 'report.csv');
		expect(createdAnchor.href).toBe('blob:mock-url');
		expect(createdAnchor.download).toBe('report.csv');
	});

	it('clicks the anchor to trigger the download', () => {
		downloadCsv('data', 'file.csv');
		expect(mockClick).toHaveBeenCalledOnce();
	});

	it('revokes the object URL after clicking', () => {
		downloadCsv('data', 'file.csv');
		expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
		// revokeObjectURL should be called after click
		const clickOrder = mockClick.mock.invocationCallOrder[0];
		const revokeOrder = /** @type {any} */ (URL.revokeObjectURL).mock.invocationCallOrder[0];
		expect(revokeOrder).toBeGreaterThan(clickOrder);
	});
});
