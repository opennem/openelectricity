import { sveltekit } from '@sveltejs/kit/vite';
import { sveltekitSprite } from 'sveltekit-sprite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit(), sveltekitSprite({ injectLabel: '%vite.plugin.sprite%' })]
});
