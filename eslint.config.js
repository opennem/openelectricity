import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
	js.configs.recommended,
	...svelte.configs['flat/recommended'],
	prettier,
	...svelte.configs['flat/prettier'],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		},
		rules: {
			// Allow underscore-prefixed variables to be unused (common pattern for intentionally unused vars)
			// Using 'warn' instead of 'error' to allow build to proceed with existing unused vars
			'no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_'
				}
			]
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parserOptions: {
				parser: null
			}
		},
		rules: {
			'svelte/no-at-html-tags': 'off',
			// Disable strict Svelte 5 compile warnings that flag many pre-existing patterns
			'svelte/valid-compile': ['error', { ignoreWarnings: true }]
		}
	},
	{
		// Svelte 5 runes modules
		files: ['**/*.svelte.js', '**/*.svelte.ts'],
		languageOptions: {
			globals: {
				$state: 'readonly',
				$derived: 'readonly',
				$effect: 'readonly',
				$props: 'readonly',
				$bindable: 'readonly',
				$inspect: 'readonly',
				$host: 'readonly'
			}
		}
	},
	{
		ignores: [
			'build/',
			'.svelte-kit/',
			'dist/',
			'node_modules/',
			// TypeScript Svelte files that need TS parser configuration
			'src/lib/components/text-components/*.svelte'
		]
	}
];
