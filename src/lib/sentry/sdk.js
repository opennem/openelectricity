/**
 * The parts of the Sentry browser SDK every page uses once Sentry starts.
 * Named re-exports (rather than the whole namespace) let the bundler drop
 * the integrations we never use; the feedback form is a separate chunk
 * (`./feedback-sdk.js`), loaded only when it is first opened.
 */
export {
	addIntegration,
	captureException,
	getClient,
	init,
	replayIntegration
} from '@sentry/browser';
