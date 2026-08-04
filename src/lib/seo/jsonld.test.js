import { describe, expect, it } from 'vitest';
import { jsonLdToString } from './jsonld.js';

describe('jsonLdToString', () => {
	it('escapes < so content cannot close the script tag, without corrupting the data', () => {
		const jsonLd = { description: 'bad </script><script>alert(1)</script>' };
		const out = jsonLdToString(jsonLd);
		expect(out).not.toContain('</script>');
		expect(out).toContain('\\u003c/script>');
		expect(JSON.parse(out)).toEqual(jsonLd);
	});
});
