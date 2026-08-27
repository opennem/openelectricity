import { describe, expect, it } from 'vitest';
import { EDGE_MAX_AGE_MS, freshnessDeadlines, freshnessStatus } from './freshness.js';

const FRESH_MS = 5 * 60 * 1000;

describe('freshnessStatus', () => {
	it('is fresh up to and including the freshness period', () => {
		const storedAt = 1_000_000;
		expect(freshnessStatus({ storedAt, freshMs: FRESH_MS }, storedAt)).toBe('fresh');
		expect(freshnessStatus({ storedAt, freshMs: FRESH_MS }, storedAt + FRESH_MS)).toBe('fresh');
	});

	it('turns stale one millisecond past the freshness period', () => {
		const storedAt = 1_000_000;
		expect(freshnessStatus({ storedAt, freshMs: FRESH_MS }, storedAt + FRESH_MS + 1)).toBe('stale');
	});

	it('stays stale up to the edge retention limit, then expires', () => {
		const storedAt = 1_000_000;
		expect(freshnessStatus({ storedAt, freshMs: FRESH_MS }, storedAt + EDGE_MAX_AGE_MS)).toBe(
			'stale'
		);
		expect(freshnessStatus({ storedAt, freshMs: FRESH_MS }, storedAt + EDGE_MAX_AGE_MS + 1)).toBe(
			'expired'
		);
	});

	it('treats a zero stored-at (missing header) as expired', () => {
		expect(freshnessStatus({ storedAt: 0, freshMs: FRESH_MS }, Date.now())).toBe('expired');
	});
});

describe('freshnessDeadlines', () => {
	it('derives the deadlines and age from the storage time', () => {
		const storedAt = 1_000_000;
		const nowMs = storedAt + 60_000;
		expect(freshnessDeadlines({ storedAt, freshMs: FRESH_MS }, nowMs)).toEqual({
			freshUntil: storedAt + FRESH_MS,
			expiresAt: storedAt + EDGE_MAX_AGE_MS,
			ageMs: 60_000
		});
	});
});
