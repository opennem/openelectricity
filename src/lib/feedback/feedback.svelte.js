import { tick } from 'svelte';
import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import { loadSentry } from '$lib/sentry/client.js';
import { showToast } from '$lib/stores/toast';
import {
	applyFeedbackContext,
	buildFeedbackContext,
	resolveFeedbackDsn
} from './feedback-context.js';

/**
 * Sentry user feedback, opened from the app's own "Feedback" controls.
 *
 * Uses the page's shared Sentry client (`$lib/sentry/client.js`, started when
 * the page is idle, or at once if feedback is opened first) and adds the
 * feedback integration on first open. A recorded or buffered session replay
 * is attached to each submission.
 *
 * Off unless `PUBLIC_SENTRY_DSN` and `PUBLIC_FEEDBACK_ENABLED=true` are set.
 * Read in the browser only: `$env/dynamic/public` can't be read while
 * prerendering, and the entry points render after mount anyway.
 */

/** @typedef {'idle' | 'loading' | 'open' | 'error'} FeedbackStatus */
/** @typedef {NonNullable<ReturnType<typeof import('$lib/sentry/feedback-sdk.js').getFeedback>>} FeedbackIntegration */
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
	// Colours, borders, radii and type come from OE tokens on `#sentry-feedback`
	// in app.css.
	formTitle: 'Your feedback',
	messageLabel: 'What could we improve?',
	messagePlaceholder: 'Tell us what you were looking at and what you expected to see.',
	nameLabel: 'Name',
	namePlaceholder: 'Your name',
	emailLabel: 'Email',
	emailPlaceholder: 'Your email, if you would like a reply',
	isRequiredLabel: '(required)',
	submitButtonLabel: 'Send',
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

/** Just past the SDK's own 30s send timeout: a send that never reports back
 * (a failed screenshot export reports nothing) is treated as failed. */
const BACKGROUND_SEND_LIMIT_MS = 35_000;

/** Sentry's form host element (`FeedbackGeneralConfiguration.id` default). */
const FORM_HOST_ID = 'sentry-feedback';

/** Lucide's `send` icon, drawn as a mask in the button's text colour. */
const SEND_ICON = encodeURIComponent(
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/></svg>'
);

/** What the theme variables can't reach: Cancel and Send on one row at half
 * the width each, Send on the right (Sentry renders Send first, so `order`
 * moves it last) with a send icon, in Space Grotesk like the site's form
 * controls; and focus shown on the field's own
 * border, as form-elements/TextInput does, rather than an outline that
 * doubles it. Adopted by the form's shadow root (`addFormLayout`), so it
 * cascades after every `<style>` Sentry adds there, whenever it adds them. */
const FORM_LAYOUT_CSS = `
.btn { font-family: 'Space Grotesk', sans-serif; }
.btn-group { grid-template-columns: 1fr 1fr; }
.btn--primary {
	order: 1;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
}
.btn--primary::before {
	content: '';
	width: 16px;
	height: 16px;
	flex-shrink: 0;
	background-color: currentColor;
	mask: url("data:image/svg+xml,${SEND_ICON}") center / contain no-repeat;
}
.form__input:focus-visible { outline: none; border-color: #353535; }

/* Open beside the control that opened it (data-origin, set on open): top
   right sliding down from the nav's icon, bottom right (Sentry's default
   place) sliding up from the floating one. Phones and the screenshot editor
   keep Sentry's full-screen layout. */
@media (min-width: 601px) {
	:host([data-origin='top']) .dialog__position:not(:has(.editor)) { inset: 0 0 auto auto; }
}
:host([data-origin='top']) .dialog[open] .dialog__content {
	animation: oe-feedback-down 0.25s ease-out;
}
:host([data-origin='bottom']) .dialog[open] .dialog__content {
	animation: oe-feedback-up 0.25s ease-out;
}
@keyframes oe-feedback-down { from { transform: translateY(-24px); opacity: 0; } }
@keyframes oe-feedback-up { from { transform: translateY(24px); opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
	.dialog .dialog__content { animation: none; }
}
`;
/** Built once, on first open (`CSSStyleSheet` is browser-only). */
/** @type {CSSStyleSheet | null} */
let formLayoutSheet = null;

function readDsn() {
	return browser ? resolveFeedbackDsn(env) : null;
}

/**
 * Return focus to the control that opened the form, if it is still on screen
 * (a closed mobile menu hides it). Waits for the DOM to catch up with the
 * closed form first: a control can be inert while the form is open (the
 * floating button) and can't take focus until that clears.
 * @param {HTMLElement | null | undefined} trigger
 */
async function restoreFocus(trigger) {
	await tick();
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

	/**
	 * Add the layout overrides inside the form's (open) shadow root, after
	 * Sentry's own styles so they win. Once per root.
	 */
	function addFormLayout() {
		const root = document.getElementById(FORM_HOST_ID)?.shadowRoot;
		if (!root) return;
		if (!formLayoutSheet) {
			formLayoutSheet = new CSSStyleSheet();
			formLayoutSheet.replaceSync(FORM_LAYOUT_CSS);
		}
		if (!root.adoptedStyleSheets.includes(formLayoutSheet)) {
			root.adoptedStyleSheets = [...root.adoptedStyleSheets, formLayoutSheet];
		}
	}

	/**
	 * Which way the form opens: from the top when its control is in the upper
	 * half of the viewport (the nav), otherwise from the bottom (the floating
	 * button). Read by the form stylesheet's `:host([data-origin])` rules.
	 * @param {HTMLElement | null | undefined} trigger
	 */
	function setOrigin(trigger) {
		const host = document.getElementById(FORM_HOST_ID);
		if (!host) return;
		const fromTop = !!trigger && trigger.getBoundingClientRect().top < window.innerHeight / 2;
		host.dataset.origin = fromTop ? 'top' : 'bottom';
	}

	/** Re-adding the same listener is a no-op, so this is safe on every open. */
	function containFormKeys() {
		const host = document.getElementById(FORM_HOST_ID);
		for (const type of ['keydown', 'keyup', 'keypress']) {
			host?.addEventListener(type, handleFormKey);
		}
	}

	/** Add the feedback integration to the shared client, once. */
	function load() {
		integration ??= Promise.all([loadSentry(), import('$lib/sentry/feedback-sdk.js')])
			.then(([Sentry, { feedbackIntegration, getFeedback }]) => {
				if (!Sentry) throw new Error('Sentry is not available.');
				Sentry.addIntegration(feedbackIntegration(FORM_OPTIONS));
				Sentry.getClient()?.on('beforeSendFeedback', (event) =>
					applyFeedbackContext(event, context)
				);
				const loaded = getFeedback();
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
			const feedback = await load();
			context = buildFeedbackContext(window.location.href);
			/** @type {FeedbackForm | undefined} */
			let form;
			/** The form's own container in Sentry's shadow root (typed `unknown`).
			 * @type {HTMLElement | undefined} */
			let container;
			/** @type {ReturnType<typeof setTimeout> | undefined} */
			let sendLimit;
			const pageOverflow = document.body.style.overflow;
			/** Give the page back: unlock scrolling and return focus. */
			const release = () => {
				closeForm = null;
				status = 'idle';
				document.body.style.overflow = pageOverflow;
				restoreFocus(trigger);
			};
			// Cancel, Escape or the backdrop.
			const close = () => {
				form?.removeFromDom();
				release();
			};
			/** The background send has finished; on failure, say so in a toast. */
			const settle = (/** @type {Error | null} */ error) => {
				clearTimeout(sendLimit);
				form?.removeFromDom();
				if (error) showToast(error.message || FORM_OPTIONS.errorGenericText);
			};
			/**
			 * Send closes the form at once and the send finishes in the background;
			 * only a failure is reported. The form is hidden, not removed, until
			 * the send settles: Sentry is still exporting the screenshot from it. A
			 * blank message stays open so Sentry can show its required-field error.
			 * @param {Event} event
			 */
			const sendInBackground = (event) => {
				const target = event.target;
				if (!container || !(target instanceof HTMLFormElement)) return;
				if (!String(new FormData(target).get('message') ?? '').trim()) return;
				container.style.visibility = 'hidden';
				container.style.pointerEvents = 'none';
				release();
				sendLimit = setTimeout(
					() => settle(new Error(FORM_OPTIONS.errorGenericText)),
					BACKGROUND_SEND_LIMIT_MS
				);
			};
			form = await feedback.createForm({
				onFormClose: close,
				onSubmitSuccess: () => settle(null),
				onSubmitError: (error) => settle(error)
			});
			container = /** @type {HTMLElement} */ (form.el);
			container.addEventListener('submit', sendInBackground, { capture: true });
			containFormKeys();
			closeForm = close;
			form.appendToDom();
			addFormLayout();
			setOrigin(trigger);
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
