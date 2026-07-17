import { describe, it, expect, vi } from 'vitest';
import { createManagerStash } from './manager-stash.js';

const stub = () => ({ dispose: vi.fn() });

describe('createManagerStash', () => {
	it('takes a stashed manager exactly once', () => {
		const stash = createManagerStash();
		const m = stub();
		stash.stash('a', m);

		expect(stash.has('a')).toBe(true);
		expect(stash.take('a')).toBe(m);
		expect(stash.has('a')).toBe(false);
		expect(stash.take('a')).toBeUndefined();
		expect(m.dispose).not.toHaveBeenCalled();
	});

	it('disposes the oldest entry beyond the capacity', () => {
		const stash = createManagerStash({ max: 2 });
		const [a, b, c] = [stub(), stub(), stub()];
		stash.stash('a', a);
		stash.stash('b', b);
		stash.stash('c', c);

		expect(a.dispose).toHaveBeenCalledOnce();
		expect(stash.has('a')).toBe(false);
		expect(stash.has('b')).toBe(true);
		expect(stash.has('c')).toBe(true);
	});

	it('re-stashing an existing key refreshes its recency', () => {
		const stash = createManagerStash({ max: 2 });
		const [a, b, c] = [stub(), stub(), stub()];
		stash.stash('a', a);
		stash.stash('b', b);
		// Touch 'a' so 'b' becomes the oldest
		stash.stash('a', a);
		stash.stash('c', c);

		expect(b.dispose).toHaveBeenCalledOnce();
		expect(stash.has('a')).toBe(true);
		expect(a.dispose).not.toHaveBeenCalled();
	});

	it('clear disposes everything', () => {
		const stash = createManagerStash();
		const [a, b] = [stub(), stub()];
		stash.stash('a', a);
		stash.stash('b', b);
		stash.clear();

		expect(a.dispose).toHaveBeenCalledOnce();
		expect(b.dispose).toHaveBeenCalledOnce();
		expect(stash.has('a')).toBe(false);
	});
});
