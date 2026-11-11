import { defineEnvVars } from '@sveltejs/kit/env';

// Public variables and most secrets are static (inlined at build), as they
// were under `$env/static/*`. The two secrets read at runtime stay dynamic;
// unset, they fall back to '' — like the old `undefined`, that fails auth.
export const variables = defineEnvVars({
	ARTICLE_LOGIN: { static: true },
	PUBLIC_JSON_API: { public: true, static: true },
	MAILCHIMP_API_KEY: { static: true },
	MAILCHIMP_LIST_ID: { static: true },
	PUBLIC_RECORDS_API: { public: true, static: true },
	PUBLIC_API_KEY: { public: true, static: true },
	CLOUDFLARE_WORKER_URL: { static: true },
	PUBLIC_JSON_URL: { public: true, static: true },
	PUBLIC_EMBER_BRIDGE_API: { public: true, static: true },
	PUBLIC_SANITY_PROJECT_ID: { public: true, static: true },
	SANITY_CMS_TOKEN: { schema: (input) => input ?? '' },
	PUBLIC_SANITY_DATASET: { public: true, static: true },
	SANITY_TOKEN: { static: true },
	PUBLIC_EXPLORE_URL: { public: true, static: true },
	PUBLIC_FEATURE_FLAGS: { public: true, static: true },
	PUBLIC_OE_API_KEY: { public: true, static: true },
	PUBLIC_OE_API_URL: { public: true, static: true },
	CLERK_SECRET_KEY: { schema: (input) => input ?? '' },
	PUBLIC_CLERK_PUBLISHABLE_KEY: { public: true, static: true }
});
