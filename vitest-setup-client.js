// SvelteKit 3's dev client build of `$app/env/public` reads dynamic public
// variables from the `__sveltekit_dev` global, which only a dev-served page
// defines; Vitest doesn't install it (see the VITEST branch in
// @sveltejs/kit's Vite plugin). All our public variables are static
// (src/env.js), so the dynamic set is empty.
/** @type {any} */ (globalThis).__sveltekit_dev ??= { env: {} };
