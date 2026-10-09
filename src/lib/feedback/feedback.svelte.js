import { browser, version } from '$app/environment';
import { env } from '$env/dynamic/public';
import {
	applyFeedbackContext,
	buildFeedbackContext,
	feedbackEnvironment,
	resolveFeedbackDsn
} from './feedback-context.js';

/**
 * Sentry user feedback, opened from the app's own "Feedback" controls.
 *
 * The Sentry SDK is loaded and initialised only when a reader first opens the
 * form, so pages pay nothing for it until then. It is set up for feedback
 * alone: `defaultIntegrations: false` drops the browser SDK's defaults
 * (global error handlers, sessions, breadcrumbs, console capture, request
 * context), and no tracing or replay integration is added.
 *
 * Off unless `PUBLIC_SENTRY_DSN` and `PUBLIC_FEEDBACK_ENABLED=true` are set.
 * Read in the browser only: `$env/dynamic/public` can't be read while
 * prerendering, and the entry points render after mount anyway.
 */

/** @typedef {'idle' | 'loading' | 'open' | 'error'} FeedbackStatus */
/** @typedef {NonNullable<ReturnType<typeof import('@sentry/browser').getFeedback>>} FeedbackIntegration */
/** @typedef {Awaited<ReturnType<FeedbackIntegration['createForm']>>} FeedbackForm */

/** Form copy (UK English) and look. Name, email and screenshot are optional. */
const FORM_OPTIONS = {
	autoInject: false,
	colorScheme: /** @type {const} */ ('light'),
	showBranding: false,
	showName: true,
	showEmail: true,
	isNameRequired: false,
	isEmailRequired: false,
	enableScreenshot: true,
	// Anonymous by default: never prefill from a Sentry user.
	useSentryUser: { email: '', name: '' },
	themeLight: {
		foreground: '#353535',
		background: '#ffffff',
		accentForeground: '#ffffff',
		accentBackground: '#353535',
		errorColor: '#C74523'
	},
	formTitle: 'Send feedback',
	messageLabel: 'What could we improve?',
	messagePlaceholder: 'Tell us what you were looking at and what you expected to see.',
	nameLabel: 'Name',
	namePlaceholder: 'Your name',
	emailLabel: 'Email',
	emailPlaceholder: 'Your email, if you would like a reply',
	isRequiredLabel: '(required)',
	submitButtonLabel: 'Send feedback',
	cancelButtonLabel: 'Cancel',
	confirmButtonLabel: 'Confirm',
	addScreenshotButtonLabel: 'Add a screenshot',
	removeScreenshotButtonLabel: 'Remove screenshot',
	successMessageText: 'Thanks, your feedback has been sent.',
	errorEmptyMessageText: 'Please write a message before sending.',
	errorNoClientText: 'Feedback is not available right now. Please try again later.',
	errorTimeoutText: 'Sending your feedback timed out. Please try again.',
	errorForbiddenText: 'Feedback could not be accepted from this site. Please try again later.',
	errorGenericText: 'Your feedback could not be sent. Please try again.'
};

/** Sentry's form host element (`FeedbackGeneralConfiguration.id` default). */
const FORM_HOST_ID = 'sentry-feedback';

function readDsn() {
	return browser ? resolveFeedbackDsn(env) : null;
}

/**
 * Return focus to the control that opened the form, if it is still on screen
 * (a closed mobile menu hides it).
 * @param {HTMLElement | null | undefined} trigger
 */
function restoreFocus(trigger) {
	if (trigger?.isConnected && trigger.getClientRects().length > 0) trigger.focus();
}

function createFeedback() {
	let status = $state(/** @type {FeedbackStatus} */ ('idle'));

	/** @type {Promise<FeedbackIntegration> | null} */
	let integration = null;
	/** Page context for the form currently open; read by the send hook.
	 * @type {import('./feedback-context.js').FeedbackContext | null} */
	let context = null;
	/** Closes the open form, if any.
	 * @type {(() => void) | null} */
	let closeForm = null;

	/**
	 * Keep typing in the form away from the app's keyboard shortcuts. The form
	 * lives in a shadow root, so its key events reach window listeners
	 * retargeted to the host element, where the shortcuts' "ignore inputs and
	 * textareas" checks can't see the field (typing "g" would toggle the
	 * fullscreen nav menu). The form (a non-modal `<dialog open>`) has no key
	 * handling of its own beyond its fields, so stopping events at the host
	 * costs it nothing; Escape closes it here instead.
	 * @param {Event} event
	 */
	function handleFormKey(event) {
		event.stopPropagation();
		if (event instanceof KeyboardEvent && event.type === 'keydown' && event.key === 'Escape') {
			closeForm?.();
		}
	}

	/** Re-adding the same listener is a no-op, so this is safe on every open. */
	function containFormKeys() {
		const host = document.getElementById(FORM_HOST_ID);
		for (const type of ['keydown', 'keyup', 'keypress']) {
			host?.addEventListener(type, handleFormKey);
		}
	}

	/** @param {string} dsn */
	function load(dsn) {
		integration ??= import('@sentry/browser')
			.then((Sentry) => {
				Sentry.init({
					dsn,
					release: `openelectricity@${version}`,
					environment: feedbackEnvironment(window.location.hostname),
					defaultIntegrations: false,
					integrations: [Sentry.feedbackIntegration(FORM_OPTIONS)],
					// Collect nothing about the reader beyond what they type.
					dataCollection: {
						userInfo: false,
						cookies: false,
						httpHeaders: false,
						httpBodies: [],
						urlQueryParams: false
					},
					sendClientReports: false
				});
				Sentry.getClient()?.on('beforeSendFeedback', (event) =>
					applyFeedbackContext(event, context)
				);
				const loaded = Sentry.getFeedback();
				if (!loaded) throw new Error('Sentry feedback integration is unavailable.');
				return loaded;
			})
			.catch((err) => {
				// Let the next click try again rather than caching the failure.
				integration = null;
				throw err;
			});
		return integration;
	}

	/**
	 * Open the form. Repeat clicks while it loads or is open are ignored; a
	 * failure to load leaves `status` as 'error' so controls can offer a retry.
	 * Failures to send are shown and retried inside the form itself.
	 * @param {HTMLElement | null} [trigger] - Focused again when the form closes
	 */
	async function open(trigger) {
		if (status === 'loading' || status === 'open') return;
		const dsn = readDsn();
		if (!dsn) return;

		status = 'loading';
		try {
			const feedback = await load(dsn);
			context = buildFeedbackContext(window.location.href);
			/** @type {FeedbackForm | undefined} */
			let form;
			const close = () => {
				form?.removeFromDom();
				closeForm = null;
				status = 'idle';
				restoreFocus(trigger);
			};
			form = await feedback.createForm({ onFormClose: close, onFormSubmitted: close });
			containFormKeys();
			closeForm = close;
			form.appendToDom();
			form.open();
			status = 'open';
		} catch (err) {
			console.error('Could not open the feedback form:', err);
			status = 'error';
		}
	}

	return {
		/** Whether feedback is configured for this site. Browser-only. */
		get configured() {
			return readDsn() !== null;
		},
		get status() {
			return status;
		},
		/** Label for "Feedback" controls, reflecting load state. */
		get label() {
			if (status === 'loading') return 'Opening feedback…';
			if (status === 'error') return 'Feedback failed to load. Try again';
			return 'Feedback';
		},
		open
	};
}

export const feedback = createFeedback();
